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
// applying the same filters PostgREST would.
interface ApprovalRow {
  id: string
  user_id: string
  email: string
  token_hash: string
  expires_at: string
  used_at: string | null
}

let approvalRow: ApprovalRow
let profile: { id: string; is_active: boolean } | null
let activations = 0
let profileUpdateFails = false
let calls: FakeCall[] = []

function filterValue(call: FakeCall, kind: string, column: string) {
  return call.filters.find(([k, c]) => k === kind && c === column)?.[2]
}

function respond(call: FakeCall): FakeResult {
  calls.push(call)
  if (call.table === 'user_approval_requests') {
    if (call.op === 'select') {
      const matches =
        filterValue(call, 'eq', 'token_hash') === approvalRow.token_hash
      return { data: matches ? { ...approvalRow } : null }
    }
    if (call.op === 'update') {
      const matches =
        filterValue(call, 'eq', 'id') === approvalRow.id &&
        (filterValue(call, 'is', 'used_at') !== null ||
          approvalRow.used_at === null)
      if (!matches) return { data: null }
      Object.assign(approvalRow, call.payload as Partial<ApprovalRow>)
      return { data: { id: approvalRow.id } }
    }
  }

  if (call.table === 'profiles') {
    const row =
      profile && filterValue(call, 'eq', 'id') === profile.id ? profile : null
    if (call.op === 'select') {
      return { data: row ? { is_active: row.is_active } : null }
    }
    if (call.op === 'update') {
      if (profileUpdateFails) return { error: { message: 'network down' } }
      const guard = filterValue(call, 'eq', 'is_active')
      if (row && (guard === undefined || row.is_active === guard)) {
        row.is_active = true
        activations += 1
      }
      return {}
    }
  }

  throw new Error(`Unexpected call ${call.op} ${call.table}`)
}

mock.module('@/utils/supabase/admin', () => ({
  getAdminSupabase: () => fakeSupabase(respond).client
}))

const { POST } = await import('./route')

const token = createApprovalToken()

function post() {
  return POST(
    new Request(`https://tree.example.com/api/admin/approve/${token}`, {
      method: 'POST'
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
  profile = { id: 'u1', is_active: false }
  activations = 0
  profileUpdateFails = false
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

  test('activates the user and marks the link as used', async () => {
    const response = await post()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Duyệt thành công')
    expect(profile?.is_active).toBe(true)
    expect(activations).toBe(1)
    expect(approvalRow.used_at).not.toBeNull()
  })

  test('a used link reports it was already processed', async () => {
    approvalRow.used_at = new Date().toISOString()

    const response = await post()

    expect(response.status).toBe(200)
    expect(await title(response)).toBe('Đã xử lý')
    expect(activations).toBe(0)
    expect(calls.some((call) => call.op === 'update')).toBe(false)
  })

  test('a failed activation keeps the link usable for a second click', async () => {
    profileUpdateFails = true

    const failed = await post()

    expect(failed.status).toBe(500)
    expect(await title(failed)).toBe('Duyệt thất bại')
    expect(profile?.is_active).toBe(false)
    expect(approvalRow.used_at).toBeNull()

    profileUpdateFails = false
    const retried = await post()

    expect(retried.status).toBe(200)
    expect(await title(retried)).toBe('Duyệt thành công')
    expect(profile?.is_active).toBe(true)
    expect(approvalRow.used_at).not.toBeNull()
  })

  test('a missing profile returns 404 and leaves the link unused', async () => {
    profile = null

    const response = await post()

    expect(response.status).toBe(404)
    expect(await title(response)).toBe('Không tìm thấy tài khoản')
    expect(approvalRow.used_at).toBeNull()
  })

  test('a user already active is still approved and the link closed', async () => {
    profile = { id: 'u1', is_active: true }

    const response = await post()

    expect(response.status).toBe(200)
    expect(activations).toBe(0)
    expect(approvalRow.used_at).not.toBeNull()
  })

  test('two concurrent clicks: one approves, the other is already processed', async () => {
    const responses = await Promise.all([post(), post()])
    const titles = (await Promise.all(responses.map(title))).sort()

    // Both clicks got past the first "already used?" check and raced on the claim.
    const claims = calls.filter(
      (call) => call.table === 'user_approval_requests' && call.op === 'update'
    )
    expect(claims.length).toBe(2)
    expect(titles).toEqual(['Duyệt thành công', 'Đã xử lý'].sort())
    expect(activations).toBe(1)
    expect(approvalRow.used_at).not.toBeNull()
  })
})
