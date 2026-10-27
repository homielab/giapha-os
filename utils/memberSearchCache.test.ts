import { beforeEach, describe, expect, test } from 'bun:test'

import type { SearchableMember } from '@/utils/memberSearch'
import { memberSearchCache } from '@/utils/memberSearchCache'

const list = [{ id: '1', full_name: 'An' }] as unknown as SearchableMember[]

describe('memberSearchCache', () => {
  beforeEach(() => memberSearchCache.clear())

  test('is empty and not fresh before anything is stored', () => {
    expect(memberSearchCache.get()).toBeNull()
    expect(memberSearchCache.isFresh(1000)).toBe(false)
  })

  test('is fresh within the TTL', () => {
    memberSearchCache.set(list, 1000)
    expect(memberSearchCache.get()).toBe(list)
    expect(memberSearchCache.isFresh(1000 + 60_000)).toBe(true)
  })

  test('is stale after the TTL but keeps the list', () => {
    memberSearchCache.set(list, 1000)
    expect(memberSearchCache.isFresh(1000 + 60_001)).toBe(false)
    expect(memberSearchCache.get()).toBe(list)
  })

  test('respects a custom TTL', () => {
    memberSearchCache.set(list, 0)
    expect(memberSearchCache.isFresh(5001, 5000)).toBe(false)
    expect(memberSearchCache.isFresh(5000, 5000)).toBe(true)
  })

  test('clear() empties the cache', () => {
    memberSearchCache.set(list, 1000)
    memberSearchCache.clear()
    expect(memberSearchCache.get()).toBeNull()
    expect(memberSearchCache.isFresh(1000)).toBe(false)
  })
})
