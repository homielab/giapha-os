import { describe, expect, it } from 'bun:test'

import { formatLifeYears, rankMembers } from '@/utils/memberSearch'

const m = (
  id: string,
  full_name: string,
  extra: Record<string, unknown> = {}
) => ({ id, full_name, ...extra })

describe('rankMembers', () => {
  const people = [
    m('1', 'Trần Văn Đức'),
    m('2', 'Nguyễn Văn Đức', { birth_year: 1950, death_year: 2020 }),
    m('3', 'Lê Nguyễn Văn Đức', { birth_year: 1980 }),
    m('4', 'Nguyễn Văn An', { birth_year: 1950 })
  ]

  it('finds accented names from an unaccented query, prefix first', () => {
    const ids = rankMembers('nguyen van', people).map((r) => r.member.id)
    expect(ids).toEqual(['4', '2', '3'])
  })

  it('returns life years to tell namesakes apart', () => {
    const r = rankMembers('nguyen van duc', people)
    expect(r.map((x) => x.years)).toEqual(['1950 – 2020', '1980'])
  })

  it('caps the results and ignores an empty query', () => {
    const many = Array.from({ length: 50 }, (_, i) => m(String(i), `An ${i}`))
    expect(rankMembers('an', many)).toHaveLength(20)
    expect(rankMembers('   ', many)).toEqual([])
  })
})

describe('formatLifeYears', () => {
  it('handles missing years', () => {
    expect(formatLifeYears(m('1', 'A'))).toBe('')
    expect(formatLifeYears(m('1', 'A', { death_year: 1999 }))).toBe('– 1999')
    expect(
      formatLifeYears(m('1', 'A', { birth_year: 1900, is_deceased: true }))
    ).toBe('1900 – ?')
  })
})
