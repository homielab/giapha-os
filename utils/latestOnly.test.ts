import { describe, expect, test } from 'bun:test'

import { createLatestGuard } from './latestOnly'

describe('createLatestGuard', () => {
  test('a fresh token is current', () => {
    const guard = createLatestGuard()
    const token = guard.begin()
    expect(guard.isCurrent(token)).toBe(true)
  })

  test('an older token goes stale once a newer load begins', () => {
    const guard = createLatestGuard()
    const first = guard.begin()
    const second = guard.begin()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })

  test('invalidate() makes every token stale', () => {
    const guard = createLatestGuard()
    const first = guard.begin()
    const second = guard.begin()
    guard.invalidate()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(false)
  })

  test('a load begun after invalidate() is current again', () => {
    const guard = createLatestGuard()
    guard.begin()
    guard.invalidate()
    const next = guard.begin()
    expect(guard.isCurrent(next)).toBe(true)
  })

  test('guards are independent of each other', () => {
    const a = createLatestGuard()
    const b = createLatestGuard()
    const tokenA = a.begin()
    b.begin()
    b.invalidate()
    expect(a.isCurrent(tokenA)).toBe(true)
  })

  test('a slow earlier response is dropped, the later one applied', async () => {
    const guard = createLatestGuard()
    const applied: string[] = []
    const load = async (id: string, delay: number) => {
      const token = guard.begin()
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (guard.isCurrent(token)) applied.push(id)
    }
    await Promise.all([load('A', 20), load('B', 1)])
    expect(applied).toEqual(['B'])
  })
})
