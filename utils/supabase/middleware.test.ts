import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest, type NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}
type CookieMethods = { setAll: (cookies: CookieToSet[]) => void }

let user: { id: string } | null = null
let profileErrorCode: string | null = null
let refreshedCookies: CookieToSet[] = []
let profileProbes = 0

mock.module('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    { cookies }: { cookies: CookieMethods }
  ) => ({
    auth: {
      getUser: async () => {
        // Like @supabase/ssr when the access token was refreshed.
        if (refreshedCookies.length) cookies.setAll(refreshedCookies)
        return { data: { user } }
      }
    },
    from: (table: string) => {
      if (table === 'profiles') profileProbes++
      return {
        select: () => ({
          limit: async () => ({
            error: profileErrorCode ? { code: profileErrorCode } : null
          })
        })
      }
    }
  })
}))

const { resetSchemaCheck, updateSession } = await import('./middleware')

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const request = (path: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'))

const SESSION_COOKIES: CookieToSet[] = [
  {
    name: 'sb-test-auth-token',
    value: 'new-session',
    options: { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 3600 }
  },
  {
    name: 'sb-test-auth-token.1',
    value: 'second-chunk',
    options: { path: '/' }
  }
]

function expectSessionCookies(res: NextResponse) {
  const first = res.cookies.get('sb-test-auth-token')
  expect(first?.value).toBe('new-session')
  expect(first?.httpOnly).toBe(true)
  expect(first?.maxAge).toBe(3600)
  expect(res.cookies.get('sb-test-auth-token.1')?.value).toBe('second-chunk')
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'dummy'
  user = null
  profileErrorCode = null
  refreshedCookies = []
  profileProbes = 0
  resetSchemaCheck()
})

afterAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = originalKey
})

describe('updateSession', () => {
  test('redirects to /missing-db-config when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const response = await updateSession(request('/dashboard'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/missing-db-config'
    )
  })

  test('lets /missing-db-config through when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    const response = await updateSession(request('/missing-db-config'))
    expect(response.headers.get('location')).toBeNull()
  })

  for (const code of ['PGRST205', '42P01']) {
    test(`redirects to /setup when profiles table is missing (${code})`, async () => {
      profileErrorCode = code
      refreshedCookies = SESSION_COOKIES
      const response = await updateSession(request('/dashboard/members'))
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/setup'
      )
      expectSessionCookies(response)
    })
  }

  test('redirects a signed-out visitor from /dashboard to /login', async () => {
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(request('/dashboard'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    expectSessionCookies(response)
  })

  test('carries the page and its query to /login as ?next=', async () => {
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(
      request('/dashboard/members/abc-123?tab=x')
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe(
      '/dashboard/members/abc-123?tab=x'
    )
    expect([...location.searchParams.keys()]).toEqual(['next'])
    expectSessionCookies(response)
  })

  test('sends a signed-in user from /login to a safe ?next= page', async () => {
    user = { id: 'user-1' }
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(
      request('/login?next=%2Fdashboard%2Fevents%3Fview%3Dlist')
    )
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/events?view=list'
    )
    expectSessionCookies(response)
  })

  for (const next of [
    '//evil.com',
    'https://evil.com',
    '/\\evil.com',
    '/login'
  ]) {
    test(`ignores an unsafe ?next= for a signed-in user (${next})`, async () => {
      user = { id: 'user-1' }
      const response = await updateSession(
        request(`/login?next=${encodeURIComponent(next)}`)
      )
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/dashboard'
      )
    })
  }

  test('redirects a signed-in user from /login to /dashboard', async () => {
    user = { id: 'user-1' }
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(request('/login'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard'
    )
    expectSessionCookies(response)
  })

  test('keeps refreshed cookies when no redirect is needed', async () => {
    user = { id: 'user-1' }
    refreshedCookies = SESSION_COOKIES
    const response = await updateSession(request('/dashboard'))
    expect(response.headers.get('location')).toBeNull()
    expectSessionCookies(response)
  })

  test('other profile errors do not redirect to /setup', async () => {
    user = { id: 'user-1' }
    profileErrorCode = '42501'
    const response = await updateSession(request('/dashboard'))
    expect(response.headers.get('location')).toBeNull()
  })

  test('probes the schema once, then skips it on later requests', async () => {
    user = { id: 'user-1' }
    await updateSession(request('/dashboard'))
    expect(profileProbes).toBe(1)

    const second = await updateSession(request('/dashboard/members'))
    expect(second.headers.get('location')).toBeNull()
    await updateSession(request('/login'))
    expect(profileProbes).toBe(1)
  })

  test('keeps probing and redirecting to /setup until the schema exists', async () => {
    profileErrorCode = '42P01'
    for (const path of ['/dashboard', '/login']) {
      const response = await updateSession(request(path))
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/setup'
      )
    }
    expect(profileProbes).toBe(2)

    // After /setup created the tables the next request finds them.
    profileErrorCode = null
    user = { id: 'user-1' }
    const ready = await updateSession(request('/dashboard'))
    expect(ready.headers.get('location')).toBeNull()
    expect(profileProbes).toBe(3)
  })

  test('an unrelated profile error does not mark the schema as checked', async () => {
    user = { id: 'user-1' }
    profileErrorCode = '42501'
    await updateSession(request('/dashboard'))
    await updateSession(request('/dashboard'))
    expect(profileProbes).toBe(2)
  })

  test('public pages never probe the schema', async () => {
    await updateSession(request('/'))
    await updateSession(request('/about'))
    expect(profileProbes).toBe(0)
  })
})
