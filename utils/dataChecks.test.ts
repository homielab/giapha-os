import { describe, expect, test } from 'bun:test'

import {
  formatPartialDate,
  runDataChecks,
  type DataCheckPerson,
  type DataCheckRelationship
} from './dataChecks'

const TODAY = new Date(2026, 9, 27)

function person(
  id: string,
  extra: Partial<DataCheckPerson> = {}
): DataCheckPerson {
  return {
    id,
    full_name: `Person ${id}`,
    gender: null,
    birth_year: null,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    ...extra
  }
}

const child = (parent: string, kid: string): DataCheckRelationship => ({
  type: 'biological_child',
  person_a: parent,
  person_b: kid
})
const kinds = (
  persons: DataCheckPerson[],
  relationships: DataCheckRelationship[] = []
) => runDataChecks(persons, relationships, TODAY).map((f) => f.kind)

describe('runDataChecks', () => {
  test('a clean tree reports nothing', () => {
    const persons = [
      person('m', { gender: 'female', birth_year: 1940, death_year: 2000 }),
      person('k', { birth_year: 1970 })
    ]
    expect(kinds(persons, [child('m', 'k')])).toEqual([])
  })

  test('death before birth, down to month and day', () => {
    expect(
      kinds([person('a', { birth_year: 1950, death_year: 1949 })])
    ).toEqual(['deathBeforeBirth'])
    expect(
      kinds([
        person('a', {
          birth_year: 1950,
          birth_month: 6,
          death_year: 1950,
          death_month: 5
        })
      ])
    ).toEqual(['deathBeforeBirth'])
    // same year, month unknown: cannot be told, not reported
    expect(
      kinds([
        person('a', { birth_year: 1950, birth_month: 6, death_year: 1950 })
      ])
    ).toEqual([])
  })

  test('missing years are skipped', () => {
    expect(kinds([person('a', { death_year: 1900 })])).toEqual([])
    expect(kinds([person('a', { birth_year: 1900 })])).toEqual([])
  })

  test('a child born after the mother died, but not after the father', () => {
    const persons = [
      person('m', { gender: 'female', birth_year: 1940, death_year: 1969 }),
      person('f', { gender: 'male', birth_year: 1940, death_year: 1969 }),
      person('k', { birth_year: 1970 })
    ]
    expect(kinds(persons, [child('m', 'k')])).toEqual(['bornAfterMotherDeath'])
    expect(kinds(persons, [child('f', 'k')])).toEqual([])
  })

  test('adopted children are left out of the parent checks', () => {
    const persons = [
      person('m', { gender: 'female', birth_year: 1960, death_year: 1969 }),
      person('k', { birth_year: 1970 })
    ]
    const adopted = { ...child('m', 'k'), type: 'adopted_child' }
    expect(kinds(persons, [adopted])).toEqual([])
  })

  test('parent younger than 12 or older than 70 at the birth', () => {
    const persons = [
      person('p', { birth_year: 1960 }),
      person('young', { birth_year: 1971 }),
      person('ok12', { birth_year: 1972 }),
      person('old', { birth_year: 2031 }),
      person('nobirth')
    ]
    const found = runDataChecks(
      persons,
      [
        child('p', 'young'),
        child('p', 'ok12'),
        child('p', 'old'),
        child('p', 'nobirth')
      ],
      new Date(2100, 0, 1)
    )
    expect(found.map((f) => f.kind)).toEqual(['parentTooYoung', 'parentTooOld'])
    expect(found[0].params.age).toBe(11)
    expect(found[1].params.age).toBe(71)
    expect(found[0].people.map((p) => p.id)).toEqual(['p', 'young'])
  })

  test('exactly 70 years apart is fine', () => {
    const persons = [
      person('p', { birth_year: 1900 }),
      person('k', { birth_year: 1970 })
    ]
    expect(kinds(persons, [child('p', 'k')])).toEqual([])
  })

  test('dates after today, with month and day only as far as known', () => {
    expect(kinds([person('a', { birth_year: 2027 })])).toEqual(['futureDate'])
    expect(kinds([person('a', { birth_year: 2026, birth_month: 11 })])).toEqual(
      ['futureDate']
    )
    expect(kinds([person('a', { birth_year: 2026, birth_month: 10 })])).toEqual(
      []
    )
    const both = runDataChecks(
      [person('a', { birth_year: 2030, death_year: 2031 })],
      [],
      TODAY
    )
    expect(both.map((f) => f.params.field)).toEqual(['birth', 'death'])
  })

  test('a repeated marriage (either direction) or parent link', () => {
    const persons = [person('a'), person('b')]
    const marriage = (x: string, y: string) => ({
      type: 'marriage',
      person_a: x,
      person_b: y
    })
    expect(kinds(persons, [marriage('a', 'b'), marriage('b', 'a')])).toEqual([
      'duplicateRelationship'
    ])
    expect(
      kinds(persons, [
        child('a', 'b'),
        { ...child('a', 'b'), type: 'adopted_child' }
      ])
    ).toEqual(['duplicateRelationship'])
    // a marriage and a parent link between two people are different things
    expect(kinds(persons, [marriage('a', 'b'), child('a', 'b')])).toEqual([])
  })

  test('findings are listed by kind, then by name', () => {
    const persons = [
      person('z', { full_name: 'Zed', birth_year: 2040 }),
      person('a', { full_name: 'Abe', birth_year: 2041 }),
      person('d', { birth_year: 1950, death_year: 1940 })
    ]
    expect(
      runDataChecks(persons, [], TODAY).map((f) => [f.kind, f.people[0].name])
    ).toEqual([
      ['deathBeforeBirth', 'Person d'],
      ['futureDate', 'Abe'],
      ['futureDate', 'Zed']
    ])
  })
})

describe('formatPartialDate', () => {
  test('writes what is known', () => {
    expect(formatPartialDate(1950, 3, 7)).toBe('7/3/1950')
    expect(formatPartialDate(1950, 3, null)).toBe('3/1950')
    expect(formatPartialDate(1950, null, 7)).toBe('1950')
    expect(formatPartialDate(null, 3, 7)).toBe('')
  })
})
