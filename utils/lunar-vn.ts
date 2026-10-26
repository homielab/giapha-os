/**
 * Vietnamese lunisolar calendar (âm lịch Việt Nam).
 *
 * Astronomical algorithm by Hồ Ngọc Đức
 * (https://www.informatik.uni-leipzig.de/~duc/amlich/), computed for the
 * Vietnamese time zone (UTC+7). The Chinese calendar uses UTC+8, so the two
 * calendars occasionally disagree on the first day of a month, a month's
 * length or the leap month.
 *
 * Use the adapter in `utils/lunarCalendar.ts` from app code; this module only
 * exposes the raw conversions.
 */

export const VN_TIME_ZONE = 7

const PI = Math.PI
const DR = PI / 180
/** Julian day of the new moon of 1900-01-01 (k = 0). */
const NEW_MOON_EPOCH = 2415021.076998695
const SYNODIC_MONTH = 29.530588853

export interface LunarParts {
  day: number
  month: number
  year: number
  /** True when the month is the leap (nhuận) month of that lunar year. */
  leap: boolean
}

/** Julian day number of a Gregorian (or, before 1582-10-15, Julian) date. */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12)
  const y = yy + 4800 - a
  const m = mm + 12 * a - 3
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  if (jd < 2299161) {
    jd =
      dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083
  }
  return jd
}

/** Calendar date [day, month, year] of a Julian day number. */
export function jdToDate(jd: number): [number, number, number] {
  let b: number
  let c: number
  if (jd > 2299160) {
    const a = jd + 32044
    b = Math.floor((4 * a + 3) / 146097)
    c = a - Math.floor((b * 146097) / 4)
  } else {
    b = 0
    c = jd + 32082
  }
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = b * 100 + d - 4800 + Math.floor(m / 10)
  return [day, month, year]
}

/** Julian day (fractional, UTC) of the k-th new moon after 1900-01-01. */
function newMoon(k: number): number {
  const T = k / 1236.85
  const T2 = T * T
  const T3 = T2 * T
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR)
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3
  // Each line adds the next periodic terms, exactly as in the original.
  let c1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * DR) + 0.0021 * Math.sin(2 * DR * M)
  c1 = c1 - 0.4068 * Math.sin(Mpr * DR) + 0.0161 * Math.sin(DR * 2 * Mpr)
  c1 = c1 - 0.0004 * Math.sin(DR * 3 * Mpr)
  c1 = c1 + 0.0104 * Math.sin(DR * 2 * F) - 0.0051 * Math.sin(DR * (M + Mpr))
  c1 =
    c1 - 0.0074 * Math.sin(DR * (M - Mpr)) + 0.0004 * Math.sin(DR * (2 * F + M))
  c1 =
    c1 -
    0.0004 * Math.sin(DR * (2 * F - M)) -
    0.0006 * Math.sin(DR * (2 * F + Mpr))
  c1 =
    c1 +
    0.001 * Math.sin(DR * (2 * F - Mpr)) +
    0.0005 * Math.sin(DR * (2 * Mpr + M))
  const deltaT =
    T < -11
      ? 0.001 +
        0.000839 * T +
        0.0002261 * T2 -
        0.00000845 * T3 -
        0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2
  return jd1 + c1 - deltaT
}

/** Julian day number of the local day on which the k-th new moon falls. */
export function getNewMoonDay(k: number, timeZone = VN_TIME_ZONE): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24)
}

/** Sun longitude in radians [0, 2π) at the given (fractional, UTC) Julian day. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525
  const T2 = T * T
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M)
  DL +=
    (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) +
    0.00029 * Math.sin(DR * 3 * M)
  let L = (L0 + DL) * DR
  L = L - PI * 2 * Math.floor(L / (PI * 2))
  return L
}

/**
 * Major solar term (0–11, each 30° of sun longitude) at the start of the
 * given local day.
 */
export function getSunLongitude(
  dayNumber: number,
  timeZone = VN_TIME_ZONE
): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6)
}

/** Julian day number of the first day of lunar month 11 of the given year. */
export function getLunarMonth11(yy: number, timeZone = VN_TIME_ZONE): number {
  const off = jdFromDate(31, 12, yy) - 2415021
  const k = Math.floor(off / SYNODIC_MONTH)
  let nm = getNewMoonDay(k, timeZone)
  if (getSunLongitude(nm, timeZone) >= 9) {
    nm = getNewMoonDay(k - 1, timeZone)
  }
  return nm
}

