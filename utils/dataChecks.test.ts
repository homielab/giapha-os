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
    // Someone given a date of death is deceased unless the test says otherwise.
    is_deceased: Object.entries(extra).some(
      ([key, value]) => key.startsWith('death_') && value != null
    ),
    birth_year: null,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    death_lunar_year: null,
    death_lunar_month: null,
    death_lunar_day: null,
    ...extra
  }
}

const child = (parent: string, kid: string): DataCheckRelationship => ({
  type: 'biological_child',
  person_a: parent,
  person_b: kid
})
// Missing info and ages over 120 have their own tests; the fixtures below use
// living people born long ago.
const kinds = (
  persons: DataCheckPerson[],
  relationships: DataCheckRelationship[] = []
) =>
  runDataChecks(persons, relationships, TODAY)
    .map((f) => f.kind)
    .filter((k) => !k.startsWith('missing') && k !== 'implausibleAge')

describe('runDataChecks: parents of one child', () => {
  const people = [
    person('f', { gender: 'male' }),
    person('m', { gender: 'female' }),
    person('x', { gender: 'male' }),
    person('m2', { gender: 'female' }),
    person('k')
  ]

  test('lists a child with three biological parents', () => {
    const found = runDataChecks(
      people,
      [child('f', 'k'), child('m', 'k'), child('x', 'k')],
      TODAY
    ).filter((f) => f.kind === 'tooManyParents')
    expect(found).toHaveLength(1)
    expect(found[0].people[0].id).toBe('k')
    expect(found[0].params.count).toBe(3)
  })

  test('lists a child with two mothers', () => {
    expect(kinds(people, [child('m', 'k'), child('m2', 'k')])).toEqual([
      'tooManyParents'
    ])
  })

  test('accepts a father and a mother, and adopted parents', () => {
    const adopted = {
      type: 'adopted_child',
      person_a: 'x',
      person_b: 'k'
    }
    expect(kinds(people, [child('f', 'k'), child('m', 'k'), adopted])).toEqual(
      []
    )
  })
})

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

  test('a father who died long before the birth, but not one who died near it', () => {
    const persons = [
      person('f', { gender: 'male', birth_year: 1870, death_year: 1900 }),
      person('k', { birth_year: 1950 }),
      person('f2', {
        gender: 'male',
        birth_year: 1900,
        death_year: 1950,
        death_month: 3,
        death_day: 1
      }),
      person('k2', { birth_year: 1950, birth_month: 5, birth_day: 1 })
    ]
    const found = runDataChecks(persons, [child('f', 'k')], TODAY).filter(
      (f) => f.kind === 'fatherDiedBeforeBirth'
    )
    expect(found).toHaveLength(1)
    expect(found[0]).toEqual({
      kind: 'fatherDiedBeforeBirth',
      people: [
        { id: 'k', name: 'Person k' },
        { id: 'f', name: 'Person f' }
      ],
      params: {
        child: 'Person k',
        father: 'Person f',
        birth: '1950',
        death: '1900'
      }
    })
    // two months between the death and the birth: within the grace period
    expect(kinds(persons, [child('f2', 'k2')])).toEqual([])
  })

  test('adopted children are left out of the parent checks', () => {
    const persons = [
      person('m', { gender: 'female', birth_year: 1960, death_year: 1969 }),
      person('f', { gender: 'male', birth_year: 1900, death_year: 1900 }),
      person('k', { birth_year: 1970 })
    ]
    expect(
      kinds(persons, [
        { ...child('m', 'k'), type: 'adopted_child' },
        { ...child('f', 'k'), type: 'adopted_child' }
      ])
    ).toEqual([])
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
    ).filter(
      (f) => !f.kind.startsWith('missing') && f.kind !== 'implausibleAge'
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
      runDataChecks(persons, [], TODAY)
        .filter((f) => !f.kind.startsWith('missing'))
        .map((f) => [f.kind, f.people[0].name])
    ).toEqual([
      ['deathBeforeBirth', 'Person d'],
      ['futureDate', 'Abe'],
      ['futureDate', 'Zed']
    ])
  })
})

describe('missing information', () => {
  test('reports a missing birth year, death year and gender, not a complete person', () => {
    const persons = [
      person('a', { full_name: 'A', gender: 'male' }),
      person('b', {
        full_name: 'B',
        gender: 'female',
        birth_year: 1900,
        is_deceased: true
      }),
      person('c', { full_name: 'C', gender: null, birth_year: 1950 }),
      person('d', {
        full_name: 'D',
        gender: 'male',
        birth_year: 1950,
        is_deceased: true,
        death_year: 2010
      })
    ]
    expect(
      runDataChecks(persons, [], TODAY).map((f) => [f.kind, f.people[0].id])
    ).toEqual([
      ['missingBirthYear', 'a'],
      ['missingDeathYear', 'b'],
      ['missingGender', 'c']
    ])
  })

  test('a date of death on someone not marked deceased is reported', () => {
    const persons = [
      person('a', {
        gender: 'male',
        birth_year: 1920,
        is_deceased: false,
        death_year: 1990
      }),
      person('b', {
        gender: 'female',
        birth_year: 1925,
        is_deceased: null,
        death_lunar_month: 3,
        death_lunar_day: 10
      }),
      person('c', {
        gender: 'male',
        birth_year: 1930,
        is_deceased: true,
        death_year: 2000,
        death_lunar_year: 2000,
        death_lunar_month: 5,
        death_lunar_day: 1
      })
    ]
    expect(
      runDataChecks(persons, [], TODAY).map((f) => [f.kind, f.people[0].id])
    ).toEqual([
      ['deceasedFlagMissing', 'a'],
      ['deceasedFlagMissing', 'b']
    ])
  })

  test('gender other than male or female counts as unknown; living without death year is fine', () => {
    const persons = [
      person('x', { gender: 'other', birth_year: 1950 }),
      person('y', { gender: 'male', birth_year: 1950, is_deceased: false })
    ]
    expect(runDataChecks(persons, [], TODAY).map((f) => f.kind)).toEqual([
      'missingGender'
    ])
  })
})

