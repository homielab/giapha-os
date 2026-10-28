import { describe, expect, test } from 'bun:test'

import { getSiteUrl, parseSiteOrigin } from './siteUrl'

describe('getSiteUrl', () => {
  test('adds https:// to a bare host', () => {
    expect(getSiteUrl({ APP_URL: 'giapha.example.com' })).toBe(
      'https://giapha.example.com'
    )
  })

  test('keeps only the origin of a URL with a path', () => {
    expect(getSiteUrl({ APP_URL: ' https://x.com/path/ ' })).toBe(
      'https://x.com'
    )
    expect(getSiteUrl({ APP_URL: 'http://localhost:4000/' })).toBe(
      'http://localhost:4000'
    )
  })

  test('falls back to the Vercel domain for a non-http APP_URL', () => {
    expect(
      getSiteUrl({
        APP_URL: 'javascript:x',
        VERCEL_PROJECT_PRODUCTION_URL: 'tree.vercel.app'
      })
    ).toBe('https://tree.vercel.app')
  })

  test('falls back to the Vercel domain for an empty APP_URL', () => {
    expect(
      getSiteUrl({ APP_URL: '  ', VERCEL_PROJECT_PRODUCTION_URL: 'a.app' })
    ).toBe('https://a.app')
  })

  test('falls back to localhost when nothing usable is set', () => {
    expect(getSiteUrl({ APP_URL: 'not a url' })).toBe('http://localhost:3000')
    expect(getSiteUrl({})).toBe('http://localhost:3000')
  })
})

describe('parseSiteOrigin', () => {
  test('accepts host:port without a scheme', () => {
    expect(parseSiteOrigin('giapha.local:8080')).toBe(
      'https://giapha.local:8080'
    )
  })

  test('rejects other schemes', () => {
    expect(parseSiteOrigin('ftp://x.com')).toBeNull()
    expect(parseSiteOrigin('mailto:a@b.c')).toBeNull()
    expect(parseSiteOrigin(undefined)).toBeNull()
  })
})
