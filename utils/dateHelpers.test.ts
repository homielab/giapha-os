import { describe, expect, test } from 'bun:test'

import { Locale, translate } from '@/lib/i18n/messages'

import {
  calculateAge,
  formatDisplayDate,
  formatIsoDay,
  getLunarDateString,
  getSolarDateString,
  getTodayLunar,
  getZodiacAnimal,
  getZodiacSign,
  vnToday,
  type Translate
} from './dateHelpers'

const tFor =
  (locale: Locale): Translate =>
  (key, values) =>
    translate(locale, key, values)
const vi = tFor('vi')
const en = tFor('en')

describe('formatDisplayDate', () => {
  test('pads day and month', () => {
    expect(formatDisplayDate(2001, 3, 5, en)).toBe('05/03/2001')
  })

  test('shows only the known parts', () => {
    expect(formatDisplayDate(2001, null, null, en)).toBe('2001')
    expect(formatDisplayDate(null, 7, 9, en)).toBe('09/07')
  })

  test('drops a day that has no month', () => {
    expect(formatDisplayDate(1990, null, 5, en)).toBe('1990')
    expect(formatDisplayDate(null, null, 5, vi)).toBe('Chưa rõ')
  })

  test('translates the unknown label', () => {
    expect(formatDisplayDate(null, null, null, vi)).toBe('Chưa rõ')
    expect(formatDisplayDate(null, null, null, en)).toBe('Unknown')
  })
})

describe('getLunarDateString', () => {
  test('needs a complete date', () => {
    expect(getLunarDateString(2024, 2, null, en)).toBeNull()
  })

  test('converts a solar date', () => {
    // Tet 2024 fell on 10 February 2024.
    expect(getLunarDateString(2024, 2, 10, en)).toBe('01/01/2024')
  })

  test('marks a leap month in the chosen language', () => {
    // 2023 has a leap lunar month 2; 22 Mar 2023 is its first day.
    expect(getLunarDateString(2023, 3, 22, vi)).toBe('01/02 nhuận/2023')
    expect(getLunarDateString(2023, 3, 22, en)).toBe('01/02 leap/2023')
  })
})

describe('getSolarDateString', () => {
  test('returns the translated unknown label for an incomplete date', () => {
    expect(getSolarDateString(2024, null, 1, vi)).toBe('Chưa rõ')
    expect(getSolarDateString(null, null, null, en)).toBe('Unknown')
  })

  test('converts a lunar date', () => {
    expect(getSolarDateString(2024, 1, 1, en)).toBe('10/02/2024')
  })

  test('returns null for a lunar day that does not exist', () => {
    expect(getSolarDateString(2024, 1, 31, en)).toBeNull()
  })
})

describe('calculateAge', () => {
  test('returns null without a birth year', () => {
    expect(calculateAge(null, null, null, null, null, null)).toBeNull()
  })

  test('never returns a negative age', () => {
    expect(calculateAge(1990, 5, 5, 1980, 1, 1, true)).toBeNull()
    expect(
      calculateAge(
        2030,
        null,
        null,
        null,
        null,
        null,
        false,
        new Date('2026-06-01')
      )
    ).toBeNull()
  })

  test('uses a lunar-only death date', () => {
    const lunar = { year: 2020, month: 1, day: 15 }
    expect(
      calculateAge(1950, 6, 15, null, null, null, true, undefined, lunar)
    ).toEqual({ age: 69, isDeceased: true })
    expect(
      calculateAge(1950, null, null, null, null, null, true, undefined, {
        year: 2020,
        month: null,
        day: null
      })
    ).toEqual({ age: 70, isDeceased: true })
  })

  test('uses the full death date when it is known', () => {
    expect(calculateAge(1950, 6, 15, 2020, 6, 14, true)).toEqual({
      age: 69,
      isDeceased: true
    })
    expect(calculateAge(1950, 6, 15, 2020, 6, 15, true)).toEqual({
      age: 70,
      isDeceased: true
    })
  })

  test('falls back to the years when month or day is missing', () => {
    expect(calculateAge(1950, null, null, 2020, 1, 1)).toEqual({
      age: 70,
      isDeceased: true
    })
  })

  test('returns null for a deceased person without a death year', () => {
    expect(calculateAge(1950, 1, 1, null, null, null, true)).toBeNull()
  })

  test('counts the age of a living person up to today', () => {
    const result = calculateAge(2000, null, null, null, null, null)
    expect(result?.isDeceased).toBe(false)
    expect(result?.age).toBeGreaterThanOrEqual(
      new Date().getFullYear() - 2000 - 1
    )
  })
})

