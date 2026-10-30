import { describe, expect, test } from 'bun:test'

import { nextParamFor, oauthRedirectTo, safeNextPath } from './safeNextPath'

describe('safeNextPath', () => {
  test('keeps dashboard pages with their query and hash', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard')
    expect(safeNextPath('/dashboard/members/abc-123')).toBe(
      '/dashboard/members/abc-123'
    )
    expect(safeNextPath('/dashboard/members/abc?tab=x')).toBe(
      '/dashboard/members/abc?tab=x'
    )
    expect(safeNextPath('/dashboard/events?view=list#today')).toBe(
      '/dashboard/events?view=list#today'
    )
    expect(safeNextPath('/dashboard?q=1')).toBe('/dashboard?q=1')
  })

  test('falls back to /dashboard for empty values', () => {
    expect(safeNextPath(null)).toBe('/dashboard')
    expect(safeNextPath(undefined)).toBe('/dashboard')
    expect(safeNextPath('')).toBe('/dashboard')
  })

  test('rejects other sites', () => {
    for (const next of [
      '//evil.com',
      '//evil.com/dashboard',
      'https://x',
      'https://evil.com/dashboard',
      'javascript:alert(1)',
      'evil.com/dashboard',
      '/\\evil.com',
      '/\\/evil.com',
      '\\\\evil.com',
      '/\t/evil.com',
      '/dashboard\n//evil.com'
    ]) {
      expect(safeNextPath(next)).toBe('/dashboard')
    }
  })

  test('rejects pages outside the dashboard', () => {
    for (const next of [
      '/login',
      '/login?next=/dashboard',
      '/',
      '/setup',
      '/dashboardx',
      '/dashboard/../login',
      '/dashboard/%2e%2e/login',
      '/dashboard/..%2f..%2f/evil.com'
    ]) {
      const result = safeNextPath(next)
      expect(result === '/dashboard' || result.startsWith('/dashboard/')).toBe(
        true
      )
    }
    expect(safeNextPath('/login')).toBe('/dashboard')
    expect(safeNextPath('/dashboard/../login')).toBe('/dashboard')
    expect(safeNextPath('/dashboard/%2e%2e/login')).toBe('/dashboard')
  })
})

describe('nextParamFor', () => {
  test('carries the page and its query', () => {
    expect(nextParamFor('/dashboard/members/abc', '?tab=x')).toBe(
      '/dashboard/members/abc?tab=x'
    )
    expect(nextParamFor('/dashboard/events', '')).toBe('/dashboard/events')
  })

  test('leaves out the dashboard home', () => {
    expect(nextParamFor('/dashboard', '')).toBeNull()
  })
})

describe('oauthRedirectTo', () => {
  const origin = 'https://giapha.example'

  test('carries a shared dashboard page to the callback', () => {
    expect(oauthRedirectTo(origin, '/dashboard/members/abc-123')).toBe(
      'https://giapha.example/auth/callback?next=%2Fdashboard%2Fmembers%2Fabc-123'
    )
    expect(oauthRedirectTo(origin, '/dashboard/events?view=list#today')).toBe(
      'https://giapha.example/auth/callback?next=%2Fdashboard%2Fevents%3Fview%3Dlist%23today'
    )
  })

  test('keeps the plain callback for the dashboard home or no next', () => {
    for (const next of [null, undefined, '', '/dashboard']) {
      expect(oauthRedirectTo(origin, next)).toBe(
        'https://giapha.example/auth/callback'
      )
    }
  })

  test('drops pages on other sites', () => {
    for (const next of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
      expect(oauthRedirectTo(origin, next)).toBe(
        'https://giapha.example/auth/callback'
      )
    }
  })
})
