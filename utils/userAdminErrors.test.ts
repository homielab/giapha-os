import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test'

import {
  getMessages,
  type TranslationKey,
  type TranslationValues
} from '@/lib/i18n/messages'

import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from './testing/fakeSupabase'
import { knownUserAdminErrorKey, userAdminErrorKey } from './userAdminErrors'

const vi = getMessages('vi')

describe('userAdminErrorKey', () => {
  test.each([
    ['Access denied.', 'userAdminAccessDenied'],
    ['Cannot change your own role.', 'userAdminOwnRole'],
    ['Cannot remove the last active administrator.', 'userAdminLastAdminRole'],
    ['Cannot delete yourself.', 'userAdminDeleteSelf'],
    [
      'Cannot delete the last active administrator.',
      'userAdminLastAdminDelete'
    ],
    ['Invalid email.', 'userAdminInvalidEmail'],
    ['Password must be at least 8 characters.', 'userAdminPasswordTooShort'],
    ['Cannot change your own active status.', 'userAdminOwnStatus'],
    [
      'Cannot deactivate the last active administrator.',
      'userAdminLastAdminDeactivate'
    ]
  ] as const)('maps "%s" to %s', (message, key) => {
    expect(userAdminErrorKey('role', { code: 'P0001', message })).toBe(key)
    expect(vi[key]).not.toContain(message)
  })

  test('maps error codes for missing privileges and taken emails', () => {
    expect(
      userAdminErrorKey('status', {
        code: '42501',
        message: 'permission denied for function set_user_active_status'
      })
    ).toBe('userAdminAccessDenied')
    expect(
      userAdminErrorKey('create', {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      })
    ).toBe('userAdminEmailTaken')
  })

  test('falls back to the generic message of each action', () => {
    const error = { code: 'XX000', message: 'connection reset' }
    expect(knownUserAdminErrorKey(error)).toBeNull()
    expect(userAdminErrorKey('role', error)).toBe('adminUnknownRoleError')
    expect(userAdminErrorKey('status', error)).toBe('adminUnknownStatusError')
    expect(userAdminErrorKey('delete', error)).toBe('adminUnknownDeleteError')
    expect(userAdminErrorKey('create', error)).toBe('adminUnknownCreateError')
    expect(userAdminErrorKey('create', {})).toBe('adminUnknownCreateError')
  })
})

// Server actions in app/actions/user.ts, with Supabase, translations and the
// Next.js cache replaced.
let isAdmin = false
let rpcResult: { error: { code?: string; message: string } | null } = {
  error: null
}
const rpc = mock((fn: string, args: Record<string, unknown>) => {
  void fn
  void args
  return Promise.resolve(rpcResult)
})
const revalidatePath = mock((path: string) => {
  void path
})

// The signed-in account seen by notifyAdminIfAccountPending.
let currentUser: { id: string; email: string } | null = null
let currentProfile: { role: string; is_active: boolean } | null = null

mock.module('@/utils/supabase/queries', () => ({
  getIsAdmin: async () => isAdmin,
  getUser: async () => currentUser,
  getProfile: async () => currentProfile,
  getPersonById: async () => ({ person: null, error: null }),
  getSupabase: async () => ({ rpc })
}))

// The service-role client of the approval email: one administrator and a
// user_approval_requests table that keeps the request of the first email.
let approvalRequest: Record<string, unknown> | null = null
const adminRespond = (call: FakeCall): FakeResult => {
  if (call.table === 'profiles') return { data: [{ id: 'a1' }] }
  if (call.op === 'select') return { data: approvalRequest }
  if (call.op === 'upsert') {
    approvalRequest = { ...(call.payload as object), id: 'req1' }
    return { data: { id: 'req1' } }
  }
  return { data: [{ id: 'req1' }] }
}
mock.module('@/utils/supabase/admin', () => ({
  getAdminSupabase: () => ({
    from: (table: string) => fakeSupabase(adminRespond).client.from(table),
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: { email: 'a@x.com' } } })
      }
    }
  })
}))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'vi',
    dictionary: vi,
    t: (key: TranslationKey, values?: TranslationValues) => {
      void values
      return vi[key]
    }
  })
}))
mock.module('next/cache', () => ({ revalidatePath }))

const {
  adminCreateUser,
  changeUserRole,
  deleteUser,
  notifyAdminIfAccountPending,
  toggleUserStatus
} = await import('@/app/actions/user')

function createForm() {
  const form = new FormData()
  form.set('email', 'new@example.com')
  form.set('password', 'secret-password')
  form.set('role', 'member')
  return form
}

const actions = {
  changeUserRole: () => changeUserRole('user-1', 'editor'),
  deleteUser: () => deleteUser('user-1'),
  toggleUserStatus: () => toggleUserStatus('user-1', false),
  adminCreateUser: () => adminCreateUser(createForm())
}

