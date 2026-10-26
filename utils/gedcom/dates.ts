/**
 * A GEDCOM date is `[[DD] MON] YYYY`: a day needs a month and every date
 * needs a year, so a day without a month (or a date without a year) is left
 * out instead of being written as an invalid or misread date.
 */
export function formatDate(
  day: number | null | undefined,
  month: number | null | undefined,
  year: number | null | undefined
): string {
  if (!year || year <= 0) return ''
  const mon = getMonthName(month ?? null)
  const dd = mon && day && day > 0 ? String(day).padStart(2, '0') : ''
  return `2 DATE ${[dd, mon, String(year)].filter(Boolean).join(' ')}\n`
}

export function getMonthName(month: number | null): string {
  if (!month) return ''
  const months = [
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
  ]
  return months[month - 1] || ''
}

export function parseMonthName(name: string): number | null {
  const months = [
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
  ]
  const index = months.findIndex((m) => m === name.toUpperCase())
  return index !== -1 ? index + 1 : null
}

export type ParsedDate = {
  day: number | null
  month: number | null
  year: number | null
  /** The original text when only the first date of a range was kept. */
  rangeText: string | null
}

const CALENDAR_ESCAPE = /^@#D[^@]*@\s*/i
const DATE_QUALIFIER = /^(ABT|EST|AFT|BEF|CAL|INT)\s+/i

/**
 * Reads a GEDCOM date value. Qualifiers (ABT, EST, AFT, BEF, CAL, INT) and
 * calendar escapes (`@#DJULIAN@`) are ignored; for a range (`BET a AND b`,
 * `FROM a TO b`, `TO b`) the first date is kept and the original text is
 * returned in `rangeText`.
 */
export function parseGedcomDate(raw: string): ParsedDate {
  const clean = (v: string) => {
    let out = v.replace(/\(.*\)/, ' ').trim()
    for (;;) {
      const next = out.replace(CALENDAR_ESCAPE, '').replace(DATE_QUALIFIER, '')
      if (next === out) return out.trim()
      out = next
    }
  }
  let value = clean(raw)
  let rangeText: string | null = null
  const between = value.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i)
  const from = value.match(/^FROM\s+(.+?)(?:\s+TO\s+(.+))?$/i)
  const to = value.match(/^TO\s+(.+)$/i)
  const first = between?.[1] ?? from?.[1] ?? to?.[1]
  if (first !== undefined) {
    rangeText = value
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
  return date
}
