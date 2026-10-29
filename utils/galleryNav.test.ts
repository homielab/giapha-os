import { describe, expect, test } from 'bun:test'

import { idAfterDelete, stepIndex } from '@/utils/galleryNav'

describe('stepIndex', () => {
  test('moves within bounds', () => {
    expect(stepIndex(1, 3, 1)).toBe(2)
    expect(stepIndex(1, 3, -1)).toBe(0)
  })
  test('stops at both ends', () => {
    expect(stepIndex(0, 3, -1)).toBeNull()
    expect(stepIndex(2, 3, 1)).toBeNull()
    expect(stepIndex(0, 1, 1)).toBeNull()
  })
  test('unknown index has no neighbour', () => {
    expect(stepIndex(-1, 3, 1)).toBeNull()
  })
})

describe('idAfterDelete', () => {
  test('prefers the next item, then the previous, then none', () => {
    expect(idAfterDelete(['a', 'b', 'c'], 1)).toBe('c')
    expect(idAfterDelete(['a', 'b', 'c'], 2)).toBe('b')
    expect(idAfterDelete(['a'], 0)).toBeNull()
  })
})
