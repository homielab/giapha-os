import { describe, expect, it } from 'bun:test'

import {
  pickDefaultRootId,
  resolveRootId,
  ROOT_STORAGE_KEY,
  saveChosenRoot
} from '@/utils/treeRoot'

const person = (
  id: string,
  extra: Partial<{
    generation: number | null
    is_in_law: boolean
    birth_year: number | null
  }> = {}
) => ({
  id,
  generation: null,
  is_in_law: false,
  birth_year: null,
  ...extra
})

const child = (a: string, b: string) => ({
  type: 'biological_child' as const,
  person_b: b,
  person_a: a
})

describe('pickDefaultRootId', () => {
  it('prefers the ancestor over an in-law born earlier', () => {
    const persons = [
      person('bride', { is_in_law: true, birth_year: 1900 }),
      person('root', { generation: 1, birth_year: 1920 }),
      person('kid', { generation: 2, birth_year: 1950 })
    ]
    expect(pickDefaultRootId(persons, [child('root', 'kid')])).toBe('root')
  })

  it('keeps generation 1 without a birth year ahead of older non-gen-1', () => {
    const persons = [
      person('old', { birth_year: 1800 }),
      person('g1', { generation: 1 })
    ]
    expect(pickDefaultRootId(persons, [])).toBe('g1')
  })

  it('falls back to the earliest born blood root when no generation 1', () => {
    const persons = [
      person('a', { birth_year: 1950 }),
      person('b', { birth_year: 1930 }),
      person('c', { is_in_law: true, birth_year: 1900 })
    ]
    expect(pickDefaultRootId(persons, [])).toBe('b')
  })

  it('uses an in-law root only when nobody else is a root', () => {
    const persons = [person('in', { is_in_law: true }), person('kid')]
    expect(pickDefaultRootId(persons, [child('in', 'kid')])).toBe('in')
  })

  it('returns the first person when the graph is all cycles', () => {
    const persons = [person('a'), person('b')]
    const rels = [child('a', 'b'), child('b', 'a')]
    expect(pickDefaultRootId(persons, rels)).toBe('a')
  })

  it('returns undefined for no people', () => {
    expect(pickDefaultRootId([], [])).toBeUndefined()
  })
})

describe('resolveRootId', () => {
  const map = new Map([
    ['a', {}],
    ['b', {}]
  ])

  it('keeps a chosen id that still exists', () => {
    expect(resolveRootId('b', map, 'a')).toBe('b')
  })

  it('falls back to the default for an unknown id', () => {
    expect(resolveRootId('gone', map, 'a')).toBe('a')
  })

  it('uses the default when nothing is chosen', () => {
    expect(resolveRootId(null, map, 'a')).toBe('a')
    expect(resolveRootId(undefined, map, 'a')).toBe('a')
  })

  it('returns null for an empty map', () => {
    expect(resolveRootId('a', new Map(), 'a')).toBeNull()
  })
})

describe('resolveRootId', () => {
  const map = new Map([
    ['a', {}],
    ['b', {}]
  ])

  it('keeps a chosen id that still exists', () => {
    expect(resolveRootId('b', map, 'a')).toBe('b')
  })

  it('falls back to the default for an unknown id', () => {
    expect(resolveRootId('gone', map, 'a')).toBe('a')
  })

  it('uses the default when nothing is chosen', () => {
    expect(resolveRootId(null, map, 'a')).toBe('a')
    expect(resolveRootId(undefined, map, 'a')).toBe('a')
  })

  it('returns null for an empty map', () => {
    expect(resolveRootId('a', new Map(), 'a')).toBeNull()
  })
})

describe('saveChosenRoot', () => {
  it('stores the picked root', () => {
    const saved = new Map<string, string>()
    saveChosenRoot({ setItem: (k, v) => void saved.set(k, v) }, 'p1')
    expect(saved.get(ROOT_STORAGE_KEY)).toBe('p1')
  })

  it('ignores a storage that throws or is missing', () => {
    const warn = console.warn
    console.warn = () => {}
    try {
      expect(() =>
        saveChosenRoot(
          {
            setItem: () => {
              throw new Error('quota')
            }
          },
          'p1'
        )
      ).not.toThrow()
      expect(() => saveChosenRoot(undefined, 'p1')).not.toThrow()
    } finally {
      console.warn = warn
    }
  })
})
