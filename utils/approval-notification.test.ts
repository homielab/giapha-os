import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test'

import { defaultLocale } from '@/lib/i18n/messages'

import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from './testing/fakeSupabase'

type Responder = (call: FakeCall) => FakeResult

let respond: Responder = () => ({})
let calls: FakeCall[] = []
let adminEmailsById: Record<string, string | null> = {}
let adminClientThrows = false

mock.module('@/utils/supabase/admin', () => ({
  getAdminSupabase: () => {
    if (adminClientThrows) throw new Error('no service key')
    const fake = fakeSupabase((call) => respond(call))
    calls = fake.calls
    return {
      from: (table: string) => fake.client.from(table),
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: { user: { email: adminEmailsById[id] } }
          })
        }
      }
    }
  }
}))

const { notifyAdminIfPending, notifyAdminOfPendingUser } =
  await import('./approval-notification')

const ENV_KEYS = [
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'APP_URL',
  'ADMIN_NOTIFICATION_EMAIL'
] as const
const savedEnv: Record<string, string | undefined> = {}
const realFetch = globalThis.fetch

let sent: { url: string; body: Record<string, unknown> }[] = []
let fetchStatus = 200
let warn: ReturnType<typeof spyOn>
let error: ReturnType<typeof spyOn>

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key]
  process.env.RESEND_API_KEY = 'key'
  process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
  process.env.APP_URL = 'https://tree.example.com/some/path'
  delete process.env.ADMIN_NOTIFICATION_EMAIL

  adminEmailsById = { a1: 'one@example.com', a2: 'two@example.com' }
  adminClientThrows = false
  sent = []
  fetchStatus = 200
  respond = (call) => {
    if (call.table === 'profiles') return { data: [{ id: 'a1' }, { id: 'a2' }] }
    if (call.table === 'user_approval_requests' && call.op === 'select')
      return { data: null }
    if (call.table === 'user_approval_requests' && call.op === 'upsert')
      return { data: { id: 'req1' } }
    return {}
  }
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    sent.push({ url, body: JSON.parse(init.body) })
    return new Response('rejected', { status: fetchStatus })
  }) as unknown as typeof fetch
  warn = spyOn(console, 'warn').mockImplementation(() => {})
  error = spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
  globalThis.fetch = realFetch
  warn.mockRestore()
  error.mockRestore()
})

const user = { id: 'u1', email: 'new@example.com' }

describe('notifyAdminOfPendingUser configuration', () => {
  test('does nothing without Resend settings or a trusted APP_URL', async () => {
    for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'APP_URL']) {
      const original = process.env[key]
      delete process.env[key]
      expect(await notifyAdminOfPendingUser(user)).toEqual({
        sent: false,
        configured: false,
        reason: 'missing_configuration'
      })
      process.env[key] = original
    }
    expect(sent).toHaveLength(0)
  })

  test('rejects an APP_URL that is not http(s)', async () => {
    process.env.APP_URL = 'javascript:alert(1)'
    const result = await notifyAdminOfPendingUser(user)
    expect(result.reason).toBe('missing_configuration')
    process.env.APP_URL = 'not a url'
    expect((await notifyAdminOfPendingUser(user)).reason).toBe(
      'missing_configuration'
    )
  })

  test('reports a missing service role key', async () => {
    adminClientThrows = true
    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: false,
      reason: 'missing_service_key'
    })
  })
})

describe('notifyAdminOfPendingUser recipients', () => {
  test('ADMIN_NOTIFICATION_EMAIL wins and skips the admin lookup', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL =
      ' boss@example.com, ,cto@example.com '
    const result = await notifyAdminOfPendingUser(user)
    expect(result).toEqual({ sent: true, configured: true })
    expect(sent[0].body.to).toEqual(['boss@example.com', 'cto@example.com'])
    expect(calls.some((c) => c.table === 'profiles' && !c.single)).toBe(false)
  })

  test('otherwise mails the active admins that have an email', async () => {
    adminEmailsById = { a1: 'one@example.com', a2: null }
    await notifyAdminOfPendingUser(user)
    expect(sent[0].body.to).toEqual(['one@example.com'])
    const profiles = calls.find((c) => c.table === 'profiles' && !c.single)
    expect(profiles?.filters).toEqual([
      ['eq', 'role', 'admin'],
      ['eq', 'is_active', true]
    ])
  })

  test('reports when there is nobody to notify', async () => {
    adminEmailsById = { a1: null, a2: null }
    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: false,
      reason: 'missing_admin_email'
    })
    respond = (call) =>
      call.table === 'profiles' && !call.single
        ? { error: { message: 'rls' } }
        : {}
    expect((await notifyAdminOfPendingUser(user)).reason).toBe(
      'missing_admin_email'
    )
    expect(sent).toHaveLength(0)
  })
})