describe('runDataChecks: implausible age', () => {
  const ages = (persons: DataCheckPerson[]) =>
    runDataChecks(persons, [], TODAY)
      .filter((f) => f.kind === 'implausibleAge')
      .map((f) => [f.people[0].id, f.params.field, f.params.age])

  test('living past 120 with no date of death is reported', () => {
    expect(ages([person('a', { birth_year: 1850 })])).toEqual([
      ['a', 'living', 176]
    ])
  })

  test('exactly 120 this year is not reported', () => {
    expect(ages([person('a', { birth_year: 1906 })])).toEqual([])
    expect(ages([person('a', { birth_year: 1905 })])).toEqual([
      ['a', 'living', 121]
    ])
  })

  test('the current year comes from the date passed in', () => {
    const persons = [person('a', { birth_year: 1850 })]
    const at = (year: number) =>
      runDataChecks(persons, [], new Date(year, 0, 1)).filter(
        (f) => f.kind === 'implausibleAge'
      ).length
    expect(at(1970)).toBe(0)
    expect(at(1971)).toBe(1)
  })

  test('died at a plausible age is not reported', () => {
    expect(ages([person('a', { birth_year: 1850, death_year: 1920 })])).toEqual(
      []
    )
  })

  test('died older than 120 is reported', () => {
    const [finding] = runDataChecks(
      [person('a', { birth_year: 1800, death_year: 1925 })],
      [],
      TODAY
    ).filter((f) => f.kind === 'implausibleAge')
    expect(finding.params).toEqual({
      name: 'Person a',
      field: 'death',
      birth: '1800',
      death: '1925',
      age: 125
    })
  })

  test('deceased without a death year or with only a lunar date is left to the other checks', () => {
    expect(
      ages([
        person('a', { birth_year: 1850, is_deceased: true }),
        person('b', { birth_year: 1850, death_lunar_year: 1920 }),
        person('c', {
          birth_year: 1850,
          death_lunar_month: 3,
          is_deceased: false
        }),
        person('d')
      ])
    ).toEqual([])
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

describe('runDataChecks order', () => {
  const missingBirth = (id: string, full_name: string) =>
    person(id, { full_name, gender: 'male' })
  const names = (persons: DataCheckPerson[]) =>
    runDataChecks(persons, [], TODAY).map((f) => f.people[0])

  test('sorts names with Vietnamese collation', () => {
    const persons = ['Đào', 'Dũng', 'Ân', 'An'].map((n, i) =>
      missingBirth(`p${i}`, n)
    )
    expect(names(persons).map((p) => p.name)).toEqual([
      'An',
      'Ân',
      'Dũng',
      'Đào'
    ])
  })

  test('breaks ties between equal names by id', () => {
    const persons = [missingBirth('b', 'Lan'), missingBirth('a', 'Lan')]
    expect(names(persons).map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('runDataChecks: loops and self links', () => {
  const marriage = (a: string, b: string): DataCheckRelationship => ({
    type: 'marriage',
    person_a: a,
    person_b: b
  })
  const people = ['A', 'B', 'C', 'D'].map((id) => person(id, { full_name: id }))
  const run = (relationships: DataCheckRelationship[]) =>
    runDataChecks(people, relationships, TODAY).filter(
      (f) => f.kind === 'parentChildLoop' || f.kind === 'selfLink'
    )

  test('reports a two-person loop once', () => {
    expect(run([child('A', 'B'), child('B', 'A')])).toEqual([
      {
        kind: 'parentChildLoop',
        people: [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' }
        ],
        params: { count: 2, path: 'A → B → A' }
      }
    ])
  })

  test('reports a three-person loop, adopted links included', () => {
    const found = run([
      child('A', 'B'),
      child('B', 'C'),
      { type: 'adopted_child', person_a: 'C', person_b: 'A' },
      child('A', 'D')
    ])
    expect(found).toHaveLength(1)
    expect(found[0].people.map((p) => p.id)).toEqual(['A', 'B', 'C'])
    expect(found[0].params).toEqual({ count: 3, path: 'A → B → C → A' })
  })

  test('reports a marriage or a parent link to oneself only as selfLink', () => {
    const found = runDataChecks(
      people,
      [marriage('A', 'A'), child('B', 'B')],
      TODAY
    ).filter((f) => !f.kind.startsWith('missing'))
    expect(found).toEqual([
      {
        kind: 'selfLink',
        people: [{ id: 'A', name: 'A' }],
        params: { name: 'A', type: 'marriage' }
      },
      {
        kind: 'selfLink',
        people: [{ id: 'B', name: 'B' }],
        params: { name: 'B', type: 'child' }
      }
    ])
  })

  test('finds nothing in a clean tree', () => {
    expect(
      run([
        marriage('A', 'B'),
        child('A', 'C'),
        child('B', 'C'),
        child('C', 'D')
      ])
    ).toEqual([])
  })
})
