import { describe, expect, test } from 'bun:test'

import { MEMBER_BATCH_SIZE, nextVisibleCount, takeBatch } from './batchedList'

describe('nextVisibleCount', () => {
  test('adds one batch', () => {
    expect(nextVisibleCount(60, 500)).toBe(120)
  })
  test('never goes above the total', () => {
    expect(nextVisibleCount(120, 130)).toBe(130)
    expect(nextVisibleCount(0, 10)).toBe(10)
  })
  test('handles an empty list and a custom size', () => {
    expect(nextVisibleCount(60, 0)).toBe(0)
    expect(nextVisibleCount(10, 100, 5)).toBe(15)
  })
})

describe('takeBatch', () => {
  const items = Array.from({ length: 150 }, (_, i) => i)

  test('first batch is 60 items', () => {
    const r = takeBatch(items, MEMBER_BATCH_SIZE)
    expect(r.shown).toHaveLength(60)
    expect(r.shown[0]).toBe(0)
    expect(r.remaining).toBe(90)
    expect(r.nextCount).toBe(60)
  })
  test('last batch is the smaller rest', () => {
    const r = takeBatch(items, 120)
    expect(r.remaining).toBe(30)
    expect(r.nextCount).toBe(30)
  })
  test('everything shown leaves nothing', () => {
    const r = takeBatch(items, 999)
    expect(r.shown).toHaveLength(150)
    expect(r.remaining).toBe(0)
    expect(r.nextCount).toBe(0)
  })
  test('short and empty lists', () => {
    expect(takeBatch([1, 2], 60).remaining).toBe(0)
    expect(takeBatch([], 60).shown).toEqual([])
  })
})
