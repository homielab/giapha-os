import { Gender } from '@/types'
import { vnToday } from '@/utils/dateHelpers'
import { MAX_NAME, MAX_NOTE, MAX_PRIVATE } from '@/utils/limits'
import {
  lunarToSolar as convertLunarToSolar,
  solarToLunar as convertSolarToLunar,
  leapMonthOf
} from '@/utils/lunarCalendar'

export function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidDate(
  day: number | '',
  month: number | '',
  year: number | ''
) {
  for (const v of [day, month, year]) {
    if (v !== '' && !Number.isInteger(v)) return false
  }
  if (day !== '' && (day < 1 || day > 31)) return false
  if (month !== '' && (month < 1 || month > 12)) return false
  if (year !== '' && year < 1) return false

  if (day !== '' && month !== '') {
    // Unknown year: a leap year, so 29/02 is accepted.
    if (day > daysInMonth(year !== '' ? year : 2000, month)) return false
  }
  return true
}

// Days in a month of the proleptic Gregorian calendar. Uses setUTCFullYear
// because Date maps years 0–99 to 1900–1999.
function daysInMonth(year: number, month: number) {
  const date = new Date(Date.UTC(2000, 0, 1))
  date.setUTCFullYear(year, month, 0)
  return date.getUTCDate()
}

/**
 * Compares two partial dates as far as both are known: year, then month when
 * both have one, then day when both have one. Negative when `a` is earlier,
 * 0 when they cannot be told apart, null when a year is missing.
 */
export function comparePartialDates(
  a: { day: number | ''; month: number | ''; year: number | '' },
  b: { day: number | ''; month: number | ''; year: number | '' }
): number | null {
  if (a.year === '' || b.year === '') return null
  if (a.year !== b.year) return a.year - b.year
  if (a.month === '' || b.month === '') return 0
  if (a.month !== b.month) return a.month - b.month
  if (a.day === '' || b.day === '') return 0
  return a.day - b.day
}

export type MemberValidationError =
  | 'fullNameRequired'
  | 'dayNeedsMonth'
  | 'invalidBirthDate'
  | 'invalidLunarDate'
  | 'invalidDeathDate'
  | 'deathBeforeBirth'
  | 'birthInFuture'
  | 'deathInFuture'
  | 'yearNotFourDigits'
  | 'invalidWholeNumber'
  | null

/** Smallest year the member form accepts: typing 85 for 1985 is refused. */
export const MIN_FORM_YEAR = 1000

const isShortYear = (year: number | '') =>
  year !== '' && Number.isInteger(year) && year >= 1 && year < MIN_FORM_YEAR

// Full submit-time validation for the member form. Returns a translation key
// when validation fails, or null when everything is consistent. Years must
// have four digits; day, month, year, birth order and generation must be
// whole numbers.
export function validateMemberForm(
  birthDay: number | '',
  birthMonth: number | '',
  birthYear: number | '',
  isDeceased: boolean,
  deathValues: DeathDateValues,
  fullName?: string,
  today: Date = vnToday(),
  counts: { birthOrder: number | ''; generation: number | '' } = {
    birthOrder: '',
    generation: ''
  }
): MemberValidationError {
  // Only checked when given: a name of spaces passes the input's `required`.
  if (fullName !== undefined && fullName.trim() === '')
    return 'fullNameRequired'

  if (
    isShortYear(birthYear) ||
    (isDeceased &&
      (isShortYear(deathValues.year) || isShortYear(deathValues.lunarYear)))
  )
    return 'yearNotFourDigits'

  for (const v of [counts.birthOrder, counts.generation]) {
    if (v !== '' && !Number.isInteger(v)) return 'invalidWholeNumber'
  }

  if (
    (birthDay !== '' && birthMonth === '') ||
    (isDeceased &&
      ((deathValues.day !== '' && deathValues.month === '') ||
        (deathValues.lunarDay !== '' && deathValues.lunarMonth === '')))
  )
    return 'dayNeedsMonth'

  if (!isValidDate(birthDay, birthMonth, birthYear)) return 'invalidBirthDate'

  if (
    isDeceased &&
    !isValidDate(deathValues.day, deathValues.month, deathValues.year)
  )
    return 'invalidDeathDate'

  if (isDeceased && !isValidLunarParts(deathValues)) return 'invalidDeathDate'

  // Typos such as 2062 for 1962. A date missing its month or day is only
  // compared as far as it is known. Death dates are already solar here: a
  // lunar-only date was converted by normalizeDeathDates.
  const now = {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear()
  }
  const birth = { day: birthDay, month: birthMonth, year: birthYear }
  const afterToday = (d: typeof birth) => {
    const order = comparePartialDates(d, now)
    return order != null && order > 0
  }
  if (afterToday(birth)) return 'birthInFuture'
  if (isDeceased && afterToday(deathValues)) return 'deathInFuture'

  if (isDeceased) {
    const order = comparePartialDates(deathValues, {
      day: birthDay,
      month: birthMonth,
      year: birthYear
    })
    if (order != null && order < 0) return 'deathBeforeBirth'
  }

  return null
}

