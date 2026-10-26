import { describe, expect, test } from 'bun:test'

import {
  convertLunar2Solar,
  convertSolar2Lunar,
  getLeapMonth,
  getLunarMonth11,
  getNewMoonDay,
  getSunLongitude,
  jdFromDate,
  jdToDate,
  lunarMonthStart,
  VN_TIME_ZONE
} from './lunar-vn'

describe('jdFromDate / jdToDate', () => {
  test('known Julian day numbers', () => {
    expect(jdFromDate(1, 1, 2000)).toBe(2451545)
    expect(jdFromDate(15, 10, 1582)).toBe(2299161)
    expect(jdFromDate(4, 10, 1582)).toBe(2299160)
  })

  test('round-trips, including the Julian calendar before 1582', () => {
    expect(jdToDate(2451545)).toEqual([1, 1, 2000])
    expect(jdToDate(2299161)).toEqual([15, 10, 1582])
    expect(jdToDate(2299160)).toEqual([4, 10, 1582])
    for (const [d, m, y] of [
      [29, 2, 2024],
      [31, 12, 1899],
      [1, 3, 2100],
      [28, 2, 1900]
    ]) {
      expect(jdToDate(jdFromDate(d, m, y))).toEqual([d, m, y])
    }
  })
})

describe('leap months', () => {
  test.each([
    [2009, 5],
    [2012, 4],
    [2014, 9],
    [2017, 6],
    [2020, 4],
    [2023, 2],
    [2025, 6],
    [2028, 5]
  ])('lunar year %i has leap month %i', (year, month) => {
    expect(getLeapMonth(year)).toBe(month)
  })

  test('years without a leap month return 0', () => {
    for (const year of [2019, 2021, 2022, 2024, 2026]) {
      expect(getLeapMonth(year)).toBe(0)
    }
  })

  test('only the leap month of a year can be asked for as leap', () => {
    // 2025 has a leap month 6 (25 Jul 2025), no leap month 5, and 2024 has none.
    expect(convertLunar2Solar(1, 6, 2025, true)).toEqual([25, 7, 2025])
    expect(convertLunar2Solar(1, 5, 2025, true)).toBeNull()
    expect(convertLunar2Solar(1, 6, 2024, true)).toBeNull()
    expect(lunarMonthStart(6, 2024, true)).toBeNull()
  })

  test('the leap month follows the regular month of the same number', () => {
    const regular = lunarMonthStart(6, 2025, false)!
    const leap = lunarMonthStart(6, 2025, true)!
    expect(leap.start).toBe(regular.start + regular.length)
  })
})

describe('month lengths', () => {
  test('lunar months of 2025 have 29 or 30 days, as published', () => {
    // Month 1..12 (regular months) of lunar year 2025; month 6 leap is 29 days.
    const expected = [30, 29, 30, 29, 29, 30, 30, 29, 30, 30, 30, 29]
    expected.forEach((length, i) => {
      expect(lunarMonthStart(i + 1, 2025, false)!.length).toBe(length)
    })
    expect(lunarMonthStart(6, 2025, true)!.length).toBe(29)
  })

  test('day 30 exists only in months with 30 days', () => {
    // Month 1 of 2025 has 30 days, month 2 has 29.
    expect(convertLunar2Solar(30, 1, 2025, false)).toEqual([27, 2, 2025])
    expect(convertLunar2Solar(30, 2, 2025, false)).toBeNull()
    expect(convertLunar2Solar(29, 2, 2025, false)).not.toBeNull()
  })

  test('rejects invalid months and days', () => {
    expect(lunarMonthStart(0, 2025, false)).toBeNull()
    expect(lunarMonthStart(13, 2025, false)).toBeNull()
    expect(lunarMonthStart(1.5, 2025, false)).toBeNull()
    expect(convertLunar2Solar(0, 1, 2025, false)).toBeNull()
    expect(convertLunar2Solar(1.5, 1, 2025, false)).toBeNull()
    expect(convertLunar2Solar(31, 1, 2025, false)).toBeNull()
  })
})

