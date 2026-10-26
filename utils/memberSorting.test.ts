import { describe, expect, test } from 'bun:test'

import { Person } from '@/types'

import {
  groupIntoCoupleGroups,
  sortPersonsByGeneration,
  sortPersonsFlat
} from './memberSorting'

function person(
  id: string,
  gender: Person['gender'],
  extra: Partial<Person> = {}
): Person {
  return { id, full_name: id, gender, is_in_law: false, ...extra } as Person
}

function linkMap(pairs: [string, string][], both = true) {
  const map = new Map<string, string[]>()
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, [])
    map.get(a)!.push(b)
  }
  for (const [a, b] of pairs) {
    add(a, b)
    if (both) add(b, a)
  }
  return map
}

const ids = (list: Person[]) => list.map((p) => p.id)

describe('groupIntoCoupleGroups', () => {
  test('a single person is a group of one', () => {
    const groups = groupIntoCoupleGroups([person('a', 'male')], new Map())
    expect(groups.map(ids)).toEqual([['a']])
  })

  test('one wife: the bloodline member comes first', () => {
    const groups = groupIntoCoupleGroups(
      [
        person('wife', 'female', { is_in_law: true, birth_year: 1950 }),
        person('husband', 'male', { birth_year: 1955 })
      ],
      linkMap([['husband', 'wife']])
    )
    expect(groups.map(ids)).toEqual([['husband', 'wife']])
  })

  test('two wives sit on both sides of the husband', () => {
    const groups = groupIntoCoupleGroups(
      [
        person('husband', 'male', { birth_year: 1940 }),
        person('wife1', 'female', { is_in_law: true, birth_year: 1942 }),
        person('wife2', 'female', { is_in_law: true, birth_year: 1950 })
      ],
      linkMap([
        ['husband', 'wife1'],
        ['husband', 'wife2']
      ])
    )
    expect(groups).toHaveLength(1)
    expect(groups[0][1].id).toBe('husband')
    expect(ids(groups[0]).sort()).toEqual(['husband', 'wife1', 'wife2'])
  })

  test('missing birth years still place everyone once', () => {
    const groups = groupIntoCoupleGroups(
      [
        person('wife2', 'female', { is_in_law: true }),
        person('husband', 'male'),
        person('wife1', 'female', { is_in_law: true, birth_year: 1942 }),
        person('single', 'female')
      ],
      linkMap([
        ['husband', 'wife1'],
        ['husband', 'wife2']
      ])
    )
    expect(groups).toHaveLength(2)
    expect(groups[0][1].id).toBe('husband')
    expect(groups[0]).toHaveLength(3)
    expect(groups.map(ids)[1]).toEqual(['single'])
  })

  test('a spouse outside the given list is not added', () => {
    const groups = groupIntoCoupleGroups(
      [person('husband', 'male')],
      linkMap([['husband', 'elsewhere']])
    )
    expect(groups.map(ids)).toEqual([['husband']])
  })
})

describe('sortPersonsFlat', () => {
  const list = [
    person('Bình', 'male', { birth_year: 1990 }),
    person('An', 'male', { birth_year: null }),
    person('Ánh', 'female', { birth_year: 1980 })
  ]

  test('birth_asc puts unknown years last', () => {
    expect(ids(sortPersonsFlat(list, 'birth_asc'))).toEqual([
      'Ánh',
      'Bình',
      'An'
    ])
  })

  test('name_asc uses Vietnamese order and does not change the input', () => {
    expect(ids(sortPersonsFlat(list, 'name_asc'))).toEqual([
      'An',
      'Ánh',
      'Bình'
    ])
    expect(ids(list)).toEqual(['Bình', 'An', 'Ánh'])
  })
})

describe('sortPersonsByGeneration', () => {
  const list = [
    person('aunt', 'female', { generation: 2, birth_order: 2 }),
    person('mom', 'female', { generation: 2, is_in_law: true }),
    person('grandma', 'female', { generation: 1, is_in_law: true }),
    person('dad', 'male', { generation: 2, birth_order: 1 }),
    person('grandpa', 'male', { generation: 1 })
  ]
  const personMap = new Map(list.map((p) => [p.id, p]))
  const parentsOf = new Map([
    ['dad', ['grandpa', 'grandma']],
    ['aunt', ['grandpa', 'grandma']]
  ])
  const spousesOf = linkMap([
    ['grandpa', 'grandma'],
    ['dad', 'mom']
  ])

  test('groups by generation, siblings by birth order, spouse after partner', () => {
    const sorted = sortPersonsByGeneration(
      list,
      'generation_asc',
      personMap,
      parentsOf,
      spousesOf
    )
    expect(ids(sorted)).toEqual(['grandpa', 'grandma', 'dad', 'mom', 'aunt'])
    expect(sorted.find((p) => p.id === 'mom')?._familyId).toBe(
      'parents_grandma_grandpa'
    )
  })

  test('generation_desc lists the youngest generation first', () => {
    const sorted = sortPersonsByGeneration(
      list,
      'generation_desc',
      personMap,
      parentsOf,
      spousesOf
    )
    expect(ids(sorted)).toEqual(['dad', 'mom', 'aunt', 'grandpa', 'grandma'])
  })
})