export interface DeathDateValues {
  day: number | ''
  month: number | ''
  year: number | ''
  lunarDay: number | ''
  lunarMonth: number | ''
  lunarYear: number | ''
}

export type DateSyncResult =
  | { ok: true; values: DeathDateValues }
  | { ok: false; errorKey: 'invalidLunarDate' }

// Reconcile solar/lunar death dates before submit: convert whichever side is
// complete to fill the other, and clear everything when not deceased.
export function normalizeDeathDates(
  isDeceased: boolean,
  input: DeathDateValues
): DateSyncResult {
  let { day, month, year, lunarDay, lunarMonth, lunarYear } = input

  if (
    isDeceased &&
    lunarDay !== '' &&
    lunarMonth !== '' &&
    lunarYear !== '' &&
    (day === '' || month === '' || year === '')
  ) {
    const solar = lunarToSolar(lunarDay, lunarMonth, lunarYear)
    if (!solar) return { ok: false, errorKey: 'invalidLunarDate' }
    day = solar.day
    month = solar.month
    year = solar.year
  } else if (
    isDeceased &&
    day !== '' &&
    month !== '' &&
    year !== '' &&
    (lunarDay === '' || lunarMonth === '' || lunarYear === '')
  ) {
    // Sync from Solar back to Lunar; safe fallback if conversion fails
    const lunar = solarToLunar(day, month, year)
    if (lunar) {
      lunarDay = lunar.day
      lunarMonth = lunar.month
      lunarYear = lunar.year
    }
  } else if (!isDeceased) {
    // Clear all
    day = ''
    month = ''
    year = ''
    lunarDay = ''
    lunarMonth = ''
    lunarYear = ''
  }

  return {
    ok: true,
    values: { day, month, year, lunarDay, lunarMonth, lunarYear }
  }
}

export function solarToLunar(
  d: number | '',
  m: number | '',
  y: number | ''
): { day: number; month: number; year: number; leap: boolean } | null {
  if (d === '' || m === '' || y === '') return null
  // The leap-month flag is not stored: a leap month is saved as its number.
  const lunar = convertSolarToLunar(y, m, d)
  return lunar
    ? { day: lunar.day, month: lunar.month, year: lunar.year, leap: lunar.leap }
    : null
}

/**
 * A lunar day/month, complete or not, that can exist: day 1–30, month 1–12;
 * with a year, the day must exist in that month (regular or leap).
 */
export function isValidLunarParts(v: {
  lunarDay: number | ''
  lunarMonth: number | ''
  lunarYear: number | ''
}): boolean {
  const { lunarDay: d, lunarMonth: m, lunarYear: y } = v
  if (d !== '' && (!Number.isInteger(d) || d < 1 || d > 30)) return false
  if (m !== '' && (!Number.isInteger(m) || m < 1 || m > 12)) return false
  if (d === '' || m === '' || y === '' || y <= 100) return true
  return (
    convertLunarToSolar(y, m, d, false) !== null ||
    (hasLeapMonth(m, y) && convertLunarToSolar(y, m, d, true) !== null)
  )
}

export function lunarToSolar(
  d: number | '',
  m: number | '',
  y: number | '',
  leap = false
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '') return null
  // Regular month unless the caller says it is the leap one.
  return convertLunarToSolar(y, m, d, leap)
}

/** True when the lunar year has a leap month with this number. */
export function hasLeapMonth(month: number | '', year: number | ''): boolean {
  if (month === '' || year === '' || year <= 100) return false
  return leapMonthOf(year) === month
}

/**
 * Leap flag after the lunar month or year was edited: kept only while the
 * month and year are unchanged and the year still has that leap month.
 */
