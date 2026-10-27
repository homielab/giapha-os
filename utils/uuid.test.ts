import { describe, expect, test } from 'bun:test'

import { isUuid } from '@/utils/uuid'

describe('isUuid', () => {
  test('accepts a v4 UUID, in either case', () => {
    expect(isUuid('3b241101-e2bb-4255-8caf-4136c566a962')).toBe(true)
    expect(isUuid('3B241101-E2BB-4255-8CAF-4136C566A962')).toBe(true)
  })

  test('rejects empty, short and padded values', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid('abc')).toBe(false)
    expect(isUuid('3b241101-e2bb-4255-8caf-4136c566a962 ')).toBe(false)
    expect(isUuid('3b241101-e2bb-4255-8caf-4136c566a96')).toBe(false)
  })

  test('rejects the nil UUID', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(false)
  })
})
