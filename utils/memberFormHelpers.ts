import { Gender } from '@/types'
import {
  lunarToSolar as convertLunarToSolar,
  solarToLunar as convertSolarToLunar
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
  if (day !== '' && (day < 1 || day > 31)) return false
  if (month !== '' && (month < 1 || month > 12)) return false
  if (year !== '' && year < 1) return false

  if (day !== '' && month !== '') {
    const currentYear = year !== '' ? year : 2000
    const daysInMonth = new Date(currentYear, month, 0).getDate()
    if (day > daysInMonth) return false
  }
  return true
}

export type MemberValidationError =
  | 'invalidBirthDate'
  | 'invalidLunarDate'
  | 'invalidDeathDate'
  | 'deathBeforeBirth'
  | null

// Full submit-time validation for the member form. Returns a translation key
// when validation fails, or null when everything is consistent.
export function validateMemberForm(
  birthDay: number | '',
  birthMonth: number | '',
  birthYear: number | '',
  isDeceased: boolean,
  deathValues: DeathDateValues
): MemberValidationError {
  if (!isValidDate(birthDay, birthMonth, birthYear)) return 'invalidBirthDate'

  if (
    isDeceased &&
    !isValidDate(deathValues.day, deathValues.month, deathValues.year)
  )
    return 'invalidDeathDate'

  if (
    isDeceased &&
    birthYear !== '' &&
    deathValues.year !== '' &&
    deathValues.year < birthYear
  )
    return 'deathBeforeBirth'

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
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '') return null
  // The leap-month flag is not stored: a leap month is saved as its number.
  const lunar = convertSolarToLunar(y, m, d)
  return lunar ? { day: lunar.day, month: lunar.month, year: lunar.year } : null
}

export function lunarToSolar(
  d: number | '',
  m: number | '',
  y: number | ''
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '') return null
  // Entered lunar dates are read as regular (non-leap) months.
  return convertLunarToSolar(y, m, d)
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
}

const toNumberOrNull = (v: number | '') => (v === '' ? null : Number(v))

export function buildPersonData(fields: MemberFormFields, url: string | null) {
  const d = fields.isDeceased
  return {
    full_name: fields.fullName,
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
    other_names: fields.otherNames || null,
    avatar_url: url,
    note: fields.note || null
  }
}

// Converters that tolerate partial input and invalid dates (used by the
// live-sync death date fields).
export function solarToLunarSafe(
  d: number | '',
  m: number | '',
  y: number | ''
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '' || y <= 100) return null
  return solarToLunar(d, m, y)
}

export function lunarToSolarSafe(
  d: number | '',
  m: number | '',
  y: number | ''
): { day: number; month: number; year: number } | null {
  if (d === '' || m === '' || y === '' || y <= 100) return null
  return lunarToSolar(d, m, y)
}
