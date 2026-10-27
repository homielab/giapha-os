import { solarToLunar, type LunarDate } from './lunarCalendar'
import { isUuid } from './uuid'

/**
 * Recomputing saved lunar death dates.
 *
 * Lunar death dates saved by earlier versions were converted with the Chinese
 * calendar (UTC+8). In the years where it differs from the Vietnamese calendar
 * (UTC+7) the saved date is a day or a month off. These helpers compare the
 * saved lunar date with the one the app computes today from the solar death
 * date, so an admin can review and fix the rows that differ.
 */

export interface LunarRecomputeSource {
  id: string
  full_name: string
  death_year: number | null
  death_month: number | null
  death_day: number | null
  death_lunar_year: number | null
  death_lunar_month: number | null
  death_lunar_day: number | null
}

export interface DateParts {
  year: number
  month: number
  day: number
}

export interface LunarRecomputeRow {
  id: string
  fullName: string
  /** Solar death date the lunar date is computed from. */
  solar: DateParts
  /** Lunar date currently saved (the database keeps no leap-month flag). */
  stored: DateParts
  /** Lunar date computed with the Vietnamese calendar. */
  recomputed: LunarDate
}

/** Columns to select from `persons` for the recompute. */
export const LUNAR_RECOMPUTE_COLUMNS =
  'id, full_name, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day'

/** Most rows one apply request accepts (same as the restore limit). */
export const MAX_RECOMPUTE_IDS = 10000

function isWholeNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
}

/**
 * The recompute for one person, or null when there is nothing to change:
 * the solar or lunar death date is incomplete, the solar date is invalid, or
 * the saved lunar date already matches.
 */
export function recomputeLunarDeathDate(
  person: LunarRecomputeSource
): LunarRecomputeRow | null {
  const {
    death_year,
    death_month,
    death_day,
    death_lunar_year,
    death_lunar_month,
    death_lunar_day
  } = person
  if (
    !isWholeNumber(death_year) ||
    !isWholeNumber(death_month) ||
    !isWholeNumber(death_day) ||
    !isWholeNumber(death_lunar_year) ||
    !isWholeNumber(death_lunar_month) ||
    !isWholeNumber(death_lunar_day)
  ) {
    return null
  }

  const recomputed = solarToLunar(death_year, death_month, death_day)
  if (!recomputed) return null

  if (
    recomputed.year === death_lunar_year &&
    recomputed.month === death_lunar_month &&
    recomputed.day === death_lunar_day
  ) {
    return null
  }

  return {
    id: person.id,
    fullName: person.full_name,
    solar: { year: death_year, month: death_month, day: death_day },
    stored: {
      year: death_lunar_year,
      month: death_lunar_month,
      day: death_lunar_day
    },
    recomputed
  }
}

/** Every person whose saved lunar death date differs from the recomputed one. */
export function findLunarMismatches(
  persons: LunarRecomputeSource[]
): LunarRecomputeRow[] {
  const rows: LunarRecomputeRow[] = []
  for (const person of persons) {
    const row = recomputeLunarDeathDate(person)
    if (row) rows.push(row)
  }
  return rows
}

/**
 * Validates the ids sent by the client: a non-empty array of unique UUIDs, at
 * most `MAX_RECOMPUTE_IDS`. Returns null when the input is not acceptable.
 */
export function parseRecomputeIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  if (input.length > MAX_RECOMPUTE_IDS) return null
  const ids = new Set<string>()
  for (const id of input) {
    if (typeof id !== 'string' || !isUuid(id)) return null
    ids.add(id.toLowerCase())
  }
  return [...ids]
}
