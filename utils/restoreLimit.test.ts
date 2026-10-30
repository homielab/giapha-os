import { describe, expect, test } from 'bun:test'

import {
  restoreMaxBytes,
  restorePayloadTooLarge,
  VERCEL_RESTORE_MAX_BYTES
} from './restoreLimit'

describe('restore size limit', () => {
  test('only Vercel has a limit', () => {
    expect(restoreMaxBytes({ VERCEL: '1' })).toBe(VERCEL_RESTORE_MAX_BYTES)
    expect(restoreMaxBytes({})).toBeNull()
  })

  test('a 5 MB payload is too large on Vercel and fine elsewhere', () => {
    const payload = { persons: [{ note: 'x'.repeat(5 * 1024 * 1024) }] }
    expect(
      restorePayloadTooLarge(payload, restoreMaxBytes({ VERCEL: '1' }))
    ).toBe(true)
    expect(restorePayloadTooLarge(payload, restoreMaxBytes({}))).toBe(false)
  })

  test('a small payload passes on Vercel', () => {
    expect(
      restorePayloadTooLarge({ persons: [] }, VERCEL_RESTORE_MAX_BYTES)
    ).toBe(false)
  })

  test('counts UTF-8 bytes, not characters', () => {
    expect(restorePayloadTooLarge('ệ'.repeat(10), 25)).toBe(true)
  })
})