describe('notifyAdminOfPendingUser locked accounts', () => {
  // The lock-state read is the single-row profiles query; the admin list is
  // the other one.
  function withLockState(result: FakeResult) {
    const base = respond
    respond = (call) =>
      call.table === 'profiles' && call.single ? result : base(call)
  }

  test('a locked account signing in again opens no request and sends no email', async () => {
    withLockState({ data: { locked_at: '2026-10-31T00:00:00Z' } })

    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: true,
      reason: 'locked'
    })
    expect(
      await notifyAdminIfPending(user, { role: 'member', is_active: false })
    ).toEqual({ sent: false, configured: true, reason: 'locked' })

    const lockRead = calls.find((c) => c.table === 'profiles' && c.single)
    expect(lockRead?.filters).toEqual([['eq', 'id', 'u1']])
    expect(calls.some((c) => c.table === 'user_approval_requests')).toBe(false)
    expect(sent).toHaveLength(0)
  })

  test('the revoked request of a locked account is not replaced by a new one', async () => {
    // Locking marked the open request as used; before, a used request meant
    // "mail again".
    withLockState({ data: { locked_at: '2026-10-31T00:00:00Z' } })
    const base = respond
    respond = (call) =>
      call.table === 'user_approval_requests' && call.op === 'select'
        ? {
            data: {
              id: 'req1',
              used_at: '2026-10-31T00:00:00Z',
              expires_at: new Date(Date.now() + 86_400_000).toISOString()
            }
          }
        : base(call)

    expect((await notifyAdminOfPendingUser(user)).reason).toBe('locked')
    expect(calls.some((c) => c.op === 'upsert')).toBe(false)
    expect(sent).toHaveLength(0)
  })

  test('an unlocked account waiting for approval is mailed', async () => {
    withLockState({ data: { locked_at: null } })

    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: true,
      configured: true
    })
  })

  test('a database without the locked_at column mails as before', async () => {
    withLockState({
      error: {
        message: 'column profiles.locked_at does not exist',
        code: '42703'
      }
    })

    expect((await notifyAdminOfPendingUser(user)).sent).toBe(true)
  })

  test('a failed lock-state read sends nothing', async () => {
    withLockState({ error: { message: 'network down' } })

    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: true,
      reason: 'database_lookup_failed'
    })
    expect(sent).toHaveLength(0)
  })
})

