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

const child = (
  parent: string,
  kid: string,
  type = 'biological_child'
): RelEdge => ({ type, person_a: parent, person_b: kid })
const marriage = (a: string, b: string): RelEdge => ({
  type: 'marriage',
  person_a: a,
  person_b: b
})

function terms(
  a: string,
  b: string,
  persons: PersonNode[],
  rels: RelEdge[]
): [string | undefined, string | undefined] {
  const find = (id: string) => persons.find((p) => p.id === id)!
  const r = computeKinship(find(a), find(b), persons, rels)
  return [r?.aCallsB, r?.bCallsA]
}

describe('blood relations: common ancestor', () => {
  const persons = [
    person('cha', 'male'),
    person('me1', 'female'),
    person('me2', 'female'),
    person('a', 'male', { birth_year: 1990 }),
    person('b', 'female', { birth_year: 1995 })
  ]
  const rels = [
    child('cha', 'a'),
    child('me1', 'a'),
    child('cha', 'b'),
    child('me2', 'b')
  ]

  test('half siblings with the same father are siblings through him', () => {
    const r = computeKinship(persons[3], persons[4], persons, rels)!
    expect([r.aCallsB, r.bCallsA]).toEqual(['Em gái', 'Anh trai'])
    expect(r.description).toEqual({
      kind: 'siblings',
      commonAncestor: 'cha'
    })
    expect(r.distance).toBe(2)
    expect(terms('b', 'a', persons, rels)).toEqual(['Anh trai', 'Em gái'])
  })

  test('an adopted child counts as a child', () => {
    const p = [person('cha', 'male'), person('con', 'female')]
    const e = [child('cha', 'con', 'adopted_child')]
    expect(terms('cha', 'con', p, e)).toEqual(['Con', 'Bố'])
    expect(terms('con', 'cha', p, e)).toEqual(['Bố', 'Con'])
  })

  test('a relationship of another type is ignored', () => {
    const p = [person('x', 'male'), person('y', 'male')]
    const e = [{ type: 'friend', person_a: 'x', person_b: 'y' }]
    expect(computeKinship(p[0], p[1], p, e)!.description.kind).toBe('none')
  })
})

describe('direct line beyond the term tables', () => {
  const persons = Array.from({ length: 13 }, (_, i) => person(`g${i}`, 'male'))
  const rels = persons.slice(1).map((p, i) => child(`g${i}`, p.id))

  test.each([
    [3, 'Chắt', 'Cụ ông (ông cố) nội'],
    [4, 'Chít', 'Kỵ'],
    [8, 'Chẹt', 'Di'],
    [9, 'Cháu đời 9', 'Diễn'],
    [10, 'Cháu đời 10', 'Tổ đời 10'],
    [12, 'Cháu đời 12', 'Tổ đời 12']
  ])('ancestor %d generations up', (depth, down, up) => {
    expect(terms('g0', `g${depth}`, persons, rels)).toEqual([down, up])
    expect(terms(`g${depth}`, 'g0', persons, rels)).toEqual([up, down])
  })
})

describe('great-uncles and great-aunts', () => {
  // G has X (A's grandfather's line) and B; A is G's great-grandchild.
  function greatUncle(
    genderB: PersonNode['gender'],
    orderX: number,
    orderB: number,
    genderX: PersonNode['gender'] = 'male'
  ) {
    const persons = [
      person('G', 'male'),
      person('X', genderX, { birth_order: orderX }),
      person('P', 'male'),
      person('A', 'male'),
      person('B', genderB, { birth_order: orderB })
    ]
    const rels = [
      child('G', 'X'),
      child('X', 'P'),
      child('P', 'A'),
      child('G', 'B')
    ]
    return computeKinship(persons[3], persons[4], persons, rels)!
  }

  test.each([
    ['male', 2, 1, 'Ông Chú'],
    ['male', 1, 2, 'Ông Bác'],
    ['female', 2, 1, 'Bà Cô'],
    ['female', 1, 2, 'Bà Bác']
  ] as const)(
    'paternal, B %s, B order %d, X order %d: %s',
    (g, ob, ox, term) => {
      const r = greatUncle(g, ox, ob)
      expect([r.aCallsB, r.bCallsA]).toEqual([term, 'Chắt'])
      expect(r.description).toMatchObject({
        kind: 'upperBranch',
        side: 'paternal'
      })
    }
  )

  test('maternal side uses Cậu', () => {
    const r = greatUncle('male', 1, 2, 'female')
    expect([r.aCallsB, r.bCallsA]).toEqual(['Ông Cậu', 'Chắt'])
    expect(r.description).toMatchObject({
      kind: 'upperBranch',
      side: 'maternal'
    })
  })

  test('in-laws of a great-uncle use the lookup table', () => {
    // A's spouse W is a great-grandchild of G; B is W's great-aunt "Bà Cô".
    const persons = [
      person('G', 'male'),
      person('X', 'male', { birth_order: 1 }),
      person('P', 'male'),
      person('W', 'female'),
      person('B', 'female', { birth_order: 2 }),
      person('A', 'male')
    ]
    const rels = [
      child('G', 'X'),
      child('X', 'P'),
      child('P', 'W'),
      child('G', 'B'),
      marriage('A', 'W')
    ]
    // W's "Bà Cô" is "Bà Cô vợ" for A; "Chắt" has no in-law entry.
    const [aCallsB, bCallsA] = terms('A', 'B', persons, rels)
    expect(aCallsB).toBe('Bà Cô vợ')
    expect(bCallsA).toBe('Chồng của Chắt')
  })
})

