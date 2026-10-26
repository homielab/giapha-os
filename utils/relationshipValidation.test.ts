import { describe, expect, test } from 'bun:test'

import {
  compareBirthDates,
  findBirthDateConflict,
  findRelationshipIssues,
  isDescendant,
  relationshipErrorKey,
  validateNewChildren,
  validateRelationship,
  type DatedPerson,
  type RelationshipLink
} from './relationshipValidation'

const person = (
  id: string,
  birth_year: number | null,
  birth_month: number | null = null,
  birth_day: number | null = null
): DatedPerson => ({ id, birth_year, birth_month, birth_day })

const child = (parent: string, kid: string): RelationshipLink => ({
  person_a: parent,
  person_b: kid,
  type: 'biological_child'
})

// grandpa → father → son
const persons = [
  person('grandpa', 1920),
  person('father', 1950, 5, 10),
  person('son', 1980),
  person('mother', 1952)
]
const relationships: RelationshipLink[] = [
  child('grandpa', 'father'),
  child('father', 'son'),
  { person_a: 'father', person_b: 'mother', type: 'marriage' }
]

describe('validateRelationship', () => {
  test('rejects a link to oneself', () => {
    expect(
      validateRelationship(persons, relationships, child('son', 'son'))
    ).toBe('selfLink')
    expect(
      validateRelationship(persons, relationships, {
        person_a: 'son',
        person_b: 'son',
        type: 'marriage'
      })
    ).toBe('selfLink')
  })

  test('rejects a marriage already stored in either order', () => {
    expect(
      validateRelationship(persons, relationships, {
        person_a: 'mother',
        person_b: 'father',
        type: 'marriage'
      })
    ).toBe('duplicateSpouse')
    expect(
      validateRelationship(persons, relationships, {
        person_a: 'father',
        person_b: 'mother',
        type: 'marriage'
      })
    ).toBe('duplicateSpouse')
  })

  test('accepts a new marriage', () => {
    expect(
      validateRelationship(persons, relationships, {
        person_a: 'son',
        person_b: 'mother',
        type: 'marriage'
      })
    ).toBeNull()
  })

  test('rejects making a child the parent of its own parent', () => {
    expect(
      validateRelationship(persons, relationships, child('son', 'father'))
    ).toBe('cycle')
  })

  test('rejects a loop over several generations, also for adoption', () => {
    expect(
      validateRelationship(persons, relationships, {
        person_a: 'son',
        person_b: 'grandpa',
        type: 'adopted_child'
      })
    ).toBe('cycle')
  })

  test('ignores marriages when looking for loops', () => {
    // mother is married to father, not his descendant: no loop.
    expect(
      validateRelationship(persons, relationships, child('mother', 'son'))
    ).toBeNull()
  })

  test('rejects a child born in an earlier year than the parent', () => {
    expect(
      validateRelationship(
        [person('p', 1960), person('c', 1950)],
        [],
        child('p', 'c')
      )
    ).toBe('childOlderThanParent')
  })

  test('compares full dates within the same year', () => {
    expect(
      validateRelationship(
        [person('p', 1960, 6, 15), person('c', 1960, 6, 14)],
        [],
        child('p', 'c')
      )
    ).toBe('childOlderThanParent')
    expect(
      validateRelationship(
        [person('p', 1960, 6, 15), person('c', 1960, 6, 16)],
        [],
        child('p', 'c')
      )
    ).toBeNull()
  })

  test('skips the date check when a birth year is unknown', () => {
    expect(
      validateRelationship(
        [person('p', null), person('c', 1900)],
        [],
        child('p', 'c')
      )
    ).toBeNull()
    expect(validateRelationship([], [], child('p', 'c'))).toBeNull()
  })
})

describe('compareBirthDates', () => {
  test('uses only the precision both dates have', () => {
    expect(
      compareBirthDates(person('a', 1950), person('b', 1951))
    ).toBeLessThan(0)
    expect(compareBirthDates(person('a', 1950, 3), person('b', 1950))).toBe(0)
    expect(
      compareBirthDates(person('a', 1950, 3), person('b', 1950, 2))
    ).toBeGreaterThan(0)
    expect(
      compareBirthDates(person('a', 1950, 3, 1), person('b', 1950, 3))
    ).toBe(0)
    expect(compareBirthDates(person('a', null), person('b', 1950))).toBeNull()
  })
})

