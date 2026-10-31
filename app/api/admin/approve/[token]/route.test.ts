import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test'

import config from '@/app/config'
import { createApprovalToken, hashApprovalToken } from '@/utils/approval'
import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from '@/utils/testing/fakeSupabase'

// A tiny in-memory stand-in for the two tables the approval route touches,
// applying the same filters PostgREST would. POST goes through the
// approve_user_request function (migration 20261031180000); rpcApprove
// follows its SQL step by step. The real locking against a concurrent
// set_user_active_status lives in Postgres and was checked there.
interface ApprovalRow {
  id: string
  user_id: string
  email: string
  token_hash: string
  expires_at: string
  used_at: string | null
}

interface ProfileRow {
  id: string
  is_active: boolean
  locked_at?: string | null
}

let approvalRow: ApprovalRow | null
let profile: ProfileRow | null
let activations = 0
let rpcResult: FakeResult | null = null
let calls: FakeCall[] = []

function filterValue(call: FakeCall, kind: string, column: string) {
  return call.filters.find(([k, c]) => k === kind && c === column)?.[2]
}

// What set_user_active_status(user, false) does.
function lockUser() {
  if (profile) {
    profile.is_active = false
    profile.locked_at ??= new Date().toISOString()
  }
  if (approvalRow && !approvalRow.used_at) {
    approvalRow.used_at = new Date().toISOString()
  }
}

function rpcApprove(tokenHash: string): FakeResult {
  const request = approvalRow
  if (!request || request.token_hash !== tokenHash) {
    return { data: { status: 'invalid', email: null } }
  }
  const { email } = request
  if (request.used_at) {
    const status = profile && !profile.is_active ? 'revoked' : 'processed'
    return { data: { status, email } }
  }
  if (new Date(request.expires_at).getTime() <= Date.now()) {
    return { data: { status: 'expired', email } }
  }
  if (!profile) return { data: { status: 'not_found', email } }
  request.used_at = new Date().toISOString()
  if (profile.locked_at) return { data: { status: 'revoked', email } }
  if (!profile.is_active) {
    profile.is_active = true
    activations += 1
  }
  return { data: { status: 'approved', email } }
}

function respond(call: FakeCall): FakeResult {
  calls.push(call)
  if (call.table === 'rpc:approve_user_request') {
    if (rpcResult) return rpcResult
    return rpcApprove((call.payload as { p_token_hash: string }).p_token_hash)
  }

  if (call.table === 'user_approval_requests' && call.op === 'select') {
    const matches =
      approvalRow &&
      filterValue(call, 'eq', 'token_hash') === approvalRow.token_hash
    return { data: matches ? { ...approvalRow } : null }
  }

  if (call.table === 'profiles' && call.op === 'select') {
    const row =
      profile && filterValue(call, 'eq', 'id') === profile.id ? profile : null
    return { data: row ? { is_active: row.is_active } : null }
  }

  throw new Error(`Unexpected call ${call.op} ${call.table}`)
}

mock.module('@/utils/supabase/admin', () => ({
  getAdminSupabase: () => fakeSupabase(respond).client
}))

const { GET, POST } = await import('./route')

const token = createApprovalToken()

function post() {
  return POST(
    new Request(`https://tree.example.com/api/admin/approve/${token}`, {
      method: 'POST'
    }),
    { params: Promise.resolve({ token }) }
  )
}

function get(cookie?: string) {
  return GET(
    new Request(`https://tree.example.com/api/admin/approve/${token}`, {
      headers: cookie ? { cookie } : {}
    }),
    { params: Promise.resolve({ token }) }
  )
}

function postWithCookie(cookie: string) {
  return POST(
    new Request(`https://tree.example.com/api/admin/approve/${token}`, {
      method: 'POST',
      headers: { cookie }
    }),
    { params: Promise.resolve({ token }) }
  )
}

async function title(response: Response) {
  return (await response.text()).match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1]
}

let consoleError: ReturnType<typeof spyOn>

beforeEach(() => {
  approvalRow = {
    id: 'req1',
    user_id: 'u1',
    email: 'new@example.com',
    token_hash: hashApprovalToken(token),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    used_at: null
  }
  profile = { id: 'u1', is_active: false, locked_at: null }
  activations = 0
  rpcResult = null
  calls = []
  consoleError = spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
})