describe('user management actions', () => {
  beforeEach(() => {
    isAdmin = false
    rpcResult = { error: null }
    rpc.mockClear()
    revalidatePath.mockClear()
  })

  test.each(Object.entries(actions))(
    '%s refuses a non-admin without calling the database',
    async (_name, run) => {
      expect(await run()).toEqual({ error: vi.userAdminAccessDenied })
      expect(rpc).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    }
  )

  test.each(Object.entries(actions))(
    '%s runs for an admin',
    async (_name, run) => {
      isAdmin = true
      expect(await run()).toEqual({ success: true })
      expect(rpc).toHaveBeenCalledTimes(1)
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/users')
    }
  )

  test('adminCreateUser refuses a password under 8 characters before the database', async () => {
    isAdmin = true
    const short = createForm()
    short.set('password', '1234567')
    expect(await adminCreateUser(short)).toEqual({
      error: vi.userAdminPasswordTooShort
    })
    expect(rpc).not.toHaveBeenCalled()

    const exact = createForm()
    exact.set('password', '12345678')
    expect(await adminCreateUser(exact)).toEqual({ success: true })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  test('passes the arguments to the database functions', async () => {
    isAdmin = true
    await changeUserRole('user-1', 'editor')
    expect(rpc).toHaveBeenLastCalledWith('set_user_role', {
      target_user_id: 'user-1',
      new_role: 'editor'
    })
    await adminCreateUser(createForm())
    expect(rpc).toHaveBeenLastCalledWith('admin_create_user', {
      new_email: 'new@example.com',
      new_password: 'secret-password',
      new_role: 'member',
      new_active: true
    })
  })

  test('translates the last admin error instead of showing it raw', async () => {
    isAdmin = true
    rpcResult = {
      error: {
        code: 'P0001',
        message: 'Cannot remove the last active administrator.'
      }
    }
    expect(await changeUserRole('admin-1', 'member')).toEqual({
      error: vi.userAdminLastAdminRole
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('shows the generic message and logs an unknown error', async () => {
    isAdmin = true
    rpcResult = { error: { code: 'XX000', message: 'connection reset' } }
    const originalError = console.error
    const logged = mock((...args: unknown[]) => {
      void args
    })
    console.error = logged
    try {
      expect(await deleteUser('user-1')).toEqual({
        error: vi.adminUnknownDeleteError
      })
    } finally {
      console.error = originalError
    }
    expect(logged).toHaveBeenCalledTimes(1)
  })
})

describe('notifyAdminIfAccountPending', () => {
  const ENV = {
    RESEND_API_KEY: 'key',
    RESEND_FROM_EMAIL: 'noreply@example.com',
    APP_URL: 'https://tree.example.com',
    ADMIN_NOTIFICATION_EMAIL: undefined
  }
  const savedEnv: Record<string, string | undefined> = {}
  const realFetch = globalThis.fetch
  let emails: { to: unknown; subject: unknown }[] = []
  let consoleError: ReturnType<typeof spyOn>

  beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) {
      savedEnv[key] = process.env[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    approvalRequest = null
    emails = []
    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      emails.push(JSON.parse(init.body))
      return new Response('{}')
    }) as unknown as typeof fetch
    currentUser = { id: 'u1', email: 'new@example.com' }
    currentProfile = { role: 'member', is_active: false }
    consoleError = spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    for (const key of Object.keys(ENV)) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
    globalThis.fetch = realFetch
    currentUser = null
    currentProfile = null
    consoleError.mockRestore()
  })

  test('mails the administrators once for a member waiting for approval', async () => {
    await notifyAdminIfAccountPending()
    expect(emails).toHaveLength(1)
    expect(emails[0].to).toEqual(['a@x.com'])
    expect(emails[0].subject).toBe(
      'Có tài khoản mới đang chờ duyệt: new@example.com'
    )
    // Signing in again while the request is open sends nothing new.
    await notifyAdminIfAccountPending()
    expect(emails).toHaveLength(1)
    expect(approvalRequest?.user_id).toBe('u1')
  })

  test('sends nothing for admins, active accounts or without a session', async () => {
    for (const [user, profile] of [
      [currentUser, { role: 'admin', is_active: true }],
      [currentUser, { role: 'admin', is_active: false }],
      [currentUser, { role: 'member', is_active: true }],
      [null, null]
    ] as const) {
      currentUser = user
      currentProfile = profile
      await notifyAdminIfAccountPending()
    }
    expect(emails).toHaveLength(0)
    expect(approvalRequest).toBeNull()
  })

  test('never throws, so a failure cannot block the sign-in', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await notifyAdminIfAccountPending()).toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })
})
