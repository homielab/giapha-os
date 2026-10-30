import { describe, expect, test } from 'bun:test'

import { computeKinship } from './resolve'
import type { PersonNode, RelEdge } from './types'

function person(
  id: string,
  gender: PersonNode['gender'],
  extra: Partial<PersonNode> = {}
): PersonNode {
  return {
    id,
    full_name: id,
    gender,
    birth_year: null,
    birth_order: null,
    generation: null,
    is_in_law: false,
    ...extra
  }
}

const child = (parent: string, kid: string): RelEdge => ({
  type: 'biological_child',
  person_a: parent,
  person_b: kid
})

function siblings(a: Partial<PersonNode>, b: Partial<PersonNode>) {
  const persons = [
    person('dad', 'male'),
    person('a', 'male', a),
    person('b', 'male', b)
  ]
  const rels = [child('dad', 'a'), child('dad', 'b')]
  return computeKinship(persons[1], persons[2], persons, rels)!
}

describe('siblings when who is older is unknown', () => {
  test('no birth year and no birth order: both terms, uncertain', () => {
    const r = siblings({}, {})
    expect(r.aCallsB).toBe('Anh/Em trai')
    expect(r.bCallsA).toBe('Anh/Em trai')
    expect(r.hasAmbiguousTerm).toBe(true)
    expect(r.description.uncertain).toBe(true)
    expect(r.description.uncertainPeople?.map((p) => p.id)).toEqual(['a', 'b'])
  })

  test('only one has a birth year: still uncertain', () => {
    expect(siblings({ birth_year: 1950 }, {}).description.uncertain).toBe(true)
  })

  test('one has a birth order and the other a year: uncertain', () => {
    const r = siblings({ birth_order: 1 }, { birth_year: 1950 })
    expect(r.description.uncertain).toBe(true)
  })

  test('both have a birth year: as before', () => {
    const r = siblings({ birth_year: 1950 }, { birth_year: 1955 })
    expect(r.aCallsB).toBe('Em trai')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('both have a birth order: as before', () => {
    const r = siblings({ birth_order: 2 }, { birth_order: 1 })
    expect(r.aCallsB).toBe('Anh trai')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('the same birth year: the month decides, both ways', () => {
    const an = { birth_year: 1990, birth_month: 3 }
    const binh = { birth_year: 1990, birth_month: 11 }
    const r = siblings(an, binh)
    expect(r.aCallsB).toBe('Em trai')
    expect(r.bCallsA).toBe('Anh trai')
    expect(r.description.uncertain).toBeUndefined()
    const back = siblings(binh, an)
    expect(back.aCallsB).toBe('Anh trai')
    expect(back.bCallsA).toBe('Em trai')
  })

  test('the same month: the day decides', () => {
    const r = siblings(
      { birth_year: 1990, birth_month: 3, birth_day: 20 },
      { birth_year: 1990, birth_month: 3, birth_day: 5 }
    )
    expect(r.aCallsB).toBe('Anh trai')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('twins on the same date without a birth order are unknown', () => {
    const date = { birth_year: 1990, birth_month: 3, birth_day: 5 }
    const r = siblings(date, date)
    expect(r.aCallsB).toBe('Anh/Em trai')
    expect(r.description.uncertain).toBe(true)
  })

  test('the same year without months is unknown', () => {
    const r = siblings({ birth_year: 1950 }, { birth_year: 1950 })
    expect(r.description.uncertain).toBe(true)
  })

  test('a month without a year does not decide', () => {
    const r = siblings(
      { birth_month: 3 },
      { birth_year: 1990, birth_month: 11 }
    )
    expect(r.description.uncertain).toBe(true)
  })

  test('a day without both months does not decide', () => {
    const r = siblings(
      { birth_year: 1990, birth_day: 1 },
      { birth_year: 1990, birth_month: 3, birth_day: 9 }
    )
    expect(r.description.uncertain).toBe(true)
  })

  test('birth order wins over the birth date', () => {
    const r = siblings(
      { birth_order: 1, birth_year: 1990, birth_month: 11 },
      { birth_order: 2, birth_year: 1990, birth_month: 3 }
    )
    expect(r.aCallsB).toBe('Em trai')
  })
})

describe('uncles and cousins when who is older is unknown', () => {
  const persons = (u: Partial<PersonNode>, f: Partial<PersonNode>) => [
    person('g', 'male'),
    person('f', 'male', f),
    person('u', 'male', u),
    person('c', 'male'),
    person('k', 'male')
  ]
  const rels = [
    child('g', 'f'),
    child('g', 'u'),
    child('f', 'c'),
    child('u', 'k')
  ]

  test('father’s brother is Bác/Chú, uncertain', () => {
    const p = persons({}, {})
    const r = computeKinship(p[3], p[2], p, rels)!
    expect(r.aCallsB).toBe('Bác/Chú')
    expect(r.description.uncertain).toBe(true)
    expect(r.description.uncertainPeople?.map((x) => x.id)).toEqual(['f', 'u'])
  })

  test('known order gives Chú/Bác as before', () => {
    const p = persons({ birth_year: 1960 }, { birth_year: 1950 })
    const r = computeKinship(p[3], p[2], p, rels)!
    expect(r.aCallsB).toBe('Chú')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('cousins: Anh/Em họ, uncertain about the two branches', () => {
    const p = persons({}, {})
    const r = computeKinship(p[3], p[4], p, rels)!
    expect(r.aCallsB).toBe('Anh/Em họ')
    expect(r.description.uncertain).toBe(true)
    expect(r.description.uncertainPeople?.map((x) => x.id)).toEqual(['f', 'u'])
  })

  test('cousins with birth years are unchanged', () => {
    const p = persons({ birth_year: 1960 }, { birth_year: 1950 })
    const r = computeKinship(p[3], p[4], p, rels)!
    expect(r.aCallsB).toBe('Em họ')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('mother’s brother is Cậu whatever the order', () => {
    const p = [
      person('g', 'male'),
      person('m', 'female'),
      person('u', 'male'),
      person('c', 'male')
    ]
    const r = computeKinship(p[3], p[2], p, [
      child('g', 'm'),
      child('g', 'u'),
      child('m', 'c')
    ])!
    expect(r.aCallsB).toBe('Cậu')
    expect(r.description.uncertain).toBeUndefined()
  })
})

describe('half siblings numbered per mother', () => {
  // a1, a2 by the first wife (1950, 1953); b1, b2 by the second (1965, 1968)
  const persons = [
    person('f', 'male'),
    person('m1', 'female'),
    person('m2', 'female'),
    person('a1', 'male', { birth_order: 1, birth_year: 1950 }),
    person('a2', 'male', { birth_order: 2, birth_year: 1953 }),
    person('b1', 'male', { birth_order: 1, birth_year: 1965 }),
    person('b2', 'male', { birth_order: 2, birth_year: 1968 })
  ]
  const rels = [
    ...['a1', 'a2'].flatMap((id) => [child('f', id), child('m1', id)]),
    ...['b1', 'b2'].flatMap((id) => [child('f', id), child('m2', id)])
  ]
  const kinship = (a: string, b: string, list = persons, links = rels) =>
    computeKinship(
      list.find((p) => p.id === a)!,
      list.find((p) => p.id === b)!,
      list,
      links
    )!

  test('the birth year counts before the birth order', () => {
    const r = kinship('a2', 'b1')
    expect(r.aCallsB).toBe('Em trai')
    expect(r.bCallsA).toBe('Anh trai')
    expect(r.description.uncertain).toBeUndefined()
  })

  test('full siblings still go by birth order first', () => {
    const list = persons.map((p) =>
      p.id === 'a2' ? { ...p, birth_year: 1949 } : p
    )
    expect(kinship('a1', 'a2', list).aCallsB).toBe('Em trai')
  })

  test('without both years the birth order decides', () => {
    const list = persons.map((p) =>
      p.id === 'b1' ? { ...p, birth_year: null } : p
    )
    expect(kinship('a2', 'b1', list).aCallsB).toBe('Anh trai')
  })

  test('without years or orders: uncertain', () => {
    const list = persons.map((p) =>
      p.id === 'a2' || p.id === 'b1'
        ? { ...p, birth_year: null, birth_order: null }
        : p
    )
    const r = kinship('a2', 'b1', list)
    expect(r.aCallsB).toBe('Anh/Em trai')
    expect(r.description.uncertain).toBe(true)
  })

  test('their children: uncle and cousins follow the birth year', () => {
    const list = [...persons, person('ka2', 'male'), person('kb1', 'male')]
    const links = [...rels, child('a2', 'ka2'), child('b1', 'kb1')]
    // b1 is younger than a2: Chú, not Bác
    expect(kinship('ka2', 'b1', list, links).aCallsB).toBe('Chú')
    expect(kinship('kb1', 'a2', list, links).aCallsB).toBe('Bác')
    expect(kinship('kb1', 'ka2', list, links).aCallsB).toBe('Anh họ')
  })
})
