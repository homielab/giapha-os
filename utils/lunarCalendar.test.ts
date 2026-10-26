import { describe, expect, test } from 'bun:test'

import {
  isValidSolarDate,
  leapMonthOf,
  lunarAnniversaryInYear,
  lunarToSolar,
  lunarYearName,
  solarToLunar
} from './lunarCalendar'

describe('solarToLunar / lunarToSolar', () => {
  test.each([
    // Tết (1/1 âm lịch) in the Vietnamese calendar
    [1985, 1, 21],
    [2007, 2, 17],
    [2017, 1, 28],
    [2020, 1, 25],
    [2023, 1, 22],
    [2024, 2, 10],
    [2025, 1, 29],
    [2026, 2, 17]
  ])('Tết %i falls on %i-%i', (year, month, day) => {
    expect(lunarToSolar(year, 1, 1)).toEqual({ year, month, day })
    expect(solarToLunar(year, month, day)).toEqual({
      year,
      month: 1,
      day: 1,
      leap: false
    })
  })

  test('uses the Vietnamese calendar where it differs from the Chinese one', () => {
    // Chinese calendar (UTC+8): Tết 2007 is 2007-02-18 and Tết 1985 is
    // 1985-02-20, so these days are still month 12 there.
    expect(solarToLunar(2007, 2, 17)).toEqual({
      day: 1,
      month: 1,
      year: 2007,
      leap: false
    })
    expect(solarToLunar(1985, 1, 21)).toEqual({
      day: 1,
      month: 1,
      year: 1985,
      leap: false
    })
  })

  test('marks leap months', () => {
    expect(solarToLunar(2025, 7, 25)).toEqual({
      day: 1,
      month: 6,
      year: 2025,
      leap: true
    })
    expect(solarToLunar(2025, 6, 25)).toEqual({
      day: 1,
      month: 6,
      year: 2025,
      leap: false
    })
    expect(lunarToSolar(2020, 4, 15, true)).toEqual({
      year: 2020,
      month: 6,
      day: 6
    })
    expect(lunarToSolar(2020, 4, 15)).toEqual({ year: 2020, month: 5, day: 7 })
  })

  test('knows which month is the leap month', () => {
    expect(leapMonthOf(2020)).toBe(4)
    expect(leapMonthOf(2023)).toBe(2)
    expect(leapMonthOf(2025)).toBe(6)
    expect(leapMonthOf(2028)).toBe(5)
    expect(leapMonthOf(2026)).toBe(0)
  })

  test('rejects lunar dates that do not exist', () => {
    // Month 12 of lunar 2024 has 29 days; 2026 has no leap month.
    expect(lunarToSolar(2024, 12, 30)).toBeNull()
    expect(lunarToSolar(2026, 6, 1, true)).toBeNull()
    expect(lunarToSolar(2025, 5, 1, true)).toBeNull()
    expect(lunarToSolar(2025, 13, 1)).toBeNull()
    expect(lunarToSolar(2025, 1, 0)).toBeNull()
  })

  test('rejects invalid solar dates', () => {
    expect(solarToLunar(2023, 2, 29)).toBeNull()
    expect(solarToLunar(2024, 13, 1)).toBeNull()
    expect(solarToLunar(2024, 2, 29)).not.toBeNull()
    expect(isValidSolarDate(1900, 2, 29)).toBe(false)
    expect(isValidSolarDate(2000, 2, 29)).toBe(true)
  })

  test('round-trips every day from 1900 to 2100', () => {
    let failures = 0
    const day = new Date(Date.UTC(1900, 0, 31))
    const end = Date.UTC(2100, 11, 31)
    while (day.getTime() <= end) {
      const y = day.getUTCFullYear()
      const m = day.getUTCMonth() + 1
      const d = day.getUTCDate()
      const lunar = solarToLunar(y, m, d)!
      const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.leap)
      if (!back || back.year !== y || back.month !== m || back.day !== d) {
        failures++
      }
      day.setUTCDate(d + 1)
    }
    expect(failures).toBe(0)
  })
})

describe('lunarYearName', () => {
  test('gives the Can Chi name', () => {
    expect(lunarYearName(2026)).toBe('Bính Ngọ')
    expect(lunarYearName(2025)).toBe('Ất Tỵ')
    expect(lunarYearName(1984)).toBe('Giáp Tý')
    expect(lunarYearName(1945)).toBe('Ất Dậu')
  })
})

describe('lunarAnniversaryInYear', () => {
  test('day 30 falls on the last day of a 29-day month', () => {
    // 30/12 âm lịch: lunar 2024 and 2025 have a 29-day month 12.
    expect(lunarAnniversaryInYear(2024, 12, 30)).toEqual({
      year: 2025,
      month: 1,
      day: 28
    })
    expect(lunarAnniversaryInYear(2025, 12, 30)).toEqual({
      year: 2026,
      month: 2,
      day: 16
    })
    expect(lunarAnniversaryInYear(2023, 12, 30)).toEqual({
      year: 2024,
      month: 2,
      day: 9
    })
  })

  test('a leap-month date stays in the leap month when the year has it', () => {
    expect(lunarAnniversaryInYear(2025, 6, 1, true)).toEqual({
      year: 2025,
      month: 7,
      day: 25
    })
  })

  test('a leap-month date falls in the regular month otherwise', () => {
    expect(lunarAnniversaryInYear(2026, 6, 1, true)).toEqual({
      year: 2026,
      month: 7,
      day: 14
    })
    expect(lunarAnniversaryInYear(2025, 4, 15, true)).toEqual(
      lunarToSolar(2025, 4, 15)
    )
  })

  test('a regular-month date ignores the leap month', () => {
    expect(lunarAnniversaryInYear(2025, 6, 1)).toEqual({
      year: 2025,
      month: 6,
      day: 25
    })
  })
})
