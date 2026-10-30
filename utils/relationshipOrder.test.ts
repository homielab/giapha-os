import { describe, expect, test } from 'bun:test'

import type { EnrichedRelationship } from '@/components/relationship/relationshipTypes'
import type { Person } from '@/types'

import { sortRelationshipGroup } from './relationshipOrder'

function rel(
  id: string,
  person: Partial<Person>,
  createdAt: string | null = null
): EnrichedRelationship {
  return {
    id,
    type: 'marriage',
    direction: 'spouse',
    note: null,
    createdAt,
    targetPerson: { id, full_name: id, gender: 'male', ...person } as Person
  }
}

const ids = (list: EnrichedRelationship[]) => list.map((r) => r.id)

describe('sortRelationshipGroup', () => {
  test('parents: father before mother whatever the database order', () => {
    const list = [
      rel('me', { gender: 'female' }),
      rel('cha', { gender: 'male' })
    ]
    expect(ids(sortRelationshipGroup('parent', list))).toEqual(['cha', 'me'])
  })

  test('spouses: by birth year, then when the marriage was added', () => {
    const list = [
      rel('c', { birth_year: null }, '2020-01-01'),
      rel('b', { birth_year: 1950 }, '2021-01-01'),
      rel('a', { birth_year: 1950 }, '2020-06-01'),
      rel('d', { birth_year: 1940 }, '2022-01-01')
    ]
    expect(ids(sortRelationshipGroup('spouse', list))).toEqual([
      'd',
      'a',
      'b',
      'c'
    ])
  })

  test('children: same birth_order falls back to year, month, day', () => {
    const list = [
      rel('x', { birth_order: 1, birth_year: 1960, birth_month: 5 }),
      rel('y', { birth_order: 1, birth_year: 1960, birth_month: 2 }),
      rel('z', { birth_order: 1, birth_year: 1958 })
    ]
    expect(ids(sortRelationshipGroup('child', list))).toEqual(['z', 'y', 'x'])
  })

  test('children: without birth_order, by date; unknown last', () => {
    const list = [
      rel('u', {}),
      rel('v', { birth_year: 1970, birth_month: 3, birth_day: 9 }),
      rel('w', { birth_year: 1970, birth_month: 3, birth_day: 1 }),
      rel('o', { birth_order: 2 })
    ]
    expect(ids(sortRelationshipGroup('child', list))).toEqual([
      'o',
      'w',
      'v',
      'u'
    ])
  })
})
