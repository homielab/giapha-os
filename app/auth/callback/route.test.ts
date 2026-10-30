import { beforeEach, describe, expect, mock, test } from 'bun:test'

// Only the code exchange is stubbed; the user is null, so no profile lookup
// or approval mail happens.
let exchangeError: { message: string } | null = null

mock.module('next/headers', () => ({ cookies: async () => ({}) }))
mock.module('@/utils/supabase/server', () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: exchangeError }),
      getUser: async () => ({ data: { user: null } })
    }
  })
}))

const { GET } = await import('./route')

const callback = async (query: string) => {
  const res = await GET(
    new Request(`https://giapha.example/auth/callback${query}`)
  )
  return res.headers.get('location')
}

describe('/auth/callback', () => {
  beforeEach(() => {
    exchangeError = null
  })

  test('opens the shared page after a successful sign-in', async () => {
    const next = encodeURIComponent('/dashboard/members/abc-123?tab=info')
    expect(await callback(`?code=c&next=${next}`)).toBe(
      'https://giapha.example/dashboard/members/abc-123?tab=info'
    )
  })

  test('goes to /dashboard without next', async () => {
    expect(await callback('?code=c')).toBe('https://giapha.example/dashboard')
  })

  test('ignores next pointing off the site', async () => {
    for (const next of ['//evil.com', 'https://evil.com/dashboard', '/login']) {
      expect(await callback(`?code=c&next=${encodeURIComponent(next)}`)).toBe(
        'https://giapha.example/dashboard'
      )
    }
  })

  test('still sends failures back to /login', async () => {
    exchangeError = { message: 'bad code' }
    expect(await callback('?code=c&next=%2Fdashboard%2Fmembers%2Fx')).toBe(
      'https://giapha.example/login?error=auth_callback_failed'
    )
    expect(await callback('?error=access_denied')).toBe(
      'https://giapha.example/login?error=auth_callback_failed'
    )
  })
})
