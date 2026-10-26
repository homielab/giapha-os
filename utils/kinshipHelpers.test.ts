import { describe, expect, test } from 'bun:test'

import { computeKinship, isAmbiguousTerm, PersonNode } from './kinshipHelpers'

type Edge = { type: string; person_a: string; person_b: string }

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

const child = (parent: string, kid: string): Edge => ({
  type: 'biological_child',
  person_a: parent,
  person_b: kid
})
const marriage = (a: string, b: string): Edge => ({
  type: 'marriage',
  person_a: a,
  person_b: b
})

// One family seen from "anh": paternal side (ông/bà nội, bác, bố, cô and the
// bác's son), maternal side (ông/bà ngoại, mẹ, cậu and the cậu's daughter),
// a younger sister with her husband, a son, and the wife's family (bố vợ,
// chị vợ with her husband, em vợ).
const people = [
  person('ongNoi', 'male'),
  person('baNoi', 'female'),
  person('ongNgoai', 'male'),
  person('baNgoai', 'female'),
  person('bac', 'male', { birth_order: 1 }),
  person('bo', 'male', { birth_order: 2 }),
  person('co', 'female', { birth_order: 3 }),
  person('me', 'female', { birth_order: 1 }),
  person('cau', 'male', { birth_order: 2 }),
  person('anhHo', 'male'),
  person('conCau', 'female'),
  person('anh', 'male', { birth_order: 1 }),
  person('emGai', 'female', { birth_order: 2 }),
  person('emRe', 'male'),
  person('chiVo', 'female', { birth_order: 1 }),
  person('vo', 'female', { birth_order: 2 }),
  person('emVo', 'female', { birth_order: 3 }),
  person('chongChiVo', 'male'),
  person('boVo', 'male'),
  person('chau', 'male'),
  person('nguoiLa', 'male')
]

const edges: Edge[] = [
  marriage('ongNoi', 'baNoi'),
  marriage('ongNgoai', 'baNgoai'),
  child('ongNoi', 'bac'),
  child('baNoi', 'bac'),
  child('ongNoi', 'bo'),
  child('baNoi', 'bo'),
  child('ongNoi', 'co'),
  child('baNoi', 'co'),
  child('ongNgoai', 'me'),
  child('baNgoai', 'me'),
  child('ongNgoai', 'cau'),
  child('baNgoai', 'cau'),
  marriage('bo', 'me'),
  child('bac', 'anhHo'),
  child('cau', 'conCau'),
  child('bo', 'anh'),
  child('me', 'anh'),
  child('bo', 'emGai'),
  child('me', 'emGai'),
  marriage('emGai', 'emRe'),
  child('anh', 'chau'),
  marriage('anh', 'vo'),
  child('boVo', 'vo'),
  child('boVo', 'emVo'),
  child('boVo', 'chiVo'),
  marriage('chiVo', 'chongChiVo')
]

const byId = new Map(people.map((p) => [p.id, p]))

function kin(a: string, b: string) {
  return computeKinship(byId.get(a)!, byId.get(b)!, people, edges)
}

