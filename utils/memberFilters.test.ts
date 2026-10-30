import { describe, expect, test } from 'bun:test'

import type { Person } from '@/types'

import {
  filterPersons,
  generationFilterOption,
  listGenerations
} from './memberFilters'

function person(id: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    full_name: id,
    gender: 'male',
    birth_year: 1990,
    is_deceased: false,
    is_in_law: false,
    birth_order: null,
    generation: 1,
    ...extra
  } as Person
}

const people = [
  person('a', { generation: 1, birth_order: 1 }),
  person('b', { gender: 'female', generation: 2, is_deceased: true }),
  person('c', {
    gender: 'female',
    is_in_law: true,
    generation: 2,
    birth_order: 1
  }),
  person('d', { is_in_law: true, generation: 3, birth_year: null }),
  person('e', { gender: 'other', generation: null, birth_order: 1 }),
  person('f', {
    is_deceased: undefined,
    is_in_law: undefined,
    birth_year: undefined
  } as Partial<Person>)
]
const ids = (opt: string) => filterPersons(people, opt).map((p) => p.id)

describe('filterPersons existing options', () => {
  test('all and unknown keep everyone', () => {
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(ids('whatever')).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })
  test('gender', () => {
    expect(ids('male')).toEqual(['a', 'd', 'f'])
    expect(ids('female')).toEqual(['b', 'c'])
  })
  test('in-law by gender', () => {
    expect(ids('in_law_female')).toEqual(['c'])
    expect(ids('in_law_male')).toEqual(['d'])
  })
  test('deceased and first child', () => {
    expect(ids('deceased')).toEqual(['b'])
    expect(ids('first_child')).toEqual(['a', 'e'])
  })
})

describe('filterPersons new options', () => {
  test('alive includes undefined is_deceased', () => {
    expect(ids('alive')).toEqual(['a', 'c', 'd', 'e', 'f'])
  })
  test('missing birth year covers null and undefined', () => {
    expect(ids('missingBirthYear')).toEqual(['d', 'f'])
  })
  test('generation', () => {
    expect(ids(generationFilterOption(2))).toEqual(['b', 'c'])
    expect(ids('generation:3')).toEqual(['d'])
    expect(ids('generation:9')).toEqual([])
  })
  test('malformed generation option keeps everyone', () => {
    expect(ids('generation:x')).toHaveLength(6)
  })
})

describe('listGenerations', () => {
  test('sorted, unique, skips missing', () => {
    expect(listGenerations(people)).toEqual([1, 2, 3])
    expect(listGenerations([])).toEqual([])
  })
})