/**
 * Offset (in months after month 11 starting at a11) of the leap month: the
 * first month without a major solar term.
 */
export function getLeapMonthOffset(
  a11: number,
  timeZone = VN_TIME_ZONE
): number {
  const k = Math.floor((a11 - NEW_MOON_EPOCH) / SYNODIC_MONTH + 0.5)
  let last: number
  let i = 1
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  do {
    last = arc
    i++
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  } while (arc !== last && i < 14)
  return i - 1
}

/** Converts a solar date to the lunar date. */
export function convertSolar2Lunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = VN_TIME_ZONE
): LunarParts {
  const dayNumber = jdFromDate(dd, mm, yy)
  const k = Math.floor((dayNumber - NEW_MOON_EPOCH) / SYNODIC_MONTH)
  let monthStart = getNewMoonDay(k + 1, timeZone)
  for (let i = k; monthStart > dayNumber; i--) {
    monthStart = getNewMoonDay(i, timeZone)
  }
  let a11 = getLunarMonth11(yy, timeZone)
  let b11 = a11
  let lunarYear: number
  if (a11 >= monthStart) {
    lunarYear = yy
    a11 = getLunarMonth11(yy - 1, timeZone)
  } else {
    lunarYear = yy + 1
    b11 = getLunarMonth11(yy + 1, timeZone)
  }
  const lunarDay = dayNumber - monthStart + 1
  const diff = Math.floor((monthStart - a11) / 29)
  let leap = false
  let lunarMonth = diff + 11
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone)
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10
      if (diff === leapMonthDiff) leap = true
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap }
}

/**
 * Julian day number of the first day of a lunar month, or null when the
 * year has no such (leap) month.
 */
export function lunarMonthStart(
  lunarMonth: number,
  lunarYear: number,
  leap: boolean,
  timeZone = VN_TIME_ZONE
): { start: number; length: number } | null {
  if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) {
    return null
  }
  let a11: number
  let b11: number
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone)
    b11 = getLunarMonth11(lunarYear, timeZone)
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone)
    b11 = getLunarMonth11(lunarYear + 1, timeZone)
  }
  const k = Math.floor(0.5 + (a11 - NEW_MOON_EPOCH) / SYNODIC_MONTH)
  let off = lunarMonth - 11
  if (off < 0) off += 12
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone)
    let leapMonth = leapOff - 2
    if (leapMonth <= 0) leapMonth += 12
    if (leap && lunarMonth !== leapMonth) return null
    if (leap || off >= leapOff) off += 1
  } else if (leap) {
    return null
  }
  const start = getNewMoonDay(k + off, timeZone)
  const next = getNewMoonDay(k + off + 1, timeZone)
  return { start, length: next - start }
}

/** The leap month (1–12) of a lunar year, or 0 when the year has none. */
export function getLeapMonth(
  lunarYear: number,
  timeZone = VN_TIME_ZONE
): number {
  // A leap year spans 13 months from one month 11 to the next. Months 11
  // and 12 belong to the lunar year in which month 11 starts.
  const leapIn = (a11: number, b11: number): number => {
    if (b11 - a11 <= 365) return 0
    const month = getLeapMonthOffset(a11, timeZone) - 2
    return month <= 0 ? month + 12 : month
  }
  const before = leapIn(
    getLunarMonth11(lunarYear - 1, timeZone),
    getLunarMonth11(lunarYear, timeZone)
  )
  if (before >= 1 && before <= 10) return before
  const after = leapIn(
    getLunarMonth11(lunarYear, timeZone),
    getLunarMonth11(lunarYear + 1, timeZone)
  )
  return after === 11 || after === 12 ? after : 0
}

/**
 * Converts a lunar date to the solar date [day, month, year], or null when
 * the date does not exist (no such leap month, or day beyond the month).
 */
export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  leap: boolean,
  timeZone = VN_TIME_ZONE
): [number, number, number] | null {
  const month = lunarMonthStart(lunarMonth, lunarYear, leap, timeZone)
  if (!month || !Number.isInteger(lunarDay) || lunarDay < 1) return null
  if (lunarDay > month.length) return null
  return jdToDate(month.start + lunarDay - 1)
}
