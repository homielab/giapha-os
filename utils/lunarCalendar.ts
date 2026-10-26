import {
  convertLunar2Solar,
  convertSolar2Lunar,
  getLeapMonth,
  lunarMonthStart
} from './lunar-vn'

/**
 * Lunar calendar used by the app: the Vietnamese calendar (UTC+7).
 * All lunar/solar conversions in the app go through this module.
 */

export interface LunarDate {
  day: number
  month: number
  year: number
  /** True for a leap (nhuận) month. */
  leap: boolean
}

export interface SolarDate {
  day: number
  month: number
  year: number
}

const THIEN_CAN = [
  'Giáp',
  'Ất',
  'Bính',
  'Đinh',
  'Mậu',
  'Kỷ',
  'Canh',
  'Tân',
  'Nhâm',
  'Quý'
]
const DIA_CHI = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi'
]

function isWholeNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
}

/** True when year/month/day form a real solar (Gregorian) date. */
export function isValidSolarDate(
  year: number,
  month: number,
  day: number
): boolean {
  if (!isWholeNumber(year) || !isWholeNumber(month) || !isWholeNumber(day)) {
    return false
  }
  if (month < 1 || month > 12 || day < 1) return false
  const date = new Date(Date.UTC(2000, month - 1, day))
  date.setUTCFullYear(year)
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Lunar date of a solar date, or null when the solar date is invalid. */
export function solarToLunar(
  year: number,
  month: number,
  day: number
): LunarDate | null {
  if (!isValidSolarDate(year, month, day)) return null
  return convertSolar2Lunar(day, month, year)
}

/**
 * Solar date of a lunar date, or null when it does not exist (day 30 of a
 * 29-day month, or a leap month the year does not have).
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  leap = false
): SolarDate | null {
  if (!isWholeNumber(year) || !isWholeNumber(month) || !isWholeNumber(day)) {
    return null
  }
  const solar = convertLunar2Solar(day, month, year, leap)
  if (!solar) return null
  return { day: solar[0], month: solar[1], year: solar[2] }
}

/** The leap month (1–12) of a lunar year, or 0 when it has none. */
export function leapMonthOf(lunarYear: number): number {
  return getLeapMonth(lunarYear)
}

/** Can Chi name of a lunar year, e.g. 2026 → "Bính Ngọ". */
export function lunarYearName(lunarYear: number): string {
  const can = THIEN_CAN[(((lunarYear + 6) % 10) + 10) % 10]
  const chi = DIA_CHI[(((lunarYear + 8) % 12) + 12) % 12]
  return `${can} ${chi}`
}

/**
 * Solar date on which a yearly lunar anniversary (ngày giỗ) falls in the
 * given lunar year:
 * - a day missing from that month (day 30 of a 29-day month) is observed on
 *   the last day of the month;
 * - a date in a leap month is observed in that leap month when the year has
 *   the same leap month, otherwise in the regular month of the same number.
 */
export function lunarAnniversaryInYear(
  lunarYear: number,
  month: number,
  day: number,
  leap = false
): SolarDate | null {
  if (!isWholeNumber(day) || day < 1) return null
  const useLeap = leap && leapMonthOf(lunarYear) === month
  const monthInfo = lunarMonthStart(month, lunarYear, useLeap)
  if (!monthInfo) return null
  const observedDay = Math.min(day, monthInfo.length)
  return lunarToSolar(lunarYear, month, observedDay, useLeap)
}
