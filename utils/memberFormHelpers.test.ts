import { describe, expect, test } from 'bun:test'

import {
  buildPersonData,
  comparePartialDates,
  findTooLongText,
  hasLeapMonth,
  isValidDate,
  lunarToSolarSafe,
  nextLeapFlag,
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
  test('needs a month when a day is entered', () => {
    expect(validateMemberForm(5, '', 1990, false, emptyDeath)).toBe(
      'dayNeedsMonth'
    )
    expect(validateMemberForm('', '', 1990, true, death(5, '', 2000))).toBe(
      'dayNeedsMonth'
    )
    expect(
      validateMemberForm('', '', 1990, true, {
        ...death('', '', 2000),
        lunarDay: 5,
        lunarYear: 2000
      })
    ).toBe('dayNeedsMonth')
    // A death day is ignored for a living person.
    expect(validateMemberForm('', '', 1990, false, death(5, '', ''))).toBeNull()
  })

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

describe('validateMemberForm future dates', () => {
  const today = new Date(2026, 9, 27)
  const check = (
    b: [number | '', number | '', number | ''],
    deceased: boolean,
    d: ReturnType<typeof death>
  ) => validateMemberForm(b[0], b[1], b[2], deceased, d, undefined, today)

  test('rejects a birth after today', () => {
    expect(check(['', '', 2062], false, emptyDeath)).toBe('birthInFuture')
    expect(check([28, 10, 2026], false, emptyDeath)).toBe('birthInFuture')
    expect(check(['', 11, 2026], false, emptyDeath)).toBe('birthInFuture')
  })

  test('rejects a death after today', () => {
    expect(check([1, 1, 1962], true, death('', '', 2062))).toBe('deathInFuture')
    expect(check([1, 1, 1962], true, death(28, 10, 2026))).toBe('deathInFuture')
  })

  test('accepts today and dates known only up to the year or month', () => {
    expect(check([27, 10, 2026], false, emptyDeath)).toBeNull()
    expect(check(['', '', 2026], false, emptyDeath)).toBeNull()
    expect(check(['', 10, 2026], false, emptyDeath)).toBeNull()
    expect(check([1, 1, 2025], true, death(27, 10, 2026))).toBeNull()
    expect(check([1, 1, 1962], true, death('', 10, 2026))).toBeNull()
  })

  test('ignores a death date when the person is alive', () => {
    expect(check([1, 1, 1962], false, death('', '', 2062))).toBeNull()
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

describe('validateMemberForm lunar death date', () => {
  const lunar = (
    lunarDay: number | '',
    lunarMonth: number | '',
    lunarYear: number | ''
  ): DeathDateValues => ({
    ...death('', '', ''),
    lunarDay,
    lunarMonth,
    lunarYear
  })
  const check = (d: DeathDateValues) =>
    validateMemberForm('', '', 1900, true, d, undefined, new Date(2026, 0, 1))

  test('refuses a day or month that no lunar month has', () => {
    expect(check(lunar(31, 5, ''))).toBe('invalidDeathDate')
    expect(check(lunar(31, 2, 2000))).toBe('invalidDeathDate')
    expect(check(lunar(15, 13, ''))).toBe('invalidDeathDate')
    expect(check(lunar(0, 5, ''))).toBe('invalidDeathDate')
  })

  test('refuses day 30 of a 29-day month when the year is known', () => {
    expect(check(lunar(30, 3, 2000))).toBe('invalidDeathDate')
    expect(check(lunar(30, 2, 2000))).toBeNull()
  })

  test('accepts a day and month without a year', () => {
    expect(check(lunar(15, 7, ''))).toBeNull()
    expect(check(lunar(30, 3, ''))).toBeNull()
  })

  test('is only checked for a deceased member', () => {
    expect(validateMemberForm('', '', 1900, false, lunar(31, 5, ''))).toBeNull()
  })
})

describe('validateMemberForm whole numbers', () => {
  const emptyDeath = death('', '', '')
  test('refuses two-digit years and accepts four digits', () => {
    expect(validateMemberForm('', '', 85, false, emptyDeath)).toBe(
      'yearNotFourDigits'
    )
    expect(validateMemberForm('', '', 1930, true, death('', '', 85))).toBe(
      'yearNotFourDigits'
    )
    expect(validateMemberForm('', '', 1985, false, emptyDeath)).toBeNull()
  })

  test('refuses decimal years, days and months', () => {
    expect(validateMemberForm('', '', 1990.5, false, emptyDeath)).toBe(
      'invalidBirthDate'
    )
    expect(validateMemberForm(3.5, 2, 1990, false, emptyDeath)).toBe(
      'invalidBirthDate'
    )
    expect(validateMemberForm(3, 2.5, 1990, false, emptyDeath)).toBe(
      'invalidBirthDate'
    )
    expect(validateMemberForm('', '', 1930, true, death(1.5, 1, 1990))).toBe(
      'invalidDeathDate'
    )
  })

  test('refuses a decimal birth order or generation', () => {
    const check = (birthOrder: number | '', generation: number | '') =>
      validateMemberForm(
        '',
        '',
        1985,
        false,
        emptyDeath,
        undefined,
        undefined,
        {
          birthOrder,
          generation
        }
      )
    expect(check(1.5, '')).toBe('invalidWholeNumber')
    expect(check('', 2.5)).toBe('invalidWholeNumber')
    expect(check(2, 3)).toBeNull()
  })
})

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
      year: 2024,
      leap: false
    })
    expect(lunarToSolarSafe(1, 1, 2024)).toEqual({
      day: 10,
      month: 2,
      year: 2024
    })
  })
})

