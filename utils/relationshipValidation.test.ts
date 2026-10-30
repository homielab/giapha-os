import { describe, expect, test } from 'bun:test'

import {
  checkParentDeath,
  compareBirthDates,
  findBirthDateConflict,
  findParentDeathIssues,
  findRelationshipIssues,
  isDescendant,
  relationshipErrorKey,
  relationshipWarning,
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

describe('parent links', () => {
  const sex = (id: string, gender: string): DatedPerson => ({
    ...person(id, null),
    gender
  })
  const people = [
    sex('dad', 'male'),
    sex('mum', 'female'),
    sex('uncle', 'male'),
    sex('aunt', 'female'),
    person('kid', null)
  ]
  const link = (a: string, type = 'biological_child') => ({
    person_a: a,
    person_b: 'kid',
    type
  })
  const check = (existing: RelationshipLink[], candidate: RelationshipLink) =>
    validateRelationship(people, existing, candidate)

  test('rejects the same pair again, of either type', () => {
    expect(check([link('dad')], link('dad'))).toBe('duplicateParent')
    expect(check([link('dad')], link('dad', 'adopted_child'))).toBe(
      'duplicateParent'
    )
    expect(check([link('dad', 'adopted_child')], link('dad'))).toBe(
      'duplicateParent'
    )
  })

  test('rejects a third biological parent', () => {
    expect(check([link('dad'), link('mum')], link('uncle'))).toBe(
      'tooManyParents'
    )
  })

  test('rejects a second mother or a second father', () => {
    expect(check([link('mum')], link('aunt'))).toBe('tooManyParents')
    expect(check([link('dad')], link('uncle'))).toBe('tooManyParents')
  })

  test('accepts a father and a mother', () => {
    expect(check([link('dad')], link('mum'))).toBeNull()
    expect(check([], link('dad'))).toBeNull()
  })

  test('does not compare a parent of unknown gender', () => {
    expect(check([link('mum')], link('ghost'))).toBeNull()
  })

  test('adopted parents do not count', () => {
    const adopted = [link('dad'), link('mum'), link('aunt', 'adopted_child')]
    expect(check(adopted, link('uncle', 'adopted_child'))).toBeNull()
    expect(check([link('dad', 'adopted_child')], link('uncle'))).toBeNull()
  })
})

describe('validateNewChildren', () => {
  test('rejects two new parents of the same gender', () => {
    const parents = [
      { ...person('a', 1950), gender: 'male' },
      { ...person('b', 1952), gender: 'male' }
    ]
    expect(validateNewChildren(parents, [{ birthYear: null }])).toEqual({
      index: 0,
      code: 'tooManyParents'
    })
  })

  test('accepts a father and a mother', () => {
    const parents = [
      { ...person('a', 1950), gender: 'male' },
      { ...person('b', 1952), gender: 'female' }
    ]
    expect(validateNewChildren(parents, [{ birthYear: null }])).toBeNull()
  })

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
  expect(relationshipErrorKey('duplicateParent')).toBe(
    'relationshipDuplicateParent'
  )
  expect(relationshipErrorKey('tooManyParents')).toBe(
    'relationshipTooManyParents'
  )
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

describe('parent death checks', () => {
  const parent = (
    gender: string,
    death_year: number | null,
    death_month: number | null = null,
    death_day: number | null = null
  ): DatedPerson => ({
    id: 'p',
    birth_year: 1920,
    gender,
    death_year,
    death_month,
    death_day
  })

  test('a mother who died before the birth is an error', () => {
    expect(checkParentDeath(parent('female', 1979), person('c', 1980))).toBe(
      'motherDiedBeforeBirth'
    )
    expect(
      checkParentDeath(parent('female', 1980, 6, 1), person('c', 1980, 6, 2))
    ).toBe('motherDiedBeforeBirth')
  })

  test('a mother who died on the birth day or later is fine', () => {
    expect(
      checkParentDeath(parent('female', 1980, 6, 1), person('c', 1980, 6, 1))
    ).toBeNull()
    expect(
      checkParentDeath(parent('female', 1980), person('c', 1980))
    ).toBeNull()
    expect(
      checkParentDeath(parent('female', 1990), person('c', 1980))
    ).toBeNull()
  })

  test('a father who died two years before the birth is a warning', () => {
    expect(checkParentDeath(parent('male', 1978), person('c', 1980))).toBe(
      'fatherDiedLongBeforeBirth'
    )
  })

  test('year-only dates allow one year of difference', () => {
    expect(checkParentDeath(parent('male', 1979), person('c', 1980))).toBeNull()
    expect(
      checkParentDeath(parent('male', 1979, 1, 1), person('c', 1980))
    ).toBeNull()
  })

  test('full dates allow ten months', () => {
    const dad = parent('male', 1979, 1, 15)
    expect(checkParentDeath(dad, person('c', 1979, 11, 15))).toBeNull()
    expect(checkParentDeath(dad, person('c', 1979, 11, 16))).toBe(
      'fatherDiedLongBeforeBirth'
    )
    expect(
      checkParentDeath(parent('male', 1979, 11, 20), person('c', 1980, 9, 20))
    ).toBeNull()
    expect(
      checkParentDeath(parent('male', 1979, 11, 20), person('c', 1980, 9, 21))
    ).toBe('fatherDiedLongBeforeBirth')
  })

  test('unknown dates or gender never raise an issue', () => {
    expect(checkParentDeath(parent('male', null), person('c', 1980))).toBeNull()
    expect(checkParentDeath(parent('male', 1900), person('c', null))).toBeNull()
    expect(
      checkParentDeath(parent('other', 1900), person('c', 1980))
    ).toBeNull()
  })

  test('validateRelationship refuses a mother who died before the birth', () => {
    const mum = { ...parent('female', 1979), id: 'mum' }
    const kid = person('kid', 1980)
    expect(validateRelationship([mum, kid], [], child('mum', 'kid'))).toBe(
      'motherDiedBeforeBirth'
    )
    expect(
      validateRelationship([mum, kid], [], {
        ...child('mum', 'kid'),
        type: 'adopted_child'
      })
    ).toBeNull()
  })

  test('relationshipWarning flags a father, but not for adopted children', () => {
    const dad = { ...parent('male', 1978), id: 'dad' }
    const kid = person('kid', 1980)
    expect(relationshipWarning([dad, kid], child('dad', 'kid'))).toBe(
      'fatherDiedLongBeforeBirth'
    )
    expect(
      relationshipWarning([dad, kid], {
        ...child('dad', 'kid'),
        type: 'adopted_child'
      })
    ).toBeNull()
  })

  test('relationshipWarning flags marriages to a parent, child or sibling', () => {
    const marry = (a: string, b: string) => ({
      type: 'marriage',
      person_a: a,
      person_b: b
    })
    const people = [person('a', 1950), person('kid', 1975), person('sib', 1952)]
    const links = [child('a', 'kid'), child('p', 'a'), child('p', 'sib')]
    expect(relationshipWarning(people, marry('a', 'kid'), links)).toBe(
      'marriageWithRelative'
    )
    expect(relationshipWarning(people, marry('kid', 'a'), links)).toBe(
      'marriageWithRelative'
    )
    expect(relationshipWarning(people, marry('sib', 'a'), links)).toBe(
      'marriageWithRelative'
    )
    expect(relationshipWarning(people, marry('sib', 'kid'), links)).toBeNull()
  })

  test('relationshipWarning flags a spouse who died before the other was born', () => {
    const wife = { ...person('wife', 1930), death_year: 1960 }
    const husband = person('husband', 1965)
    const marriage = { type: 'marriage', person_a: 'husband', person_b: 'wife' }
    expect(relationshipWarning([wife, husband], marriage)).toBe(
      'marriageAfterDeath'
    )
    expect(
      relationshipWarning([{ ...wife, death_year: 1990 }, husband], marriage)
    ).toBeNull()
  })

  test('findParentDeathIssues skips adopted relatives and lists errors first', () => {
    const me = { ...person('me', 1980), full_name: 'Tôi', gender: 'female' }
    const named = (
      id: string,
      gender: string,
      death_year: number,
      adopted = false
    ) => ({
      ...parent(gender, death_year),
      id,
      full_name: id,
      adopted
    })
    const result = findParentDeathIssues(
      me,
      [
        named('dad', 'male', 1970),
        named('mum', 'female', 1975),
        named('adoptive', 'female', 1960, true)
      ],
      []
    )
    expect(result.map((f) => [f.issue, f.parent])).toEqual([
      ['motherDiedBeforeBirth', 'mum'],
      ['fatherDiedLongBeforeBirth', 'dad']
    ])
  })

  test('findParentDeathIssues checks the member as a parent', () => {
    const me = {
      ...person('me', 1950),
      full_name: 'Mẹ',
      gender: 'female',
      death_year: 1979
    }
    const kid = { ...person('kid', 1980), full_name: 'Con' }
    expect(findParentDeathIssues(me, [], [kid])).toEqual([
      { issue: 'motherDiedBeforeBirth', parent: 'Mẹ', child: 'Con' }
    ])
  })
})
