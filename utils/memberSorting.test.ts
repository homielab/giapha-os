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

  test('wives born the same year sort by month and day', () => {
    const groups = groupIntoCoupleGroups(
      [
        person('husband', 'male', { birth_year: 1940 }),
        person('wifeB', 'female', {
          is_in_law: true,
          birth_year: 1945,
          birth_month: 3,
          birth_day: 20
        }),
        person('wifeA', 'female', {
          is_in_law: true,
          birth_year: 1945,
          birth_month: 3,
          birth_day: 5
        }),
        person('wifeC', 'female', { is_in_law: true, birth_year: 1945 })
      ],
      linkMap([
        ['husband', 'wifeC'],
        ['husband', 'wifeB'],
        ['husband', 'wifeA']
      ])
    )
    // Bloodline in the middle, wives placed oldest first (right, far left,
    // then the free slot); the one without a known date is placed last.
    expect(ids(groups[0])).toEqual(['wifeB', 'wifeC', 'husband', 'wifeA'])
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
  test('name sorts go by given name, then the full name', () => {
    const names = [
      'Nguyễn Văn An',
      'Nguyễn Thị Hoa',
      'Nguyễn Đức Bình',
      'Nguyễn Văn Cường'
    ]
    const list = names.map((n) => person(n, 'male'))
    const asc = sortPersonsFlat(list, 'name_asc').map((p) => p.full_name)
    expect(asc).toEqual([
      'Nguyễn Văn An',
      'Nguyễn Đức Bình',
      'Nguyễn Văn Cường',
      'Nguyễn Thị Hoa'
    ])
    const desc = sortPersonsFlat(list, 'name_desc').map((p) => p.full_name)
    expect(desc).toEqual([...asc].reverse())
  })

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

  test('birth sorts break year ties by month and day', () => {
    const l = [
      person('An', 'male', { birth_year: 2000, birth_month: 6 }),
      person('Bình', 'male', { birth_year: 2000, birth_month: 1 }),
      person('none', 'male')
    ]
    expect(ids(sortPersonsFlat(l, 'birth_asc'))).toEqual(['Bình', 'An', 'none'])
    expect(ids(sortPersonsFlat(l, 'birth_desc'))).toEqual([
      'An',
      'Bình',
      'none'
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

  test('orders sibling branches by the blood parent, whatever the parent row order', () => {
    const fam = [
      person('a', 'male', { generation: 1, birth_order: 1 }),
      person('a-wife', 'female', { generation: 1, is_in_law: true }),
      person('b', 'male', { generation: 1, birth_order: 2 }),
      person('b-wife', 'female', { generation: 1, is_in_law: true }),
      person('b-kid', 'male', { generation: 2 }),
      person('a-kid', 'male', { generation: 2 })
    ]
    const sorted = sortPersonsByGeneration(
      fam,
      'generation_asc',
      new Map(fam.map((p) => [p.id, p])),
      new Map([
        ['a-kid', ['a-wife', 'a']],
        ['b-kid', ['b', 'b-wife']]
      ]),
      linkMap([
        ['a', 'a-wife'],
        ['b', 'b-wife']
      ])
    )
    expect(ids(sorted).slice(-2)).toEqual(['a-kid', 'b-kid'])
  })

  test('siblings born the same year sort by month, then day, unknown last', () => {
    const kids = [
      person('dad', 'male', { generation: 1 }),
      person('c', 'male', { generation: 2, birth_year: 1970 }),
      person('b', 'male', {
        generation: 2,
        birth_year: 1970,
        birth_month: 8,
        birth_day: 2
      }),
      person('a', 'female', {
        generation: 2,
        birth_year: 1970,
        birth_month: 2,
        birth_day: 14
      }),
      person('d', 'female', {
        generation: 2,
        birth_year: 1970,
        birth_month: 8,
        birth_day: 1
      }),
      person('b-wife', 'female', { generation: 2, is_in_law: true })
    ]
    const sorted = sortPersonsByGeneration(
      kids,
      'generation_asc',
      new Map(kids.map((p) => [p.id, p])),
      new Map(['a', 'b', 'c', 'd'].map((id) => [id, ['dad']])),
      linkMap([['b', 'b-wife']])
    )
    expect(ids(sorted)).toEqual(['dad', 'a', 'd', 'b', 'b-wife', 'c'])
  })

  test('a stored birth order still wins over the birth date', () => {
    const kids = [
      person('dad', 'male', { generation: 1 }),
      person('older', 'male', {
        generation: 2,
        birth_year: 1970,
        birth_month: 1
      }),
      person('first', 'male', {
        generation: 2,
        birth_year: 1970,
        birth_month: 12,
        birth_order: 1
      })
    ]
    const sorted = sortPersonsByGeneration(
      kids,
      'generation_asc',
      new Map(kids.map((p) => [p.id, p])),
      new Map([
        ['older', ['dad']],
        ['first', ['dad']]
      ]),
      new Map()
    )
    expect(ids(sorted)).toEqual(['dad', 'first', 'older'])
  })

  test('families of cousins born the same year sort by birth date', () => {
    const all = [
      person('p1', 'male', { generation: 1 }),
      person('p2', 'male', { generation: 1 }),
      person('x', 'male', { generation: 2, birth_year: 1990, birth_month: 9 }),
      person('y', 'male', { generation: 2, birth_year: 1990, birth_month: 4 })
    ]
    const sorted = sortPersonsByGeneration(
      all,
      'generation_asc',
      new Map(all.map((p) => [p.id, p])),
      new Map([
        ['x', ['p1']],
        ['y', ['p2']]
      ]),
      new Map()
    )
    expect(ids(sorted).slice(2)).toEqual(['y', 'x'])
  })
})
