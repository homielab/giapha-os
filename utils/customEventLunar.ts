import { leapMonthOf, lunarToSolar } from '@/utils/lunarCalendar'

export interface LunarEventInput {
  day: number | ''
  month: number | ''
  year: number | ''
  leap: boolean
}

/**
 * Result of a lunar date typed into the custom event form:
 * - `ok`: the solar date (YYYY-MM-DD) to save;
 * - `incomplete`: a field is empty or the year is still being typed (≤ 100);
 * - `invalid`: the day does not exist in that lunar month (e.g. 30 of a
 *   29-day month), or a value is out of range.
 */
export type LunarEventDate =
  | { status: 'ok'; date: string }
  | { status: 'incomplete' }
  | { status: 'invalid' }

export function resolveLunarEventDate(input: LunarEventInput): LunarEventDate {
  const { day, month, year } = input
  if (day === '' || month === '' || year === '' || year <= 100) {
    return { status: 'incomplete' }
  }
  // The leap flag only counts when that year has this very leap month.
  const leap = input.leap && leapMonthOf(year) === month
  const solar = lunarToSolar(year, month, day, leap)
  if (!solar) return { status: 'invalid' }
  const m = String(solar.month).padStart(2, '0')
  const d = String(solar.day).padStart(2, '0')
  return { status: 'ok', date: `${solar.year}-${m}-${d}` }
}
