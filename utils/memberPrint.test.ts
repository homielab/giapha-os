import { describe, expect, test } from 'bun:test'

import { memberPrintTitle } from './memberPrint'

const p = (birth_year: number | null, death_year: number | null) => ({
  full_name: 'Nguyễn Văn An',
  birth_year,
  death_year
})

describe('memberPrintTitle', () => {
  test('name only without years', () => {
    expect(memberPrintTitle(p(null, null))).toBe('Nguyễn Văn An')
  })
  test('birth and death years', () => {
    expect(memberPrintTitle(p(1950, 2020))).toBe('Nguyễn Văn An (1950 – 2020)')
  })
  test('living person', () => {
    expect(memberPrintTitle(p(1980, null))).toBe('Nguyễn Văn An (1980 –)')
  })
  test('unknown birth year', () => {
    expect(memberPrintTitle(p(null, 2001))).toBe('Nguyễn Văn An (? – 2001)')
  })
})