describe('relations through marriage', () => {
  // wife's family: bố vợ, anh vợ (older), vợ, em vợ; plus husbands of siblings
  const persons = [
    person('boVo', 'male'),
    person('anhVo', 'male', { birth_order: 1 }),
    person('chiVo', 'female', { birth_order: 2 }),
    person('vo', 'female', { birth_order: 3 }),
    person('emVo', 'male', { birth_order: 4 }),
    person('chong', 'male'),
    person('reCuaChi', 'male'),
    person('dauCuaAnh', 'female')
  ]
  const rels = [
    child('boVo', 'anhVo'),
    child('boVo', 'chiVo'),
    child('boVo', 'vo'),
    child('boVo', 'emVo'),
    marriage('chong', 'vo'),
    marriage('reCuaChi', 'chiVo'),
    marriage('dauCuaAnh', 'anhVo')
  ]

  test("A's spouse is the blood relative of B", () => {
    expect(terms('chong', 'anhVo', persons, rels)).toEqual(['Anh vợ', 'Em rể'])
    expect(terms('chong', 'chiVo', persons, rels)).toEqual(['Chị vợ', 'Em rể'])
    expect(terms('chong', 'emVo', persons, rels)).toEqual(['Em vợ', 'Anh rể'])
    expect(terms('chong', 'boVo', persons, rels)).toEqual(['Bố vợ', 'Con rể'])
  })

  test("B's spouse is the blood relative of A", () => {
    expect(terms('anhVo', 'chong', persons, rels)).toEqual(['Em rể', 'Anh vợ'])
    expect(terms('vo', 'dauCuaAnh', persons, rels)).toEqual([
      'Chị dâu',
      'Em chồng'
    ])
    expect(terms('boVo', 'chong', persons, rels)).toEqual(['Con rể', 'Bố vợ'])
  })

  test('both spouses are blood relatives: brothers-in-law and sisters-in-law', () => {
    // chong and reCuaChi married sisters; dauCuaAnh and the wife share no sibling bond
    expect(terms('chong', 'reCuaChi', persons, rels)).toEqual([
      'Anh em cột chèo',
      'Anh em cột chèo'
    ])
    const women = [
      person('anh', 'male', { birth_order: 1 }),
      person('em', 'male', { birth_order: 2 }),
      person('v1', 'female'),
      person('v2', 'female'),
      person('cha', 'male')
    ]
    const e = [
      child('cha', 'anh'),
      child('cha', 'em'),
      marriage('anh', 'v1'),
      marriage('em', 'v2')
    ]
    expect(terms('v1', 'v2', women, e)).toEqual(['Chị em dâu', 'Chị em dâu'])
  })

  test('a relation without a special term is written as husband/wife of', () => {
    // A is married to W; B is the wife of W's grandfather but not her blood
    // relative, so both spouses' terms fall back to "Vợ của ...".
    const p = [
      person('ong', 'male'),
      person('cha', 'male'),
      person('w', 'female'),
      person('a', 'male'),
      person('ke', 'female')
    ]
    const e = [
      child('ong', 'cha'),
      child('cha', 'w'),
      marriage('a', 'w'),
      marriage('ong', 'ke')
    ]
    expect(terms('a', 'ke', p, e)).toEqual(['Vợ của Ông nội', 'Chồng của Cháu'])
  })
})
