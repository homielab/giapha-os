import { describe, expect, it } from 'bun:test'

import {
  buildPersonSearchIndex,
  matchesPersonSearch,
  normalizeSearchText,
  searchPersons
} from '@/utils/search'

const p = (full_name: string, other_names: string | null = null) => ({
  full_name,
  other_names
})

describe('normalizeSearchText', () => {
  it('strips accents, đ and extra spaces', () => {
    expect(normalizeSearchText('  Nguyễn  Văn Đức ')).toBe('nguyen van duc')
    expect(normalizeSearchText(null)).toBe('')
  })
})

describe('searchPersons', () => {
  const people = [
    p('Trần Văn Đức'),
    p('Nguyễn Văn Đức'),
    p('Lê Nguyễn Văn Đức'),
    p('Phạm Thị Hoa', 'Bé Nguyên'),
    p('Đinh Công')
  ]

  it('finds accented names from unaccented input', () => {
    const r = searchPersons(people, 'nguyen van duc')
    expect(r.map((x) => x.full_name)).toEqual([
      'Nguyễn Văn Đức',
      'Lê Nguyễn Văn Đức'
    ])
  })

  it('ranks prefix, then word start, then contains, then other names', () => {
    const r = searchPersons(people, 'nguyen')
    expect(r.map((x) => x.full_name)).toEqual([
      'Nguyễn Văn Đức',
      'Lê Nguyễn Văn Đức',
      'Phạm Thị Hoa'
    ])
  })

  it('matches đ as d and accented queries', () => {
    expect(searchPersons(people, 'dinh')[0].full_name).toBe('Đinh Công')
    expect(searchPersons(people, 'ĐỨC')).toHaveLength(3)
  })

  it('matches every word anywhere in the name, in any order', () => {
    const list = [p('Nguyễn Văn An'), p('Trần An'), p('An Nguyễn Bình')]
    expect(searchPersons(list, 'nguyen an').map((x) => x.full_name)).toEqual([
      'Nguyễn Văn An',
      'An Nguyễn Bình'
    ])
    expect(searchPersons(list, 'an nguyen')[0].full_name).toBe('An Nguyễn Bình')
    expect(searchPersons(list, 'nguyen xuan')).toEqual([])
  })

  it('matches number words against the birth or death year', () => {
    const list = [
      { full_name: 'Trần Văn Ba', birth_year: 1950 },
      { full_name: 'Trần Thị Tư', birth_year: 1920, death_year: 1950 },
      { full_name: 'Trần Văn Năm', birth_year: 1960 },
      { full_name: 'Lê Văn Sáu', birth_year: 1950 }
    ]
    expect(searchPersons(list, 'tran 1950').map((x) => x.full_name)).toEqual([
      'Trần Văn Ba',
      'Trần Thị Tư'
    ])
    expect(searchPersons(list, '1960').map((x) => x.full_name)).toEqual([
      'Trần Văn Năm'
    ])
  })

  it('returns nothing for an empty query and caps results', () => {
    expect(searchPersons(people, '  ')).toEqual([])
    const many = Array.from({ length: 50 }, (_, i) => p(`Nguyễn ${i}`))
    expect(searchPersons(many, 'nguyen')).toHaveLength(20)
    expect(searchPersons(many, 'nguyen', 5)).toHaveLength(5)
  })
})

describe('matchesPersonSearch', () => {
  const an = buildPersonSearchIndex({
    full_name: 'Nguyễn Văn An',
    other_names: 'Bình',
    birth_year: 1950,
    death_year: 2010
  })
  const match = (q: string) => matchesPersonSearch(an, q)

  it('matches birth or death year', () => {
    expect(match('1950')).toBe(true)
    expect(match('2010')).toBe(true)
    expect(match('1951')).toBe(false)
    expect(match('an 1950')).toBe(true)
  })

  it('does not match across full name and other names', () => {
    expect(match('an binh')).toBe(false)
    expect(match('binh')).toBe(true)
  })

  it('matches name words without accents', () => {
    expect(match('nguyen van')).toBe(true)
    expect(match('Nguyễn  An')).toBe(true)
    expect(match('')).toBe(true)
  })

  it('handles missing years and other names', () => {
    const p = buildPersonSearchIndex({ full_name: 'Lê Thị Hoa' })
    expect(matchesPersonSearch(p, '1950')).toBe(false)
    expect(matchesPersonSearch(p, 'thi hoa')).toBe(true)
  })
})