describe('getZodiacSign', () => {
  test('returns a translation key', () => {
    expect(getZodiacSign(21, 3)).toBe('zodiacAries')
    expect(getZodiacSign(19, 4)).toBe('zodiacAries')
    expect(getZodiacSign(20, 4)).toBe('zodiacTaurus')
  })

  test('handles the year boundary', () => {
    expect(getZodiacSign(31, 12)).toBe('zodiacCapricorn')
    expect(getZodiacSign(1, 1)).toBe('zodiacCapricorn')
    expect(getZodiacSign(20, 1)).toBe('zodiacAquarius')
  })

  test('returns null without a day or month', () => {
    expect(getZodiacSign(null, 5)).toBeNull()
    expect(getZodiacSign(5, null)).toBeNull()
  })

  test('every day of the year maps to a sign with a name in both languages', () => {
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const key = getZodiacSign(day, month)
        expect(key).not.toBeNull()
        expect(vi(key!)).not.toBe('')
        expect(en(key!)).not.toBe('')
      }
    }
  })

  test('names come from the dictionary', () => {
    expect(vi(getZodiacSign(1, 8)!)).toBe('Sư Tử')
    expect(en(getZodiacSign(1, 8)!)).toBe('Leo')
  })
})

describe('getZodiacAnimal', () => {
  test('maps the year to an animal', () => {
    expect(getZodiacAnimal(2024)).toBe('animalDragon')
    expect(getZodiacAnimal(2020)).toBe('animalRat')
  })

  test('uses the lunar year when the date is known', () => {
    // 1 Jan 2024 is still lunar year 2023 (rabbit).
    expect(getZodiacAnimal(2024, 1, 1)).toBe('animalCat')
    expect(getZodiacAnimal(2024, 3, 1)).toBe('animalDragon')
  })

  test('returns null without a year', () => {
    expect(getZodiacAnimal(null)).toBeNull()
  })

  test('translates the animal', () => {
    expect(vi(getZodiacAnimal(2024)!)).toBe('Thìn')
    expect(en(getZodiacAnimal(2024)!)).toBe('Dragon')
  })
})

describe('getTodayLunar', () => {
  test('builds the labels with the given translator', () => {
    const viResult = getTodayLunar(vi)
    const enResult = getTodayLunar(en)
    expect(viResult.lunarDayStr).toContain('tháng')
    expect(enResult.lunarDayStr).toStartWith('Month ')
    expect(enResult.solarStr).not.toMatch(/ngày|tháng|năm/)
    expect(enResult.lunarDayStr).not.toMatch(/ngày|tháng|năm/)
  })

  test('adds the leap-month suffix during a leap month', () => {
    // 2025-08-01 12:00 in Vietnam falls in leap lunar month 6.
    const now = new Date('2025-08-01T05:00:00Z')
    expect(getTodayLunar(vi, now).lunarDayStr).toEndWith(' nhuận')
    expect(getTodayLunar(en, now).lunarDayStr).toEndWith(' leap')
    expect(
      getTodayLunar(vi, new Date('2025-05-01T05:00:00Z')).lunarDayStr
    ).not.toContain('nhuận')
  })

  test('uses the Vietnam date near midnight UTC', () => {
    // 2025-07-24T18:00Z is already 25 July (01:00) in Vietnam.
    const result = getTodayLunar(vi, new Date('2025-07-24T18:00:00Z'))
    expect(result.solarStr).toContain('25')
  })
})

describe('formatIsoDay', () => {
  const lateEveningUtc = new Date('2026-10-27T18:00:00Z')

  test('names the Vietnamese day after midnight UTC+7, not the UTC day', () => {
    expect(formatIsoDay(vnToday(lateEveningUtc))).toBe('2026-10-28')
  })

  test('keeps the day just before midnight in Vietnam', () => {
    expect(formatIsoDay(vnToday(new Date('2026-10-27T16:59:00Z')))).toBe(
      '2026-10-27'
    )
  })

  test('pads month and day', () => {
    expect(formatIsoDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('calculateAge with a fixed now', () => {
  const age = (now: string, m: number, d: number, y = 2000) =>
    calculateAge(y, m, d, null, null, null, false, new Date(now))?.age

  test('a 28/10 birthday adds a year exactly at 0h in Vietnam', () => {
    expect(age('2026-10-27T16:59:59Z', 10, 28)).toBe(25)
    expect(age('2026-10-27T17:00:00Z', 10, 28)).toBe(26)
  })

  test('a 29/2 birthday counts from 1/3 in a common year, 29/2 in a leap year', () => {
    expect(age('2026-02-28T05:00:00Z', 2, 29)).toBe(25)
    expect(age('2026-03-01T05:00:00Z', 2, 29)).toBe(26)
    expect(age('2028-02-28T05:00:00Z', 2, 29)).toBe(27)
    expect(age('2028-02-29T05:00:00Z', 2, 29)).toBe(28)
  })
})
