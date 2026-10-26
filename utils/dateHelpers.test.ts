import { describe, expect, test } from 'bun:test'

import { Locale, translate } from '@/lib/i18n/messages'

import {
  calculateAge,
  formatDisplayDate,
  getLunarDateString,
  getSolarDateString,
  getTodayLunar,
  getZodiacAnimal,
  getZodiacSign,
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
})