export function nextLeapFlag(
  prev: { month: number | ''; year: number | ''; leap: boolean },
  next: { month: number | ''; year: number | '' }
): boolean {
  return (
    prev.leap &&
    prev.month === next.month &&
    prev.year === next.year &&
    hasLeapMonth(next.month, next.year)
  )
}

export interface TooLongText {
  /** Translation key of the field's label. */
  label:
    | 'fullName'
    | 'otherNames'
    | 'note'
    | 'burialPlace'
    | 'phone'
    | 'occupation'
    | 'residence'
  max: number
}

/**
 * The first form text over the limits a backup is checked against (see
 * utils/limits.ts), or null. Without this a long biography saves but the
 * backup that holds it cannot be restored.
 */
export function findTooLongText(values: {
  fullName: string
  otherNames: string
  note: string
  burialPlace: string
  phoneNumber: string
  occupation: string
  currentResidence: string
}): TooLongText | null {
  const checks: [TooLongText['label'], string, number][] = [
    ['fullName', values.fullName, MAX_NAME],
    ['otherNames', values.otherNames, MAX_NOTE],
    ['note', values.note, MAX_NOTE],
    ['burialPlace', values.burialPlace, MAX_NOTE],
    ['phone', values.phoneNumber, MAX_PRIVATE],
    ['occupation', values.occupation, MAX_PRIVATE],
    ['residence', values.currentResidence, MAX_PRIVATE]
  ]
  for (const [label, value, max] of checks) {
    if (value.length > max) return { label, max }
  }
  return null
}

export interface MemberFormFields {
  fullName: string
  gender: Gender
  birthYear: number | ''
  birthMonth: number | ''
  birthDay: number | ''
  deathYear: number | ''
  deathMonth: number | ''
  deathDay: number | ''
  deathLunarYear: number | ''
  deathLunarMonth: number | ''
  deathLunarDay: number | ''
  isDeceased: boolean
  isInLaw: boolean
  birthOrder: number | ''
  generation: number | ''
  otherNames: string
  note: string
  /** Kept only for a deceased member, like the death dates. */
  burialPlace: string
}

/** NFC, inner whitespace runs collapsed to one space, trimmed. */
export function cleanName(name: string): string {
  return name.normalize('NFC').replace(/\s+/g, ' ').trim()
}

const toNumberOrNull = (v: number | '') => (v === '' ? null : Number(v))

/**
 * The persons row of the member form. `burial_place` is only sent when there
 * is one to store or `hadBurialPlace` (the stored one is cleared): a database
 * not upgraded yet has no such column and refuses an unknown key.
 */
export function buildPersonData(
  fields: MemberFormFields,
  url: string | null,
  hadBurialPlace = false
) {
  const d = fields.isDeceased
  const burialPlace = d ? fields.burialPlace.trim() || null : null
  return {
    full_name: cleanName(fields.fullName),
    gender: fields.gender,
    birth_year: toNumberOrNull(fields.birthYear),
    birth_month: toNumberOrNull(fields.birthMonth),
    birth_day: toNumberOrNull(fields.birthDay),
    death_year: d ? toNumberOrNull(fields.deathYear) : null,
    death_month: d ? toNumberOrNull(fields.deathMonth) : null,
    death_day: d ? toNumberOrNull(fields.deathDay) : null,
    death_lunar_year: d ? toNumberOrNull(fields.deathLunarYear) : null,
    death_lunar_month: d ? toNumberOrNull(fields.deathLunarMonth) : null,
    death_lunar_day: d ? toNumberOrNull(fields.deathLunarDay) : null,
    is_deceased: fields.isDeceased,
    is_in_law: fields.isInLaw,
    birth_order: toNumberOrNull(fields.birthOrder),
    generation: toNumberOrNull(fields.generation),
    other_names: cleanName(fields.otherNames) || null,
    avatar_url: url,
    note: fields.note.trim() ? fields.note : null,
    ...(burialPlace !== null || hadBurialPlace
      ? { burial_place: burialPlace }
      : {})
  }
}

// Converters that tolerate partial input and invalid dates (used by the
// live-sync death date fields).
export function solarToLunarSafe(
  d: number | '',
  m: number | '',
  y: number | ''
): { day: number; month: number; year: number; leap: boolean } | null {
  if (d === '' || m === '' || y === '' || y <= 100) return null
  return solarToLunar(d, m, y)
}

export function lunarToSolarSafe(
  d: number | '',
  m: number | '',
  y: number | '',
  leap = false
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '' || y <= 100) return null
  return lunarToSolar(d, m, y, leap)
}