describe('isDescendant', () => {
  test('follows parent links downwards only', () => {
    expect(isDescendant(relationships, 'grandpa', 'son')).toBe(true)
    expect(isDescendant(relationships, 'son', 'grandpa')).toBe(false)
  })

  test('terminates on data that already has a loop', () => {
    const looped = [child('x', 'y'), child('y', 'x')]
    expect(isDescendant(looped, 'x', 'z')).toBe(false)
  })
})

describe('validateNewChildren', () => {
  test('reports the first child born before one of the parents', () => {
    const parents = [person('father', 1950), person('mother', 1970)]
    expect(
      validateNewChildren(parents, [
        { birthYear: 1975 },
        { birthYear: 1965 },
        { birthYear: null }
      ])
    ).toEqual({ index: 1, code: 'childOlderThanParent' })
  })

  test('accepts children without a birth year', () => {
    expect(
      validateNewChildren([person('father', 1950)], [{ birthYear: null }])
    ).toBeNull()
  })
})

test('every code has a message key', () => {
  expect(relationshipErrorKey('cycle')).toBe('relationshipCycle')
  expect(relationshipErrorKey('duplicateSpouse')).toBe(
    'relationshipDuplicateSpouse'
  )
})

describe('findBirthDateConflict', () => {
  const named = (
    id: string,
    full_name: string,
    birth_year: number | null,
    birth_month: number | null = null,
    birth_day: number | null = null
  ) => ({ id, full_name, birth_year, birth_month, birth_day })
  const parents = [named('dad', 'Nguyễn Văn Ba', 1950, 5, 10)]
  const children = [named('kid', 'Nguyễn Văn Út', 2000)]

  test('rejects a birth date moved before a parent', () => {
    expect(
      findBirthDateConflict(person('me', 1950, 5, 9), parents, children)
    ).toEqual({ relation: 'parent', name: 'Nguyễn Văn Ba' })
  })

  test('rejects a birth date moved after a child', () => {
    expect(
      findBirthDateConflict(person('me', 2001), parents, children)
    ).toEqual({ relation: 'child', name: 'Nguyễn Văn Út' })
  })

  test('accepts dates in order and dates that cannot be told apart', () => {
    expect(
      findBirthDateConflict(person('me', 1975), parents, children)
    ).toBeNull()
    expect(
      findBirthDateConflict(person('me', 1950, 5), parents, children)
    ).toBeNull()
  })

  test('does not block when a date is missing', () => {
    expect(
      findBirthDateConflict(person('me', null), parents, children)
    ).toBeNull()
    expect(
      findBirthDateConflict(
        person('me', 2020),
        [named('dad', 'Ba', null)],
        [named('kid', 'Út', null)]
      )
    ).toBeNull()
  })
})

describe('findRelationshipIssues', () => {
  test('accepts a normal tree', () => {
    expect(findRelationshipIssues(relationships)).toEqual([])
  })

  test('reports a parent–child loop once, along its path', () => {
    const issues = findRelationshipIssues([
      ...relationships,
      { person_a: 'son', person_b: 'grandpa', type: 'adopted_child' }
    ])
    expect(issues).toEqual([
      { code: 'cycle', path: ['grandpa', 'father', 'son', 'grandpa'] }
    ])
  })

  test('reports a marriage stored twice in either order', () => {
    const issues = findRelationshipIssues([
      ...relationships,
      { person_a: 'mother', person_b: 'father', type: 'marriage' }
    ])
    expect(issues).toEqual([
      { code: 'duplicateSpouse', pair: ['father', 'mother'] }
    ])
  })

  test('stops at the limit', () => {
    const loops: RelationshipLink[] = []
    for (let i = 0; i < 20; i++) {
      loops.push(child(`a${i}`, `b${i}`), child(`b${i}`, `a${i}`))
    }
    expect(findRelationshipIssues(loops, 10)).toHaveLength(10)
  })

  test('handles a long chain without recursion limits', () => {
    const chain: RelationshipLink[] = []
    for (let i = 0; i < 20000; i++) chain.push(child(`p${i}`, `p${i + 1}`))
    expect(findRelationshipIssues(chain)).toEqual([])
    chain.push(child('p20000', 'p0'))
    expect(findRelationshipIssues(chain)).toHaveLength(1)
  })
})
