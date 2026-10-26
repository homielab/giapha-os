import { describe, expect, test } from 'bun:test'

import {
  buildPersonData,
  comparePartialDates,
  isValidDate,
  lunarToSolarSafe,
  normalizeDeathDates,
  slugify,
  solarToLunarSafe,
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

const emptyDeath = death('', '', '')

describe('normalizeDeathDates', () => {
  test('clears every death field when the person is alive', () => {
    const result = normalizeDeathDates(false, {
      day: 1,
      month: 2,
      year: 2000,
      lunarDay: 3,
      lunarMonth: 4,
      lunarYear: 2000
    })
    expect(result).toEqual({ ok: true, values: emptyDeath })
  })

  test('fills the lunar date from a complete solar date', () => {
    const result = normalizeDeathDates(true, death(10, 2, 2024))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toMatchObject({
        day: 10,
        month: 2,
        year: 2024,
        lunarDay: 1,
        lunarMonth: 1,
        lunarYear: 2024
      })
    }
  })

  test('fills the solar date from a complete lunar date', () => {
    const result = normalizeDeathDates(true, {
      ...emptyDeath,
      lunarDay: 1,
      lunarMonth: 1,
      lunarYear: 2024
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.values).toMatchObject({ day: 10, month: 2, year: 2024 })
    }
  })

  test('reports a lunar date that does not exist', () => {
    const result = normalizeDeathDates(true, {
      ...emptyDeath,
      lunarDay: 31,
      lunarMonth: 1,
      lunarYear: 2024
    })
    expect(result).toEqual({ ok: false, errorKey: 'invalidLunarDate' })
  })

  test('keeps a partial date as it is', () => {
    const input = { ...death('', 5, 2020) }
    expect(normalizeDeathDates(true, input)).toEqual({
      ok: true,
      values: input
    })
  })
})

describe('validateMemberForm more cases', () => {
  test('rejects an impossible birth date first', () => {
    expect(validateMemberForm(30, 2, 2001, false, emptyDeath)).toBe(
      'invalidBirthDate'
    )
  })

  test('rejects an impossible death date only for a deceased person', () => {
    expect(validateMemberForm('', '', 1950, true, death(31, 4, 2000))).toBe(
      'invalidDeathDate'
    )
    expect(
      validateMemberForm('', '', 1950, false, death(31, 4, 2000))
    ).toBeNull()
  })

  test('accepts an empty form', () => {
    expect(validateMemberForm('', '', '', false, emptyDeath)).toBeNull()
  })
})

describe('safe converters', () => {
  test('return null for partial input or years up to 100', () => {
    expect(solarToLunarSafe('', 2, 2024)).toBeNull()
    expect(solarToLunarSafe(10, 2, 100)).toBeNull()
    expect(lunarToSolarSafe(1, '', 2024)).toBeNull()
    expect(lunarToSolarSafe(1, 1, 50)).toBeNull()
  })

  test('convert a full date', () => {
    expect(solarToLunarSafe(10, 2, 2024)).toEqual({
      day: 1,
      month: 1,
      year: 2024
    })
    expect(lunarToSolarSafe(1, 1, 2024)).toEqual({
      day: 10,
      month: 2,
      year: 2024
    })
  })
})

describe('buildPersonData', () => {
  const fields = {
    fullName: 'Nguyễn Văn An',
    gender: 'male' as const,
    birthYear: 1990,
    birthMonth: '' as const,
    birthDay: '' as const,
    deathYear: 2020,
    deathMonth: 5,
    deathDay: 6,
    deathLunarYear: 2020,
    deathLunarMonth: 4,
    deathLunarDay: 14,
    isDeceased: false,
    isInLaw: false,
    birthOrder: '' as const,
    generation: 3,
    otherNames: '',
    note: ''
  }

  test('turns empty fields into null', () => {
    const data = buildPersonData(fields, null)
    expect(data.birth_month).toBeNull()
    expect(data.other_names).toBeNull()
    expect(data.note).toBeNull()
    expect(data.generation).toBe(3)
  })

  test('drops death fields for a living person', () => {
    const data = buildPersonData(fields, null)
    expect(data.death_year).toBeNull()
    expect(data.death_lunar_day).toBeNull()
  })

  test('keeps death fields for a deceased person', () => {
    const data = buildPersonData({ ...fields, isDeceased: true }, 'a.png')
    expect(data.death_year).toBe(2020)
    expect(data.death_lunar_month).toBe(4)
    expect(data.avatar_url).toBe('a.png')
  })
})

describe('slugify', () => {
  test('strips Vietnamese accents and punctuation', () => {
    expect(slugify('Nguyễn Văn Đức!')).toBe('nguyen-van-duc')
  })
})

describe('member name', () => {
  test('a name of spaces is refused, a name with spaces is trimmed', () => {
    expect(
      validateMemberForm('', '', '', false, death('', '', ''), '   ')
    ).toBe('fullNameRequired')
    expect(
      validateMemberForm(
        '',
        '',
        '',
        false,
        death('', '', ''),
        ' Nguyễn Văn An '
      )
    ).toBeNull()
  })

  test('buildPersonData trims the names', () => {
    const data = buildPersonData(
      {
        fullName: '  Nguyễn  Văn An ',
        gender: 'male',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        deathYear: '',
        deathMonth: '',
        deathDay: '',
        deathLunarYear: '',
        deathLunarMonth: '',
        deathLunarDay: '',
        isDeceased: false,
        isInLaw: false,
        birthOrder: '',
        generation: '',
        otherNames: '   ',
        note: ''
      },
      null
    )
    expect(data.full_name).toBe('Nguyễn  Văn An')
    expect(data.other_names).toBeNull()
  })
})
