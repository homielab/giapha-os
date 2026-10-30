import { isValidSolarDate } from '../lunarCalendar'

/**
 * A GEDCOM date is `[[DD] MON] YYYY`: a day needs a month and every date
 * needs a year, so a day without a month is left out instead of being written
 * as an invalid or misread date. A day and month without a year (a birthday
 * or death anniversary whose year is unknown) has no GEDCOM date: it is
 * written as the custom tag `2 _DATEDM <day> <month>`, read back by
 * `parseDayMonth`; anything else without a year is left out.
 */
export function formatDate(
  day: number | null | undefined,
  month: number | null | undefined,
  year: number | null | undefined
): string {
  if (!year || year <= 0) {
    return day && month && isValidDayMonth(day, month)
      ? `2 _DATEDM ${day} ${month}\n`
      : ''
  }
  const mon = getMonthName(month ?? null)
  const dd = mon && day && day > 0 ? String(day).padStart(2, '0') : ''
  return `2 DATE ${[dd, mon, String(year)].filter(Boolean).join(' ')}\n`
}

const GEDCOM_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC'
] as const

export function getMonthName(month: number | null): string {
  if (!month) return ''
  return GEDCOM_MONTHS[month - 1] || ''
}

export function parseMonthName(name: string): number | null {
  const index = GEDCOM_MONTHS.findIndex((m) => m === name.toUpperCase())
  return index !== -1 ? index + 1 : null
}

export type ParsedDate = {
  day: number | null
  month: number | null
  year: number | null
  /**
   * The original text when the date was not kept as written: only the first
   * date of a range, or a day that does not exist (`31 APR 1850`).
   */
  rangeText: string | null
}

const CALENDAR_ESCAPE = /^@#D[^@]*@\s*/i
const DATE_QUALIFIER = /^(ABT|EST|AFT|BEF|CAL|INT)\s+/i

/**
 * Reads a GEDCOM date value. Calendar escapes (`@#DJULIAN@`) are ignored. A
 * qualifier (ABT, EST, AFT, BEF, CAL, INT) is dropped from the date and the
 * original text is returned in `rangeText`, so an estimate stays visible; for a range (`BET a AND b`,
 * `FROM a TO b`, `TO b`) the first date is kept and the original text is
 * returned in `rangeText`. A day that does not exist in that month and year
 * (`31 APR 1850`, `29 FEB 1900`) is dropped, keeping month and year, and the
 * original text is returned in `rangeText` too.
 */
export function parseGedcomDate(raw: string): ParsedDate {
  let qualified = false
  const clean = (v: string) => {
    let out = v.replace(/\(.*\)/, ' ').trim()
    for (;;) {
      const unescaped = out.replace(CALENDAR_ESCAPE, '')
      const next = unescaped.replace(DATE_QUALIFIER, '')
      if (next !== unescaped) qualified = true
      if (next === out) return out.trim()
      out = next
    }
  }
  let value = clean(raw)
  let rangeText: string | null = qualified
    ? raw
        .replace(/@#D[^@]*@\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    : null
  const between = value.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i)
  const from = value.match(/^FROM\s+(.+?)(?:\s+TO\s+(.+))?$/i)
  const to = value.match(/^TO\s+(.+)$/i)
  const first = between?.[1] ?? from?.[1] ?? to?.[1]
  if (first !== undefined) {
    rangeText ??= value
    value = clean(first)
  }
  const parts = value.split(/\s+/).filter(Boolean)
  const date: ParsedDate = { day: null, month: null, year: null, rangeText }
  if (parts.length === 3) {
    date.day = parseInt(parts[0]) || null
    date.month = parseMonthName(parts[1])
    date.year = parseInt(parts[2]) || null
  } else if (parts.length === 1) {
    date.year = parseInt(parts[0]) || null
  } else if (parts.length === 2) {
    date.month = parseMonthName(parts[0])
    date.year = parseInt(parts[1]) || null
  }
  if (
    date.day !== null &&
    date.month !== null &&
    date.year !== null &&
    !isValidSolarDate(date.year, date.month, date.day)
  ) {
    date.day = null
    date.rangeText ??= value
  }
  return date
}

// A day and month that exist in some year (29 February included).
function isValidDayMonth(day: number, month: number): boolean {
  return isValidSolarDate(2000, month, day)
}

/** Reads the value of a `_DATEDM <day> <month>` tag; null when invalid. */
export function parseDayMonth(
  raw: string
): { day: number; month: number } | null {
  const match = raw.trim().match(/^(\d{1,2})\s+(\d{1,2})$/)
  if (!match) return null
  const day = parseInt(match[1])
  const month = parseInt(match[2])
  return isValidDayMonth(day, month) ? { day, month } : null
}
