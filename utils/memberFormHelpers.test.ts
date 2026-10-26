import { describe, expect, test } from 'bun:test'

import {
  comparePartialDates,
  isValidDate,
  validateMemberForm,
  type DeathDateValues
} from './memberFormHelpers'

const death = (
  day: number | '',
  month: number | '',
  year: number | ''
): DeathDateValues => ({
  day,
  month,
  year,
  lunarDay: '',
  lunarMonth: '',
  lunarYear: ''
})

describe('isValidDate', () => {
  test('checks the number of days in the month', () => {
    expect(isValidDate(31, 4, 2000)).toBe(false)
    expect(isValidDate(30, 4, 2000)).toBe(true)
    expect(isValidDate(29, 2, 2023)).toBe(false)
    expect(isValidDate(29, 2, 2024)).toBe(true)
  })

  test('uses the real year for years below 100', () => {
    expect(isValidDate(29, 2, 4)).toBe(true)
    expect(isValidDate(29, 2, 3)).toBe(false)
    expect(isValidDate(31, 4, 1)).toBe(false)
    expect(isValidDate(29, 2, 100)).toBe(false)
  })

  test('accepts 29/02 when the year is unknown', () => {
    expect(isValidDate(29, 2, '')).toBe(true)
    expect(isValidDate(0, 1, 2000)).toBe(false)
  })
})

describe('validateMemberForm', () => {
  test('rejects a death earlier in the same year as the birth', () => {
    expect(validateMemberForm(20, 5, 1990, true, death(10, 5, 1990))).toBe(
      'deathBeforeBirth'
    )
    expect(validateMemberForm('', 6, 1990, true, death(1, 3, 1990))).toBe(
      'deathBeforeBirth'
    )
  })

  test('accepts a death on or after the birth date', () => {
    expect(validateMemberForm(20, 5, 1990, true, death(20, 5, 1990))).toBeNull()
    expect(validateMemberForm(20, 5, 1990, true, death(1, 6, 1990))).toBeNull()
    // Same year without months: cannot be ordered, so accepted.
    expect(validateMemberForm('', '', 1990, true, death(1, 1, 1990))).toBeNull()
  })

  test('still rejects a death year before the birth year', () => {
    expect(validateMemberForm('', '', 1990, true, death('', '', 1989))).toBe(
      'deathBeforeBirth'
    )
    expect(
      validateMemberForm('', '', 1990, false, death('', '', ''))
    ).toBeNull()
  })
})

test('comparePartialDates returns null without both years', () => {
  expect(
    comparePartialDates(
      { day: 1, month: 1, year: '' },
      { day: 1, month: 1, year: 2000 }
    )
  ).toBeNull()
})