describe('notifyAdminOfPendingUser request handling', () => {
  test('does not mail again while an unused request has not expired', async () => {
    respond = (call) => {
      if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
      return {
        data: {
          id: 'old',
          used_at: null,
          expires_at: new Date(Date.now() + 3600_000).toISOString()
        }
      }
    }
    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: true,
      reason: 'already_notified'
    })
    expect(sent).toHaveLength(0)
  })

  test('mails again when the earlier request was used or expired', async () => {
    for (const existing of [
      { id: 'old', used_at: '2026-01-01', expires_at: '2999-01-01' },
      { id: 'old', used_at: null, expires_at: '2020-01-01' }
    ]) {
      sent = []
      respond = (call) => {
        if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
        if (call.op === 'select') return { data: existing }
        return { data: { id: 'req1' } }
      }
      expect((await notifyAdminOfPendingUser(user)).sent).toBe(true)
      expect(sent).toHaveLength(1)
    }
  })

  test('reports lookup and insert failures without sending', async () => {
    respond = (call) => {
      if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
      if (call.op === 'select') return { error: { message: 'down' } }
      return {}
    }
    expect((await notifyAdminOfPendingUser(user)).reason).toBe(
      'database_lookup_failed'
    )

    respond = (call) => {
      if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
      if (call.op === 'upsert') return { error: { message: 'down' } }
      return {}
    }
    expect((await notifyAdminOfPendingUser(user)).reason).toBe(
      'database_insert_failed'
    )
    expect(sent).toHaveLength(0)
  })

  test('stores only the hash of the token and links the raw token in the email', async () => {
    await notifyAdminOfPendingUser(user)
    const upsert = calls.find((c) => c.op === 'upsert')
    const row = upsert?.payload as Record<string, unknown>
    expect(row.user_id).toBe('u1')
    expect(row.email).toBe('new@example.com')
    expect(row.used_at).toBeNull()
    const text = String(sent[0].body.text)
    const token = text.match(/\/api\/admin\/approve\/([\w-]+)/)?.[1]
    expect(token).toBeDefined()
    expect(row.token_hash).not.toBe(token)
    expect(String(row.token_hash)).toMatch(/^[0-9a-f]{64}$/)
    // The URL uses the origin of APP_URL only, not its path.
    expect(text).toContain('https://tree.example.com/api/admin/approve/')
    expect(sent[0].url).toBe('https://api.resend.com/emails')
  })

  test('links https:// when APP_URL is a bare host', async () => {
    process.env.APP_URL = 'tree.example.com'
    await notifyAdminOfPendingUser(user)
    expect(String(sent[0].body.text)).toContain(
      'https://tree.example.com/api/admin/approve/'
    )
  })

  test('marks the request as notified after sending', async () => {
    await notifyAdminOfPendingUser(user)
    const update = calls.find((c) => c.op === 'update')
    expect(update?.filters).toEqual([['eq', 'id', 'req1']])
    expect(
      (update?.payload as { notified_at: string }).notified_at
    ).toBeString()
  })

  test('deletes the request when Resend refuses the email', async () => {
    fetchStatus = 422
    expect(await notifyAdminOfPendingUser(user)).toEqual({
      sent: false,
      configured: true,
      reason: 'email_send_failed'
    })
    const del = calls.find((c) => c.op === 'delete')
    expect(del?.table).toBe('user_approval_requests')
    expect(del?.filters).toEqual([['eq', 'id', 'req1']])
    expect(calls.some((c) => c.op === 'update')).toBe(false)
  })

  test('still reports success when marking as notified fails', async () => {
    const base = respond
    respond = (call) =>
      call.op === 'update' ? { error: { message: 'down' } } : base(call)
    expect((await notifyAdminOfPendingUser(user)).sent).toBe(true)
  })
})

describe('notifyAdminOfPendingUser content', () => {
  test('is always in the default language of the app', async () => {
    // The recipient is an administrator, so the sign-up's language does not
    // matter: no locale is taken from the caller.
    await notifyAdminOfPendingUser(user)
    expect(defaultLocale).toBe('vi')
    expect(sent[0].body.subject).toBe(
      'Có tài khoản mới đang chờ duyệt: new@example.com'
    )
    expect(String(sent[0].body.html)).toContain('Xem và duyệt tài khoản')
    expect(String(sent[0].body.text)).toContain('new@example.com')
  })

  test('escapes the email address in the HTML body', async () => {
    await notifyAdminOfPendingUser({
      id: 'u1',
      email: '"><script>x</script>@example.com'
    })
    const html = String(sent[0].body.html)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('notifyAdminIfPending', () => {
  const pending = { role: 'member', is_active: false }

  test('mails once for a member waiting for approval, not on later sign-ins', async () => {
    // A database that remembers the approval request created by the first call.
    let stored: Record<string, unknown> | null = null
    respond = (call) => {
      if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
      if (call.op === 'select' && !stored) return { data: null }
      if (call.op === 'select') return { data: stored }
      if (call.op === 'upsert') {
        stored = { ...(call.payload as object), id: 'req1' }
        return { data: { id: 'req1' } }
      }
      return { data: [{ id: 'req1' }] }
    }
    expect(await notifyAdminIfPending(user, pending)).toEqual({
      sent: true,
      configured: true
    })
    expect(await notifyAdminIfPending(user, pending)).toEqual({
      sent: false,
      configured: true,
      reason: 'already_notified'
    })
    expect(sent).toHaveLength(1)
    expect(sent[0].body.to).toEqual(['one@example.com'])
  })

  test('does nothing for admins, active accounts or a missing profile or email', async () => {
    for (const [who, profile] of [
      [user, { role: 'admin', is_active: false }],
      [user, { role: 'admin', is_active: true }],
      [user, { role: 'member', is_active: true }],
      [user, { role: 'editor', is_active: false }],
      [user, null],
      [{ id: 'u1', email: null }, pending],
      [null, pending]
    ] as const) {
      calls = []
      expect(await notifyAdminIfPending(who, profile)).toEqual({
        sent: false,
        configured: true,
        reason: 'not_pending'
      })
      expect(calls).toHaveLength(0)
    }
    expect(sent).toHaveLength(0)
  })
})
