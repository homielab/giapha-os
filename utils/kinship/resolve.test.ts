import { describe, expect, test } from 'bun:test'

import { computeKinship } from './resolve'
import { isAmbiguousTerm, type PersonNode, type RelEdge } from './types'

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
      expect([r.aCallsB, r.bCallsA]).toEqual([term, 'Cháu'])
      expect(r.description).toMatchObject({
        kind: 'upperBranch',
        side: 'paternal'
      })
    }
  )

  test('grandmother’s brother is Ông Cậu, on the father’s (paternal) side', () => {
    const r = greatUncle('male', 1, 2, 'female')
    expect([r.aCallsB, r.bCallsA]).toEqual(['Ông Cậu', 'Cháu'])
    expect(r.description).toMatchObject({
      kind: 'upperBranch',
      side: 'paternal'
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
    // W's "Bà Cô" is "Bà Cô" for A too; the husband of her "Cháu" is "Cháu rể".
    const [aCallsB, bCallsA] = terms('A', 'B', persons, rels)
    expect(aCallsB).toBe('Bà Cô')
    expect(bCallsA).toBe('Cháu rể')
  })

  test('the wife of Ông Cậu is Bà Mợ, the husband of Bà Dì is Ông Dượng', () => {
    // A's mother M is the child of GM; GM's siblings are K (male) and D (female).
    const persons = [
      person('G', 'male'),
      person('GM', 'female'),
      person('K', 'male'),
      person('D', 'female'),
      person('M', 'female'),
      person('A', 'male'),
      person('KW', 'female'),
      person('DH', 'male')
    ]
    const rels = [
      child('G', 'GM'),
      child('G', 'K'),
      child('G', 'D'),
      child('GM', 'M'),
      child('M', 'A'),
      marriage('K', 'KW'),
      marriage('DH', 'D')
    ]
    expect(terms('A', 'KW', persons, rels)).toEqual(['Bà Mợ', 'Cháu'])
    expect(terms('KW', 'A', persons, rels)).toEqual(['Cháu', 'Bà Mợ'])
    expect(terms('A', 'DH', persons, rels)).toEqual(['Ông Dượng', 'Cháu'])
    expect(terms('DH', 'A', persons, rels)).toEqual(['Cháu', 'Ông Dượng'])
  })

  test('great-grandchildren of a great-uncle are Cháu, not Chít', () => {
    const persons = [
      person('G', 'male'),
      person('X', 'male', { birth_order: 1 }),
      person('P', 'male'),
      person('Q', 'male'),
      person('A', 'male'),
      person('B', 'male', { birth_order: 2 })
    ]
    const rels = [
      child('G', 'X'),
      child('X', 'P'),
      child('P', 'Q'),
      child('Q', 'A'),
      child('G', 'B')
    ]
    expect(terms('A', 'B', persons, rels)).toEqual(['Cụ ông Chú', 'Cháu'])
  })
})

