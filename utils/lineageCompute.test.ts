import { describe, expect, test } from 'bun:test'

import { Person, Relationship } from '@/types'

import {
  computeBirthOrders,
  computeGenerations,
  computeInLaws
} from './lineageCompute'

function person(
  id: string,
  gender: Person['gender'],
  extra: Partial<Person> = {}
): Person {
  return { id, full_name: id, gender, is_in_law: false, ...extra } as Person
}

function rel(type: Relationship['type'], a: string, b: string): Relationship {
  return {
    id: `${type}-${a}-${b}`,
    type,
    person_a: a,
    person_b: b,
    created_at: '',
    updated_at: ''
  }
}

// Three generations: grandparents, their son (married to an in-law) and
// aunt, then the son's two children and an adopted child.
const persons = [
  person('grandpa', 'male', { birth_year: 1930 }),
  person('grandma', 'female', { birth_year: 1932, is_in_law: true }),
  person('dad', 'male', { birth_year: 1960 }),
  person('aunt', 'female', { birth_year: 1962 }),
  person('mom', 'female', { birth_year: 1963, is_in_law: true }),
  person('son', 'male', { birth_year: 1990 }),
  person('daughter', 'female', { birth_year: 1985 }),
  person('adoptee', 'male', { birth_year: 1995 })
]

const relationships = [
  rel('marriage', 'grandpa', 'grandma'),
  rel('biological_child', 'grandpa', 'dad'),
  rel('biological_child', 'grandma', 'dad'),
  rel('biological_child', 'grandpa', 'aunt'),
  rel('biological_child', 'grandma', 'aunt'),
  rel('marriage', 'dad', 'mom'),
  rel('biological_child', 'dad', 'son'),
  rel('biological_child', 'mom', 'son'),
  rel('biological_child', 'dad', 'daughter'),
  rel('biological_child', 'mom', 'daughter'),
  rel('adopted_child', 'dad', 'adoptee')
]

describe('computeGenerations', () => {
  test('numbers a three-generation tree from the root couple', () => {
    const gens = computeGenerations(persons, relationships)
    expect(Object.fromEntries(gens)).toEqual({
      grandpa: 1,
      grandma: 1,
      dad: 2,
      aunt: 2,
      mom: 2,
      son: 3,
      daughter: 3,
      adoptee: 3
    })
  })

  test('an adopted child gets the generation below the parent', () => {
    const gens = computeGenerations(persons, relationships)
    expect(gens.get('adoptee')).toBe(gens.get('dad')! + 1)
  })

  test('an in-law takes the spouse generation', () => {
    const gens = computeGenerations(persons, relationships)
    expect(gens.get('mom')).toBe(gens.get('dad'))
  })

  test('a person without any relationship is generation 1', () => {
    const gens = computeGenerations([person('alone', 'male')], [])
    expect(gens.get('alone')).toBe(1)
  })

  test('uses the deepest path when parents are in different generations', () => {
    const ps = [
      person('a', 'male'),
      person('b', 'male'),
      person('c', 'female'),
      person('d', 'male')
    ]
    const rs = [
      rel('biological_child', 'a', 'b'),
      rel('biological_child', 'a', 'c'),
      rel('biological_child', 'b', 'c'),
      rel('biological_child', 'c', 'd')
    ]
    const gens = computeGenerations(ps, rs)
    expect(gens.get('c')).toBe(3)
    expect(gens.get('d')).toBe(4)
  })

  test('a parent-child loop below a root does not hang', () => {
    const ps = [
      person('root', 'male'),
      person('x', 'male'),
      person('y', 'male')
    ]
    const rs = [
      rel('biological_child', 'root', 'x'),
      rel('biological_child', 'x', 'y'),
      rel('biological_child', 'y', 'x')
    ]
    const gens = computeGenerations(ps, rs)
    expect(gens.get('root')).toBe(1)
    expect(gens.get('x')).toBeLessThanOrEqual(ps.length)
    expect(gens.get('y')).toBeLessThanOrEqual(ps.length)
  })

  test('a loop with no root leaves its members without a generation', () => {
    const ps = [person('x', 'male'), person('y', 'male')]
    const rs = [
      rel('biological_child', 'x', 'y'),
      rel('biological_child', 'y', 'x')
    ]
    expect(computeGenerations(ps, rs).size).toBe(0)
  })
})