describe('POST /api/admin/approve/[token]', () => {
  test('the page title uses the configured site name', async () => {
    const siteName = config.siteName
    config.siteName = 'Họ Nguyễn <Hà Nội>'
    try {
      const html = await (await post()).text()
      expect(html).toContain('<title>Họ Nguyễn &lt;Hà Nội&gt; - ')
      expect(html).not.toContain('Gia Phả OS')
    } finally {
      config.siteName = siteName
    }
  })

  test('approves through one database call with the token hash only', async () => {
    const response = await post()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Duyệt thành công')
    expect(profile?.is_active).toBe(true)
    expect(activations).toBe(1)
    expect(approvalRow?.used_at).not.toBeNull()
    const rpcCalls = calls.filter((call) => call.op === 'rpc')
    expect(rpcCalls[0].payload).toEqual({
      p_token_hash: hashApprovalToken(token)
    })
    expect(calls.some((call) => call.op === 'update')).toBe(false)
  })

  test('the success page shows the escaped email', async () => {
    approvalRow!.email = 'a<b>@example.com'

    const html = await (await post()).text()

    expect(html).toContain('<strong>a&lt;b&gt;@example.com</strong>')
  })

  test('a used link reports it was already processed', async () => {
    approvalRow!.used_at = new Date().toISOString()
    profile = { id: 'u1', is_active: true }

    const response = await post()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Đã xử lý')
    expect(activations).toBe(0)
  })

  test('locking the user after the approval page was opened keeps the account locked', async () => {
    // The admin opens the emailed link, then the user is locked in Manage
    // users, then the admin presses "Confirm approval" on the old page.
    expect((await get()).status).toBe(200)
    lockUser()

    const response = await post()

    expect(response.status).toBe(410)
    expect(await title(response)).toBe('Yêu cầu đã bị thu hồi')
    expect(profile?.is_active).toBe(false)
    expect(activations).toBe(0)
  })

  test('a locked account is not activated even by a link that is still open', async () => {
    // e.g. a request re-opened just as the lock landed
    profile = {
      id: 'u1',
      is_active: false,
      locked_at: new Date().toISOString()
    }

    const response = await post()

    expect(response.status).toBe(410)
    expect(profile.is_active).toBe(false)
    expect(approvalRow?.used_at).not.toBeNull()
  })

  test('the revoked page is in English for an English locale', async () => {
    lockUser()

    const response = await postWithCookie('locale=en')

    expect(response.status).toBe(410)
    expect(await title(response)).toBe('Request revoked')
  })

  test('a user unlocked by hand after the revoke stays active', async () => {
    approvalRow!.used_at = new Date().toISOString()
    profile = { id: 'u1', is_active: true, locked_at: null }

    const response = await post()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Đã xử lý')
    expect(profile.is_active).toBe(true)
  })

  test('an expired or unknown link is invalid', async () => {
    approvalRow!.expires_at = new Date(Date.now() - 1000).toISOString()
    const expired = await post()
    expect(expired.status).toBe(404)
    expect(await title(expired)).toBe('Liên kết không hợp lệ')
    expect(profile?.is_active).toBe(false)

    approvalRow = null
    expect((await post()).status).toBe(404)
  })

  test('a malformed token never reaches the database', async () => {
    const response = await POST(
      new Request('https://tree.example.com/api/admin/approve/short', {
        method: 'POST'
      }),
      { params: Promise.resolve({ token: 'short' }) }
    )

    expect(response.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  test('a missing profile returns 404 and leaves the link unused', async () => {
    profile = null

    const response = await post()

    expect(response.status).toBe(404)
    expect(await title(response)).toBe('Không tìm thấy tài khoản')
    expect(approvalRow?.used_at).toBeNull()
  })

  test('a user already active is still approved and the link closed', async () => {
    profile = { id: 'u1', is_active: true }

    const response = await post()

    expect(response.status).toBe(200)
    expect(activations).toBe(0)
    expect(approvalRow?.used_at).not.toBeNull()
  })

  test('a database error shows the failure page and changes nothing', async () => {
    rpcResult = { error: { message: 'network down' } }

    const response = await post()

    expect(response.status).toBe(500)
    expect(await title(response)).toBe('Duyệt thất bại')
    expect(profile?.is_active).toBe(false)
    expect(approvalRow?.used_at).toBeNull()
  })

  test('a database without the migration asks for the upgrade', async () => {
    rpcResult = { error: { message: 'not found', code: 'PGRST202' } }

    const response = await post()

    expect(response.status).toBe(503)
    expect(await title(response)).toBe('Cần nâng cấp database')
    expect(profile?.is_active).toBe(false)
  })

  test('an unknown answer is treated as a failure', async () => {
    rpcResult = { data: { status: 'something-else' } }

    expect((await post()).status).toBe(500)
  })
})

describe('GET /api/admin/approve/[token]', () => {
  test('an open link shows the confirm button', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<form method="post">')
  })

  test('a revoked link says so and offers no confirm button', async () => {
    approvalRow!.used_at = new Date().toISOString()

    const response = await get('locale=en')
    const html = await response.text()

    expect(response.status).toBe(410)
    expect(html).toContain('Request revoked')
    expect(html).not.toContain('<form')
  })

  test('a link used for an active account reports it was processed', async () => {
    approvalRow!.used_at = new Date().toISOString()
    profile = { id: 'u1', is_active: true }

    const response = await get()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Đã xử lý')
  })
})