describe('UTC+7 against UTC+8', () => {
  test('the new moon of Tết 2007 falls at 23:14 on 17 Feb in UTC+7', () => {
    // 17 Feb 2007 16:14 UTC: still 17 Feb in UTC+7, already 18 Feb in UTC+8.
    const feb17 = jdFromDate(17, 2, 2007)
    expect(getNewMoonDay(1, 7)).toBeLessThan(feb17)
    const k = Math.round((feb17 - 2415021.077) / 29.530588853)
    expect(getNewMoonDay(k, 7)).toBe(feb17)
    expect(getNewMoonDay(k, 8)).toBe(feb17 + 1)
  })

  test('the same solar day gives a different lunar date in UTC+8', () => {
    expect(convertSolar2Lunar(17, 2, 2007)).toEqual({
      day: 1,
      month: 1,
      year: 2007,
      leap: false
    })
    expect(convertSolar2Lunar(17, 2, 2007, 8)).toEqual({
      day: 30,
      month: 12,
      year: 2006,
      leap: false
    })
    expect(VN_TIME_ZONE).toBe(7)
  })

  test('solar terms change at the local day boundary', () => {
    // Spring equinox 2024 is 20 Mar 03:06 UTC = 10:06 in UTC+7.
    expect(getSunLongitude(jdFromDate(20, 3, 2024))).toBe(11)
    expect(getSunLongitude(jdFromDate(21, 3, 2024))).toBe(0)
    // Winter solstice 2024 is 21 Dec 09:21 UTC.
    expect(getSunLongitude(jdFromDate(21, 12, 2024))).toBe(8)
    expect(getSunLongitude(jdFromDate(22, 12, 2024))).toBe(9)
  })
})

describe('convertSolar2Lunar / convertLunar2Solar', () => {
  test('the day before and the day of lunar new year', () => {
    expect(convertSolar2Lunar(28, 1, 2025)).toMatchObject({
      day: 29,
      month: 12,
      year: 2024
    })
    expect(convertSolar2Lunar(29, 1, 2025)).toEqual({
      day: 1,
      month: 1,
      year: 2025,
      leap: false
    })
  })

  test('month 11 of 2024 starts on 1 Dec 2024', () => {
    expect(jdToDate(getLunarMonth11(2024))).toEqual([1, 12, 2024])
    expect(jdToDate(getLunarMonth11(2023))).toEqual([13, 12, 2023])
  })

  test('a leap month is flagged and numbered like the month before', () => {
    expect(convertSolar2Lunar(25, 7, 2025)).toEqual({
      day: 1,
      month: 6,
      year: 2025,
      leap: true
    })
    expect(convertSolar2Lunar(24, 7, 2025)).toMatchObject({
      month: 6,
      leap: false,
      day: 30
    })
  })

  test('months 11 and 12 belong to the year in which month 11 starts', () => {
    expect(convertSolar2Lunar(1, 12, 2024)).toEqual({
      day: 1,
      month: 11,
      year: 2024,
      leap: false
    })
    expect(convertSolar2Lunar(1, 1, 2025)).toMatchObject({
      month: 12,
      year: 2024
    })
  })

  test('handles the ends of the supported range', () => {
    expect(convertSolar2Lunar(1, 1, 1900)).toMatchObject({
      month: 12,
      year: 1899
    })
    expect(convertSolar2Lunar(31, 1, 1900)).toMatchObject({
      day: 1,
      month: 1,
      year: 1900
    })
    expect(convertSolar2Lunar(31, 12, 2100)).toMatchObject({
      month: 12,
      year: 2100
    })
  })

  test('a lunar date converts back to the solar date', () => {
    for (const [d, m, y, leap] of [
      [1, 1, 2025, false],
      [15, 8, 2023, false],
      [3, 2, 2023, true],
      [29, 12, 2024, false]
    ] as const) {
      const solar = convertLunar2Solar(d, m, y, leap)!
      expect(solar).not.toBeNull()
      expect(convertSolar2Lunar(solar[0], solar[1], solar[2])).toEqual({
        day: d,
        month: m,
        year: y,
        leap
      })
    }
  })
})