describe('spouses of descendants', () => {
  test('great-grandchildren and later generations get dâu/rể', () => {
    const persons = [
      person('A', 'male'),
      person('B', 'male'),
      person('C', 'female'),
      person('D', 'male'),
      person('W', 'female'),
      person('E', 'female'),
      person('H', 'male'),
      person('F', 'male'),
      person('V', 'female')
    ]
    const rels = [
      child('A', 'B'),
      child('B', 'C'),
      child('C', 'D'),
      marriage('D', 'W'),
      child('C', 'E'),
      marriage('E', 'H'),
      child('D', 'F'),
      marriage('F', 'V')
    ]
    expect(terms('A', 'W', persons, rels)[0]).toBe('Chắt dâu')
    expect(terms('A', 'H', persons, rels)[0]).toBe('Chắt rể')
    expect(terms('A', 'V', persons, rels)[0]).toBe('Chít dâu')
    // Through a daughter (bên ngoại): C's son D is a grandchild of B.
    expect(terms('B', 'W', persons, rels)[0]).toBe('Cháu dâu')
  })

  test("the spouse of a cousin's child is Cháu dâu (họ)", () => {
    const persons = [
      person('G', 'male'),
      person('X', 'male', { birth_order: 1 }),
      person('Y', 'male', { birth_order: 2 }),
      person('P', 'male'),
      person('Z', 'male'),
      person('K', 'male'),
      person('W', 'female')
    ]
    const rels = [
      child('G', 'X'),
      child('G', 'Y'),
      child('X', 'P'),
      child('Y', 'Z'),
      child('Z', 'K'),
      marriage('K', 'W')
    ]
    expect(terms('P', 'K', persons, rels)[0]).toBe('Cháu họ')
    expect(terms('P', 'W', persons, rels)[0]).toBe('Cháu dâu (họ)')
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

  test('both spouses are blood relatives: in-law terms instead of "Vợ của"', () => {
    const persons = [
      person('ong', 'male'),
      person('me', 'female', { birth_order: 1 }),
      person('cau', 'male', { birth_order: 2 }),
      person('mo', 'female'),
      person('chong', 'male', { birth_order: 1 }),
      person('vo', 'female'),
      person('ongNoi', 'male'),
      person('cha', 'male', { birth_order: 1 }),
      person('chu', 'male', { birth_order: 2 }),
      person('thim', 'female'),
      person('emGai', 'female', { birth_order: 2 }),
      person('reCuaEm', 'male')
    ]
    const rels = [
      child('ong', 'me'),
      child('ong', 'cau'),
      child('ongNoi', 'cha'),
      child('ongNoi', 'chu'),
      child('me', 'chong'),
      child('cha', 'chong'),
      child('me', 'emGai'),
      child('cha', 'emGai'),
      marriage('cau', 'mo'),
      marriage('chong', 'vo'),
      marriage('chu', 'thim'),
      marriage('reCuaEm', 'emGai')
    ]
    expect(terms('vo', 'mo', persons, rels)).toEqual(['Mợ', 'Cháu dâu'])
    expect(terms('vo', 'thim', persons, rels)).toEqual(['Thím', 'Cháu dâu'])
    expect(terms('mo', 'vo', persons, rels)).toEqual(['Cháu dâu', 'Mợ'])
    expect(terms('vo', 'reCuaEm', persons, rels)).toEqual(['Em rể', 'Chị dâu'])
  })

  test('a relation without a special term is written as husband/wife of', () => {
    // A is married to W; B is the second wife of W's grandfather (his son
    // has his mother recorded), so both spouses' terms fall back to "Vợ của ...".
    const p = [
      person('ong', 'male'),
      person('ba', 'female'),
      person('cha', 'male'),
      person('w', 'female'),
      person('a', 'male'),
      person('ke', 'female')
    ]
    const e = [
      child('ong', 'cha'),
      child('ba', 'cha'),
      child('cha', 'w'),
      marriage('a', 'w'),
      marriage('ong', 'ba'),
      marriage('ong', 'ke')
    ]
    expect(terms('a', 'ke', p, e)).toEqual(['Vợ của Ông nội', 'Cháu rể'])
    expect(terms('w', 'ke', p, e)).toEqual(['Vợ của Ông nội', 'Cháu'])
  })
})

describe('the spouse of an ancestor not linked as parent', () => {
  // Old trees link a child to the father only: the grandfather's wife is
  // not recorded as the father's mother.
  const p = [
    person('ong', 'male'),
    person('ba', 'female'),
    person('cha', 'male'),
    person('me', 'female'),
    person('toi', 'male'),
    person('vo', 'female')
  ]
  const e = [
    child('ong', 'cha'),
    marriage('ong', 'ba'),
    child('cha', 'toi'),
    child('me', 'toi'),
    marriage('toi', 'vo')
  ]
  function kinship(a: string, b: string, persons = p, rels = e) {
    const find = (id: string) => persons.find((x) => x.id === id)!
    return computeKinship(find(a), find(b), persons, rels)!
  }

  test('the grandfather’s wife is Bà nội, marked as a guess', () => {
    const r = kinship('toi', 'ba')
    expect([r.aCallsB, r.bCallsA]).toEqual(['Bà nội', 'Cháu'])
    expect(r.hasAmbiguousTerm).toBe(true)
    expect(r.description).toEqual({
      kind: 'spouseOfAncestor',
      ancestor: 'ong',
      spouse: 'ba',
      role: 'wife',
      child: { id: 'cha', name: 'cha' }
    })
    const back = kinship('ba', 'toi')
    expect([back.aCallsB, back.bCallsA]).toEqual(['Cháu', 'Bà nội'])
    expect(back.hasAmbiguousTerm).toBe(true)
    expect(back.description.kind).toBe('spouseOfAncestor')
  })

  test('the grandson’s wife calls her Bà nội too', () => {
    const r = kinship('vo', 'ba')
    expect([r.aCallsB, r.bCallsA]).toEqual(['Bà nội', 'Cháu dâu'])
    expect(r.description.kind).toBe('spouseOfAncestor')
    expect(terms('ba', 'vo', p, e)).toEqual(['Cháu dâu', 'Bà nội'])
  })

  test('the maternal side and the husband of a grandmother', () => {
    const persons = [
      person('ba', 'female'),
      person('ong', 'male'),
      person('me', 'female'),
      person('toi', 'female')
    ]
    const rels = [child('ba', 'me'), marriage('ba', 'ong'), child('me', 'toi')]
    const r = kinship('toi', 'ong', persons, rels)
    expect([r.aCallsB, r.bCallsA]).toEqual(['Ông ngoại', 'Cháu'])
    expect(r.description).toMatchObject({
      role: 'husband',
      child: { id: 'me' }
    })
  })

  test('great-grandparents and older ones get the direct term', () => {
    const persons = [
      person('ky', 'male'),
      person('kyBa', 'female'),
      person('cu', 'male'),
      person('cuBa', 'female'),
      person('ong', 'male'),
      person('cha', 'male'),
      person('toi', 'male')
    ]
    const rels = [
      child('ky', 'cu'),
      marriage('ky', 'kyBa'),
      child('cu', 'ong'),
      marriage('cu', 'cuBa'),
      child('ong', 'cha'),
      child('cha', 'toi')
    ]
    expect(terms('toi', 'cuBa', persons, rels)).toEqual([
      'Cụ bà (bà cố) nội',
      'Chắt'
    ])
    expect(terms('toi', 'kyBa', persons, rels)).toEqual(['Kỵ', 'Chít'])
  })

  test('the father’s wife is still Mẹ kế', () => {
    const persons = [
      person('cha', 'male'),
      person('ke', 'female'),
      person('toi', 'male')
    ]
    const rels = [child('cha', 'toi'), marriage('cha', 'ke')]
    expect(terms('toi', 'ke', persons, rels)).toEqual([
      'Mẹ kế',
      'Con riêng của chồng'
    ])
  })

  test('the grandfather’s wife of gender other gets both forms', () => {
    const persons = p.map((x) => (x.id === 'ba' ? person('ba', 'other') : x))
    expect(terms('toi', 'ba', persons, e)).toEqual(['Ông/Bà nội', 'Cháu'])
  })
})

describe('step-parents and stepchildren', () => {
  function kinship(a: string, b: string, p: PersonNode[], e: RelEdge[]) {
    const find = (id: string) => p.find((x) => x.id === id)!
    return computeKinship(find(a), find(b), p, e)!
  }

  test('the father’s second wife is Mẹ kế; she calls him Con riêng của chồng', () => {
    const p = [
      person('bo', 'male'),
      person('me', 'female'),
      person('toi', 'male'),
      person('ke', 'female')
    ]
    const e = [
      child('bo', 'toi'),
      child('me', 'toi'),
      marriage('bo', 'me'),
      marriage('bo', 'ke')
    ]
    const r = kinship('toi', 'ke', p, e)
    expect([r.aCallsB, r.bCallsA]).toEqual(['Mẹ kế', 'Con riêng của chồng'])
    expect(r.description).toEqual({ kind: 'stepParent', name: 'bo' })
    const back = kinship('ke', 'toi', p, e)
    expect([back.aCallsB, back.bCallsA]).toEqual([
      'Con riêng của chồng',
      'Mẹ kế'
    ])
    expect(back.description).toEqual({ kind: 'stepChild', name: 'bo' })
    // The mother is still Mẹ.
    expect(terms('toi', 'me', p, e)).toEqual(['Mẹ', 'Con'])
  })

  test('the mother’s new husband is Bố dượng; he calls her child Con riêng của vợ', () => {
    const p = [
      person('chongCu', 'male'),
      person('me', 'female'),
      person('kid', 'female'),
      person('husb', 'male')
    ]
    const e = [
      child('chongCu', 'kid'),
      child('me', 'kid'),
      marriage('me', 'husb')
    ]
    const r = kinship('husb', 'kid', p, e)
    expect([r.aCallsB, r.bCallsA]).toEqual(['Con riêng của vợ', 'Bố dượng'])
    expect(r.description).toEqual({ kind: 'stepChild', name: 'me' })
    const back = kinship('kid', 'husb', p, e)
    expect([back.aCallsB, back.bCallsA]).toEqual([
      'Bố dượng',
      'Con riêng của vợ'
    ])
    expect(back.description).toEqual({ kind: 'stepParent', name: 'me' })
  })

  test('a child of both spouses stays Con / Bố', () => {
    const p = [
      person('bo', 'male'),
      person('me', 'female'),
      person('con', 'male')
    ]
    const e = [child('bo', 'con'), child('me', 'con'), marriage('bo', 'me')]
    expect(terms('bo', 'con', p, e)).toEqual(['Con', 'Bố'])
  })

  test('parents-in-law are unchanged', () => {
    const p = [
      person('boVo', 'male'),
      person('meChong', 'female'),
      person('vo', 'female'),
      person('chong', 'male'),
      person('anhVo', 'male', { birth_order: 1 })
    ]
    const e = [
      child('boVo', 'vo'),
      child('boVo', 'anhVo'),
      child('meChong', 'chong'),
      marriage('chong', 'vo')
    ]
    p[2].birth_order = 2
    const r = kinship('chong', 'boVo', p, e)
    expect([r.aCallsB, r.bCallsA]).toEqual(['Bố vợ', 'Con rể'])
    expect(r.description.kind).toBe('viaSpouse')
    expect(terms('boVo', 'chong', p, e)).toEqual(['Con rể', 'Bố vợ'])
    expect(terms('vo', 'meChong', p, e)).toEqual(['Mẹ chồng', 'Con dâu'])
    expect(terms('meChong', 'vo', p, e)).toEqual(['Con dâu', 'Mẹ chồng'])
    expect(terms('chong', 'anhVo', p, e)).toEqual(['Anh vợ', 'Em rể'])
  })
})

describe('parents of a married couple are thông gia', () => {
  // me + meChong → son; dauDad + dauMom → dau; son married dau.
  const p = [
    person('me', 'male'),
    person('meChong', 'female'),
    person('son', 'male'),
    person('dau', 'female'),
    person('dauDad', 'male'),
    person('dauMom', 'female'),
    person('stranger', 'male')
  ]
  const e = [
    child('me', 'son'),
    child('meChong', 'son'),
    marriage('me', 'meChong'),
    child('dauDad', 'dau'),
    child('dauMom', 'dau'),
    marriage('dauDad', 'dauMom'),
    marriage('son', 'dau')
  ]
  const kinship = (a: string, b: string) => {
    const find = (id: string) => p.find((x) => x.id === id)!
    return computeKinship(find(a), find(b), p, e)!
  }

  test('father and father: Ông thông gia both ways, with path', () => {
    const r = kinship('me', 'dauDad')
    expect([r.aCallsB, r.bCallsA]).toEqual(['Ông thông gia', 'Ông thông gia'])
    expect(r.description).toEqual({
      kind: 'coParentsInLaw',
      childA: 'son',
      childB: 'dau'
    })
    expect(r.pathLabels).toEqual([
      { kind: 'childOf', name: 'son', parent: 'me' },
      { kind: 'spouses', nameA: 'son', nameB: 'dau' },
      { kind: 'childOf', name: 'dau', parent: 'dauDad' }
    ])
    expect(r.hasAmbiguousTerm).toBe(false)
    const back = kinship('dauDad', 'me')
    expect([back.aCallsB, back.bCallsA]).toEqual([
      'Ông thông gia',
      'Ông thông gia'
    ])
    expect(back.description).toEqual({
      kind: 'coParentsInLaw',
      childA: 'dau',
      childB: 'son'
    })
  })

  test('father and mother: Bà thông gia / Ông thông gia', () => {
    expect(terms('me', 'dauMom', p, e)).toEqual([
      'Bà thông gia',
      'Ông thông gia'
    ])
    expect(terms('dauMom', 'me', p, e)).toEqual([
      'Ông thông gia',
      'Bà thông gia'
    ])
  })

  test('mother and mother: Bà thông gia both ways', () => {
    expect(terms('meChong', 'dauMom', p, e)).toEqual([
      'Bà thông gia',
      'Bà thông gia'
    ])
  })

  test('only one parent of the couple recorded is enough', () => {
    const p2 = [
      person('a', 'female'),
      person('x', 'male'),
      person('y', 'female'),
      person('b', 'other')
    ]
    const e2 = [child('a', 'x'), child('b', 'y'), marriage('x', 'y')]
    expect(terms('a', 'b', p2, e2)).toEqual([
      'Ông/Bà thông gia',
      'Bà thông gia'
    ])
  })

  test('an unrelated person is still unknown', () => {
    const r = kinship('me', 'stranger')
    expect(r.description).toEqual({ kind: 'none' })
    expect([r.aCallsB, r.bCallsA]).toEqual(['', ''])
  })

  test('the couple and their in-laws keep their terms', () => {
    expect(terms('me', 'dau', p, e)).toEqual(['Con dâu', 'Bố chồng'])
    expect(terms('son', 'dauDad', p, e)).toEqual(['Bố vợ', 'Con rể'])
  })
})

describe('the spouse’s aunts and grandparents are called as the spouse calls them', () => {
  const persons = [
    person('ongNoi', 'male'),
    person('bo', 'male', { birth_order: 1 }),
    person('co', 'female', { birth_order: 2 }),
    person('ongNgoai', 'male'),
    person('me', 'female', { birth_order: 1 }),
    person('di', 'female', { birth_order: 2 }),
    person('vo', 'female'),
    person('chong', 'male')
  ]
  const rels = [
    child('ongNoi', 'bo'),
    child('ongNoi', 'co'),
    child('ongNgoai', 'me'),
    child('ongNgoai', 'di'),
    child('bo', 'vo'),
    child('me', 'vo'),
    marriage('chong', 'vo')
  ]

  test.each([
    ['co', 'Cô', 'Cháu rể'],
    ['di', 'Dì', 'Cháu rể'],
    ['ongNoi', 'Ông nội', 'Cháu rể'],
    ['ongNgoai', 'Ông ngoại', 'Cháu rể']
  ])('%s', (b, aCallsB, bCallsA) => {
    expect(terms('chong', b, persons, rels)).toEqual([aCallsB, bCallsA])
    expect(terms(b, 'chong', persons, rels)).toEqual([bCallsA, aCallsB])
  })
})

describe('relations through marriage when the relative age is unknown', () => {
  const persons = [
    person('cha', 'male'),
    person('lan', 'female'),
    person('minh', 'male'),
    person('a', 'male')
  ]
  const rels = [child('cha', 'lan'), child('cha', 'minh'), marriage('a', 'lan')]

  test("the wife's brother is Anh/Em vợ and calls A Anh/Em rể", () => {
    const find = (id: string) => persons.find((p) => p.id === id)!
    const ab = computeKinship(find('a'), find('minh'), persons, rels)
    expect([ab?.aCallsB, ab?.bCallsA]).toEqual(['Anh/Em vợ', 'Anh/Em rể'])
    expect(ab?.description.uncertain).toBe(true)
    const ba = computeKinship(find('minh'), find('a'), persons, rels)
    expect([ba?.aCallsB, ba?.bCallsA]).toEqual(['Anh/Em rể', 'Anh/Em vợ'])
    expect(ba?.description.uncertain).toBe(true)
  })

  test("the wife's uncle is Bác/Chú, without vợ", () => {
    const p = [
      person('ong', 'male'),
      person('chu', 'male'),
      person('bo', 'male'),
      person('lan', 'female'),
      person('a', 'male')
    ]
    const e = [
      child('ong', 'chu'),
      child('ong', 'bo'),
      child('bo', 'lan'),
      marriage('a', 'lan')
    ]
    expect(terms('a', 'chu', p, e)).toEqual(['Bác/Chú', 'Cháu rể'])
  })
})

describe('spouses of uncles and aunts', () => {
  const persons = [
    person('ong', 'male'),
    person('bacTrai', 'male', { birth_order: 1 }),
    person('bo', 'male', { birth_order: 2 }),
    person('chu', 'male', { birth_order: 4 }),
    person('bacGai', 'female', { birth_order: 1 }),
    person('co', 'female', { birth_order: 3 }),
    person('vb', 'female', { is_in_law: true }),
    person('vc', 'female', { is_in_law: true }),
    person('cbg', 'male', { is_in_law: true }),
    person('cc', 'male', { is_in_law: true }),
    person('me', 'female', { is_in_law: true }),
    person('ongNgoai', 'male'),
    person('cau', 'male', { birth_order: 1 }),
    person('di', 'female', { birth_order: 3 }),
    person('vcau', 'female', { is_in_law: true }),
    person('cdi', 'male', { is_in_law: true }),
    person('chau', 'male')
  ]
  const rels = [
    child('ong', 'bacTrai'),
    child('ong', 'bacGai'),
    child('ong', 'bo'),
    child('ong', 'co'),
    child('ong', 'chu'),
    child('ongNgoai', 'cau'),
    child('ongNgoai', 'me'),
    child('ongNgoai', 'di'),
    child('bo', 'chau'),
    child('me', 'chau'),
    marriage('bo', 'me'),
    marriage('bacTrai', 'vb'),
    marriage('chu', 'vc'),
    marriage('cbg', 'bacGai'),
    marriage('cc', 'co'),
    marriage('cau', 'vcau'),
    marriage('cdi', 'di')
  ]

  test.each([
    ['vc', 'Thím'],
    ['vcau', 'Mợ'],
    ['cc', 'Dượng'],
    ['cdi', 'Dượng'],
    ['vb', 'Bác gái'],
    ['cbg', 'Bác']
  ])('the nephew calls %s "%s" and is called Cháu', (id, term) => {
    expect(terms('chau', id, persons, rels)).toEqual([term, 'Cháu'])
    expect(terms(id, 'chau', persons, rels)).toEqual(['Cháu', term])
  })
})

describe('paternal or maternal side follows the younger person’s own parent', () => {
  // cụ → ông/bà → bố/mẹ → B
  function line(
    g1: PersonNode['gender'],
    g2: PersonNode['gender'],
    g3: PersonNode['gender']
  ) {
    const persons = [
      person('C', g1),
      person('O', g2),
      person('M', g3),
      person('B', 'male')
    ]
    const rels = [child('C', 'O'), child('O', 'M'), child('M', 'B')]
    return { persons, rels }
  }

  test('father of the maternal grandfather is ngoại, both directions', () => {
    const { persons, rels } = line('male', 'male', 'female')
    expect(terms('B', 'C', persons, rels)[0]).toBe('Cụ ông (ông cố) ngoại')
    expect(terms('C', 'B', persons, rels)[1]).toBe('Cụ ông (ông cố) ngoại')
  })

  test('mother of the paternal grandfather is nội, both directions', () => {
    const { persons, rels } = line('female', 'male', 'male')
    expect(terms('B', 'C', persons, rels)[0]).toBe('Cụ bà (bà cố) nội')
    expect(terms('C', 'B', persons, rels)[1]).toBe('Cụ bà (bà cố) nội')
  })

  test('great-uncle through the mother is on the maternal side', () => {
    const persons = [
      person('G', 'male'),
      person('X', 'male', { birth_order: 1 }),
      person('M', 'female'),
      person('A', 'male'),
      person('U', 'male', { birth_order: 2 })
    ]
    const rels = [
      child('G', 'X'),
      child('X', 'M'),
      child('M', 'A'),
      child('G', 'U')
    ]
    const r = computeKinship(persons[3], persons[4], persons, rels)!
    expect(r.description).toMatchObject({
      kind: 'upperBranch',
      side: 'maternal'
    })
  })
})

describe('step-siblings and co-spouses', () => {
  function kinship(a: string, b: string, p: PersonNode[], e: RelEdge[]) {
    const find = (id: string) => p.find((x) => x.id === id)!
    return computeKinship(find(a), find(b), p, e)!
  }

  // M has a; F2 has b; M and F2 marry.
  const blended = (yearA: number | null, yearB: number | null) => ({
    p: [
      person('M', 'male'),
      person('F1', 'female'),
      person('F2', 'female'),
      person('M2', 'male'),
      person('a', 'male', { birth_year: yearA }),
      person('b', 'female', { birth_year: yearB })
    ],
    e: [
      child('M', 'a'),
      child('F1', 'a'),
      child('F2', 'b'),
      child('M2', 'b'),
      marriage('M', 'F1'),
      marriage('M', 'F2')
    ]
  })

  test('children of a step-parent are anh/chị/em kế both ways', () => {
    const { p, e } = blended(1990, 1985)
    const r = kinship('a', 'b', p, e)
    expect([r.aCallsB, r.bCallsA]).toEqual(['Chị kế', 'Em kế'])
    expect(r.description).toEqual({
      kind: 'stepSiblings',
      parent: 'M',
      stepParent: 'F2'
    })
    const back = kinship('b', 'a', p, e)
    expect([back.aCallsB, back.bCallsA]).toEqual(['Em kế', 'Chị kế'])
    expect(back.description).toEqual({
      kind: 'stepSiblings',
      parent: 'F2',
      stepParent: 'M'
    })
  })

  test('no birth year gives both terms', () => {
    const { p, e } = blended(null, null)
    expect(terms('a', 'b', p, e)).toEqual(['Chị/Em kế', 'Anh/Em kế'])
  })

  test('half-siblings with one shared father stay siblings', () => {
    const p = [
      person('M', 'male'),
      person('F1', 'female'),
      person('F2', 'female'),
      person('a', 'male', { birth_year: 1980 }),
      person('b', 'male', { birth_year: 1990 })
    ]
    const e = [
      child('M', 'a'),
      child('F1', 'a'),
      child('M', 'b'),
      child('F2', 'b'),
      marriage('M', 'F1'),
      marriage('M', 'F2')
    ]
    const r = kinship('a', 'b', p, e)
    expect(r.description.kind).toBe('siblings')
    expect(r.aCallsB).toBe('Em trai')
  })

  test('two wives of one husband get a description, no term', () => {
    const p = [
      person('H', 'male'),
      person('w1', 'female'),
      person('w2', 'female')
    ]
    const e = [marriage('H', 'w1'), marriage('H', 'w2')]
    const r = kinship('w1', 'w2', p, e)
    expect([r.aCallsB, r.bCallsA]).toEqual(['', ''])
    expect(r.description).toEqual({
      kind: 'coSpouses',
      name: 'H',
      role: 'wives'
    })
    expect(kinship('w2', 'w1', p, e).description.kind).toBe('coSpouses')
  })

  test('two husbands of one wife', () => {
    const p = [
      person('W', 'female'),
      person('h1', 'male'),
      person('h2', 'male')
    ]
    const e = [marriage('W', 'h1'), marriage('W', 'h2')]
    expect(kinship('h1', 'h2', p, e).description).toEqual({
      kind: 'coSpouses',
      name: 'W',
      role: 'husbands'
    })
  })
})

describe("gender 'other' gives the neutral terms", () => {
  const persons = [
    person('ong', 'male'),
    person('ba', 'female'),
    person('bo', 'male', { birth_year: 1960 }),
    person('khac', 'other', { birth_year: 1965 }),
    person('me', 'female'),
    person('con', 'male', { birth_year: 1990 }),
    person('vo', 'female'),
    person('chau', 'other', { birth_year: 1988 }),
    person('dau', 'other'),
    person('anhRe', 'male'),
    person('kid', 'female')
  ]
  const rels = [
    child('ong', 'bo'),
    child('ba', 'bo'),
    child('ong', 'khac'),
    child('ba', 'khac'),
    marriage('bo', 'me'),
    child('bo', 'con'),
    child('me', 'con'),
    child('bo', 'chau'),
    child('me', 'chau'),
    marriage('khac', 'vo'),
    marriage('con', 'dau'),
    marriage('chau', 'anhRe'),
    child('khac', 'kid'),
    child('vo', 'kid')
  ]
  const kin = (a: string, b: string) => {
    const find = (id: string) => persons.find((p) => p.id === id)!
    return computeKinship(find(a), find(b), persons, rels)!
  }
  const expectNeutral = (
    a: string,
    b: string,
    aCallsB: string,
    bCallsA: string
  ) => {
    const r = kin(a, b)
    expect([r.aCallsB, r.bCallsA]).toEqual([aCallsB, bCallsA])
    expect(isAmbiguousTerm(r.aCallsB) || isAmbiguousTerm(r.bCallsA)).toBe(true)
    expect(r.hasNeutralGender).toBe(true)
    return r
  }

  test('husband or wife: Vợ/Chồng', () => {
    const r = expectNeutral('vo', 'khac', 'Vợ/Chồng', 'Vợ')
    expect(r.pathLabels).toEqual([
      { kind: 'spouses', nameA: 'vo', nameB: 'khac' }
    ])
    expect(kin('vo', 'khac').hasAmbiguousTerm).toBe(true)
  })

  test('father or mother: Bố/Mẹ', () => {
    expectNeutral('kid', 'khac', 'Bố/Mẹ', 'Con')
    expect(kin('kid', 'vo').aCallsB).toBe('Mẹ')
  })

  test('brother or sister: Anh/Chị; a younger one is Em', () => {
    expectNeutral('con', 'chau', 'Anh/Chị', 'Em trai')
    // "Em" is already the same for both genders.
    expect([kin('bo', 'khac').aCallsB, kin('bo', 'khac').bCallsA]).toEqual([
      'Em',
      'Anh trai'
    ])
    const twins = [
      person('t1', 'other'),
      person('t2', 'male'),
      person('pa', 'male')
    ]
    const e = [child('pa', 't1'), child('pa', 't2')]
    const r = computeKinship(twins[1], twins[0], twins, e)!
    expect(r.aCallsB).toBe('Anh/Chị/Em')
    expect(r.hasAmbiguousTerm).toBe(true)
  })

  test('the spouse of a relative of gender other and the in-law of gender other: dâu/rể', () => {
    expectNeutral('bo', 'dau', 'Con dâu/Con rể', 'Bố chồng')
    // The relative of gender other: the spouse's own gender decides.
    expect([kin('con', 'anhRe').aCallsB, kin('con', 'anhRe').bCallsA]).toEqual([
      'Anh rể',
      'Em vợ'
    ])
    expectNeutral('chau', 'dau', 'Em dâu/Em rể', 'Anh/Chị chồng')
    expect(kin('dau', 'bo').pathLabels[0]).toEqual({
      kind: 'spouseOf',
      name: 'dau',
      spouse: 'con',
      spouseRole: 'spouse'
    })
  })

  test('grandparents: Ông/Bà, and the uncle or aunt Chú/Cô', () => {
    expectNeutral('con', 'khac', 'Chú/Cô', 'Cháu')
    expect(kin('con', 'vo').aCallsB).toBe('Thím')
    const p = [person('g', 'other'), person('f', 'male'), person('k', 'male')]
    const e = [child('g', 'f'), child('f', 'k')]
    const r = computeKinship(p[2], p[0], p, e)!
    expect([r.aCallsB, r.bCallsA]).toEqual(['Ông/Bà nội', 'Cháu'])
    expect(r.hasAmbiguousTerm && r.hasNeutralGender).toBe(true)
  })

  test('a parent of gender other: Nội or Ngoại is not known', () => {
    const p = [
      person('g', 'male'),
      person('gm', 'female'),
      person('p', 'other', { birth_year: 1960 }),
      person('u', 'male', { birth_year: 1955 }),
      person('k', 'female')
    ]
    const e = [
      child('g', 'p'),
      child('gm', 'p'),
      child('g', 'u'),
      child('gm', 'u'),
      child('p', 'k')
    ]
    const find = (id: string) => p.find((x) => x.id === id)!
    const grand = computeKinship(find('k'), find('g'), p, e)!
    expect(grand.aCallsB).toBe('Ông nội/ngoại')
    expect(computeKinship(find('k'), find('p'), p, e)!.aCallsB).toBe('Bố/Mẹ')
    const uncle = computeKinship(find('k'), find('u'), p, e)!
    expect(uncle.aCallsB).toBe('Bác/Cậu')
    expect(uncle.description).toMatchObject({
      kind: 'upperBranch',
      side: 'unknown'
    })
  })

  test('the path and co-spouses name a spouse of gender other', () => {
    const p = [
      person('x', 'other'),
      person('w1', 'female'),
      person('w2', 'female')
    ]
    const e = [marriage('x', 'w1'), marriage('x', 'w2')]
    const find = (id: string) => p.find((y) => y.id === id)!
    const r = computeKinship(find('w1'), find('w2'), p, e)!
    expect(r.description).toEqual({
      kind: 'coSpouses',
      name: 'x',
      role: 'spouses'
    })
    expect(r.pathLabels[0]).toMatchObject({ spouseRole: 'wife' })
    expect(computeKinship(find('w1'), find('x'), p, e)!.pathLabels).toEqual([
      { kind: 'spouses', nameA: 'w1', nameB: 'x' }
    ])
  })

  test('male and female terms do not change', () => {
    expect([kin('con', 'bo').aCallsB, kin('con', 'me').aCallsB]).toEqual([
      'Bố',
      'Mẹ'
    ])
    expect(kin('con', 'bo').hasNeutralGender).toBe(false)
  })
})