describe('leap lunar months', () => {
  // 2023 has a leap month 2: 15/2 leap 2023 = 5 Apr 2023.
  test('lunar -> solar honours the leap flag', () => {
    expect(lunarToSolarSafe(15, 2, 2023)).toEqual({
      day: 6,
      month: 3,
      year: 2023
    })
    expect(lunarToSolarSafe(15, 2, 2023, true)).toEqual({
      day: 5,
      month: 4,
      year: 2023
    })
    expect(lunarToSolarSafe(16, 2, 2023, true)).toEqual({
      day: 6,
      month: 4,
      year: 2023
    })
  })

  test('solar -> lunar reports the leap flag', () => {
    expect(solarToLunarSafe(5, 4, 2023)).toEqual({
      day: 15,
      month: 2,
      year: 2023,
      leap: true
    })
  })

  test('hasLeapMonth only matches the leap month of that year', () => {
    expect(hasLeapMonth(2, 2023)).toBe(true)
    expect(hasLeapMonth(3, 2023)).toBe(false)
    expect(hasLeapMonth(6, 2025)).toBe(true)
    expect(hasLeapMonth(2, 2024)).toBe(false)
    expect(hasLeapMonth('', 2023)).toBe(false)
  })

  test('nextLeapFlag keeps the flag only while month and year stay', () => {
    const prev = { month: 2, year: 2023, leap: true } as const
    expect(nextLeapFlag(prev, { month: 2, year: 2023 })).toBe(true)
    expect(nextLeapFlag(prev, { month: 3, year: 2023 })).toBe(false)
    expect(nextLeapFlag(prev, { month: 2, year: 2024 })).toBe(false)
    expect(
      nextLeapFlag({ ...prev, leap: false }, { month: 2, year: 2023 })
    ).toBe(false)
  })

  test('editing the day of a leap-month date keeps the leap month', () => {
    const lunar = solarToLunarSafe(5, 4, 2023)!
    const leap = nextLeapFlag(
      { month: lunar.month, year: lunar.year, leap: lunar.leap },
      { month: lunar.month, year: lunar.year }
    )
    expect(lunarToSolarSafe(16, lunar.month, lunar.year, leap)).toEqual({
      day: 6,
      month: 4,
      year: 2023
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
    note: '',
    burialPlace: ''
  }

  test('turns empty fields into null', () => {
    const data = buildPersonData(fields, null)
    expect(data.birth_month).toBeNull()
    expect(data.other_names).toBeNull()
    expect(data.note).toBeNull()
    expect(data.generation).toBe(3)
  })

  test('stores names in NFC with single spaces', () => {
    const data = buildPersonData(
      {
        ...fields,
        fullName: '  Nguyễn   Văn  A '.normalize('NFD'),
        otherNames: ' Tí\t Tèo '.normalize('NFD')
      },
      null
    )
    expect(data.full_name).toBe('Nguyễn Văn A'.normalize('NFC'))
    expect(data.other_names).toBe('Tí Tèo'.normalize('NFC'))
  })

  test('stores a note of only whitespace as null', () => {
    expect(buildPersonData({ ...fields, note: '  \n ' }, null).note).toBeNull()
    expect(buildPersonData({ ...fields, note: 'a\n b' }, null).note).toBe(
      'a\n b'
    )
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

  test('keeps a trimmed burial place only for a deceased person', () => {
    const place = { ...fields, burialPlace: ' Nghĩa trang X, xã Y ' }
    expect(
      buildPersonData({ ...place, isDeceased: true }, null).burial_place
    ).toBe('Nghĩa trang X, xã Y')
    expect('burial_place' in buildPersonData(place, null)).toBe(false)
    expect(buildPersonData(place, null, true).burial_place).toBeNull()
  })

  test('leaves burial_place out unless there is one to store or to clear', () => {
    // A database not upgraded yet has no burial_place column.
    const deceased = { ...fields, isDeceased: true, burialPlace: '  ' }
    expect('burial_place' in buildPersonData(deceased, null)).toBe(false)
    expect(buildPersonData(deceased, null, true).burial_place).toBeNull()
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
        note: '',
        burialPlace: ''
      },
      null
    )
    expect(data.full_name).toBe('Nguyễn Văn An')
    expect(data.other_names).toBeNull()
  })
})

describe('findTooLongText', () => {
  const ok = {
    fullName: 'Nguyễn Văn An',
    otherNames: '',
    note: 'a'.repeat(2000),
    burialPlace: '',
    phoneNumber: '',
    occupation: 'b'.repeat(500),
    currentResidence: ''
  }

  test('accepts text at the limits', () => {
    expect(findTooLongText(ok)).toBeNull()
  })

  test('rejects a note of 2001 characters', () => {
    expect(findTooLongText({ ...ok, note: 'a'.repeat(2001) })).toEqual({
      label: 'note',
      max: 2000
    })
  })

  test('rejects a long name and long private details', () => {
    expect(findTooLongText({ ...ok, fullName: 'a'.repeat(201) })?.max).toBe(200)
    expect(
      findTooLongText({ ...ok, currentResidence: 'a'.repeat(501) })
    ).toEqual({ label: 'residence', max: 500 })
  })
})
