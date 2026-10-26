import { describe, expect, test } from 'bun:test'

import { compareVersions, parseVersion } from '@/utils/version'

function cmp(a: string, b: string) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error('unparsable')
  return compareVersions(left, right)
}

describe('parseVersion', () => {
  test('parses major.minor.patch', () => {
    expect(parseVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: []
    })
  })

  test('parses the prerelease and ignores build metadata', () => {
    expect(parseVersion('1.2.3-rc.1')?.prerelease).toEqual(['rc', '1'])
    expect(parseVersion('1.2.3+build.5')).toEqual(parseVersion('1.2.3'))
    expect(parseVersion('1.2.3-rc.1+sha.abc')?.prerelease).toEqual(['rc', '1'])
  })

  test('trims whitespace', () => {
    expect(parseVersion(' 2.0.0\n')?.major).toBe(2)
  })

  test('rejects garbage, missing parts and non-strings', () => {
    for (const value of ['', 'abc', '1.2', '1', 'v1.2.3', '1.2.3.4', '1.2.x']) {
      expect(parseVersion(value)).toBeNull()
    }
    for (const value of [undefined, null, 123, {}]) {
      expect(parseVersion(value)).toBeNull()
    }
  })
})

describe('compareVersions', () => {
  test('equal versions, also with different build metadata', () => {
    expect(cmp('1.2.3', '1.2.3')).toBe(0)
    expect(cmp('1.2.3+a', '1.2.3+b')).toBe(0)
  })

  test('compares numerically, not as strings', () => {
    expect(cmp('1.10.0', '1.9.0')).toBe(1)
    expect(cmp('1.9.0', '1.10.0')).toBe(-1)
    expect(cmp('2.0.0', '1.99.99')).toBe(1)
    expect(cmp('1.2.10', '1.2.9')).toBe(1)
  })

  test('a prerelease is lower than its release', () => {
    expect(cmp('1.2.3-rc.1', '1.2.3')).toBe(-1)
    expect(cmp('1.2.3', '1.2.3-rc.1')).toBe(1)
  })

  test('prerelease identifiers follow semver precedence', () => {
    expect(cmp('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1)
    expect(cmp('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBe(-1)
    expect(cmp('1.0.0-beta.2', '1.0.0-beta.11')).toBe(-1)
    expect(cmp('1.0.0-beta', '1.0.0-rc')).toBe(-1)
    expect(cmp('1.0.0-rc.1', '1.0.0-rc.1')).toBe(0)
  })

  test('the core version wins over the prerelease', () => {
    expect(cmp('1.2.4-rc.1', '1.2.3')).toBe(1)
  })
})