describe('computeInLaws', () => {
  test('a spouse without parents of someone with parents is an in-law', () => {
    const inLaws = computeInLaws(persons, relationships)
    expect(inLaws.get('mom')).toBe(true)
    expect(inLaws.get('dad')).toBe(false)
    expect(inLaws.get('son')).toBe(false)
    expect(inLaws.get('adoptee')).toBe(false)
  })

  test('in a root couple the husband is the bloodline when both are flagged', () => {
    const ps = [
      person('h', 'male', { is_in_law: true }),
      person('w', 'female', { is_in_law: true })
    ]
    const inLaws = computeInLaws(ps, [rel('marriage', 'h', 'w')])
    expect(inLaws.get('h')).toBe(false)
    expect(inLaws.get('w')).toBe(true)
  })

  test('in a root couple the saved bloodline flag is kept', () => {
    const inLaws = computeInLaws(persons, relationships)
    expect(inLaws.get('grandpa')).toBe(false)
    expect(inLaws.get('grandma')).toBe(true)

    const ps = [
      person('h', 'male', { is_in_law: true }),
      person('w', 'female', { is_in_law: false })
    ]
    const swapped = computeInLaws(ps, [rel('marriage', 'h', 'w')])
    expect(swapped.get('w')).toBe(false)
  })

  test('a person with no parents and no spouse is not an in-law', () => {
    const inLaws = computeInLaws([person('alone', 'female')], [])
    expect(inLaws.get('alone')).toBe(false)
  })
})

describe('computeBirthOrders', () => {
  test('orders children by birth year, adopted children included', () => {
    const orders = computeBirthOrders(persons, relationships)
    expect(orders.get('daughter')).toBe(1)
    expect(orders.get('son')).toBe(2)
    expect(orders.get('adoptee')).toBe(3)
    expect(orders.get('dad')).toBe(1)
    expect(orders.get('aunt')).toBe(2)
  })

  test('unknown birth years come last, ties sorted by name', () => {
    const ps = [
      person('p', 'male'),
      person('Bình', 'male', { birth_year: 2000 }),
      person('An', 'male', { birth_year: 2000 }),
      person('Chưa rõ', 'female', { birth_year: null })
    ]
    const rs = ['Bình', 'An', 'Chưa rõ'].map((c) =>
      rel('biological_child', 'p', c)
    )
    const orders = computeBirthOrders(ps, rs)
    expect(orders.get('An')).toBe(1)
    expect(orders.get('Bình')).toBe(2)
    expect(orders.get('Chưa rõ')).toBe(3)
  })

  test('same birth year: the earlier month is the elder', () => {
    const ps = [
      person('p', 'male'),
      person('An', 'male', { birth_year: 2000, birth_month: 6 }),
      person('Bình', 'male', { birth_year: 2000, birth_month: 1 })
    ]
    const rs = ['An', 'Bình'].map((c) => rel('biological_child', 'p', c))
    const orders = computeBirthOrders(ps, rs)
    expect(orders.get('Bình')).toBe(1)
    expect(orders.get('An')).toBe(2)
  })

  test('ignores the stored birth_order it is about to recompute', () => {
    const ps = [
      person('p', 'male'),
      person('a', 'male', { birth_year: 1990, birth_order: 2 }),
      person('b', 'male', { birth_year: 1995, birth_order: 1 })
    ]
    const rs = ['a', 'b'].map((c) => rel('biological_child', 'p', c))
    expect(computeBirthOrders(ps, rs).get('a')).toBe(1)
  })

  test('in-law children are skipped and do not take a number', () => {
    const ps = [
      person('p', 'male'),
      person('a', 'male', { birth_year: 1990 }),
      person('x', 'female', { birth_year: 1991, is_in_law: true }),
      person('b', 'male', { birth_year: 1992 })
    ]
    const rs = ['a', 'x', 'b'].map((c) => rel('biological_child', 'p', c))
    const orders = computeBirthOrders(ps, rs)
    expect(orders.get('a')).toBe(1)
    expect(orders.has('x')).toBe(false)
    expect(orders.get('b')).toBe(2)
  })

  test('a child of two parents keeps the larger order', () => {
    const ps = [
      person('father', 'male'),
      person('wife2', 'female'),
      person('first', 'male', { birth_year: 1980 }),
      person('second', 'male', { birth_year: 1990 })
    ]
    const rs = [
      rel('biological_child', 'father', 'first'),
      rel('biological_child', 'father', 'second'),
      rel('biological_child', 'wife2', 'second')
    ]
    const orders = computeBirthOrders(ps, rs)
    expect(orders.get('first')).toBe(1)
    expect(orders.get('second')).toBe(2)
  })
})