describe('computeKinship', () => {
  test('returns null for the same person', () => {
    expect(kin('anh', 'anh')).toBeNull()
  })

  test('parent and child', () => {
    const r = kin('anh', 'bo')!
    expect(r.aCallsB).toBe('Bố')
    expect(r.bCallsA).toBe('Con')
    expect(r.distance).toBe(1)
    expect(kin('anh', 'me')!.aCallsB).toBe('Mẹ')
  })

  test('paternal grandparents (ông nội, bà nội)', () => {
    const r = kin('anh', 'ongNoi')!
    expect(r.aCallsB).toBe('Ông nội')
    expect(r.bCallsA).toBe('Cháu')
    expect(kin('anh', 'baNoi')!.aCallsB).toBe('Bà nội')
  })

  test('maternal grandparents (ông ngoại, bà ngoại)', () => {
    expect(kin('anh', 'ongNgoai')!.aCallsB).toBe('Ông ngoại')
    expect(kin('anh', 'baNgoai')!.aCallsB).toBe('Bà ngoại')
  })

  test('great-grandparent is Cụ ông nội', () => {
    const r = kin('chau', 'ongNoi')!
    expect(r.aCallsB).toBe('Cụ ông (ông cố) nội')
    expect(r.bCallsA).toBe('Chắt')
  })

  test('siblings use birth order', () => {
    const r = kin('anh', 'emGai')!
    expect(r.aCallsB).toBe('Em gái')
    expect(r.bCallsA).toBe('Anh trai')
    expect(r.description).toContain('Anh chị em ruột')
  })

  test("father's older brother is Bác, younger sister is Cô", () => {
    expect(kin('anh', 'bac')!.aCallsB).toBe('Bác')
    expect(kin('anh', 'co')!.aCallsB).toBe('Cô')
    expect(kin('anh', 'co')!.bCallsA).toBe('Cháu')
  })

  test("mother's brother is Cậu", () => {
    const r = kin('anh', 'cau')!
    expect(r.aCallsB).toBe('Cậu')
    expect(r.description).toContain('Bên Ngoại')
  })

  test('paternal cousins: anh họ / em họ by branch seniority', () => {
    const r = kin('anh', 'anhHo')!
    expect(r.aCallsB).toBe('Anh họ')
    expect(r.bCallsA).toBe('Em họ')
    expect(r.description).toContain('Anh em họ Nội')
  })

  test('maternal cousin is on the Ngoại side', () => {
    expect(kin('anh', 'conCau')!.description).toContain('Anh em họ Ngoại')
  })

  test('grandchild through a daughter calls grandfather ông ngoại', () => {
    const people2 = [
      person('ong', 'male'),
      person('conGai', 'female'),
      person('chauNgoai', 'male')
    ]
    const edges2 = [child('ong', 'conGai'), child('conGai', 'chauNgoai')]
    const r = computeKinship(people2[2], people2[0], people2, edges2)!
    expect(r.aCallsB).toBe('Ông ngoại')
    expect(r.bCallsA).toBe('Cháu')
  })

  test('husband and wife', () => {
    const r = kin('anh', 'vo')!
    expect(r.aCallsB).toBe('Vợ')
    expect(r.bCallsA).toBe('Chồng')
    expect(r.distance).toBe(0)
  })

  test("wife's father is Bố vợ, and he calls A Con rể", () => {
    const r = kin('anh', 'boVo')!
    expect(r.aCallsB).toBe('Bố vợ')
    expect(r.bCallsA).toBe('Con rể')
  })

  test("wife's younger sister is Em vợ (single spaces)", () => {
    const r = kin('anh', 'emVo')!
    expect(r.aCallsB).toBe('Em vợ')
    expect(r.bCallsA).toBe('Anh rể')
  })

  test("sister's husband is Em rể, not a cousin-in-law", () => {
    const r = kin('anh', 'emRe')!
    expect(r.aCallsB).toBe('Em rể')
    expect(r.bCallsA).toBe('Anh vợ')
  })

  test('cousin-in-law labels have no double spaces', () => {
    const p = [
      person('g', 'male'),
      person('s1', 'male', { birth_order: 1 }),
      person('s2', 'male', { birth_order: 2 }),
      person('older', 'male'),
      person('younger', 'female'),
      person('husband', 'male')
    ]
    const e = [
      child('g', 's1'),
      child('g', 's2'),
      child('s1', 'older'),
      child('s2', 'younger'),
      marriage('younger', 'husband')
    ]
    const r = computeKinship(p[3], p[5], p, e)!
    expect(r.aCallsB).toBe('Em rể (họ)')
    expect(r.bCallsA).toBe('Anh vợ (họ)')
    expect(r.bCallsA).not.toContain('  ')
  })

  test('husbands of two sisters are Anh em cột chèo', () => {
    const r = kin('anh', 'chongChiVo')!
    expect(r.aCallsB).toBe('Anh em cột chèo')
    expect(r.bCallsA).toBe('Anh em cột chèo')
  })

  test('unrelated people are Chưa xác định', () => {
    const r = kin('anh', 'nguoiLa')!
    expect(r.aCallsB).toBe('Chưa xác định')
    expect(r.distance).toBe(-1)
  })

  test('adopted children count as children', () => {
    const p = [person('p', 'female'), person('c', 'male')]
    const r = computeKinship(p[1], p[0], p, [
      { type: 'adopted_child', person_a: 'p', person_b: 'c' }
    ])!
    expect(r.aCallsB).toBe('Mẹ')
  })

  test('flags ambiguous terms for the disclaimer', () => {
    expect(isAmbiguousTerm('Bố/Mẹ')).toBe(true)
    expect(isAmbiguousTerm('Họ hàng')).toBe(true)
    expect(isAmbiguousTerm('Chồng của Họ hàng')).toBe(true)
    expect(isAmbiguousTerm('Bố')).toBe(false)
    expect(isAmbiguousTerm('Anh em cột chèo')).toBe(false)
    expect(kin('anh', 'bo')!.hasAmbiguousTerm).toBe(false)
    expect(kin('anh', 'nguoiLa')!.hasAmbiguousTerm).toBe(false)
  })
})
