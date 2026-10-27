/**
 * Columns `computeEvents` reads from a person. No avatar or other profile
 * fields: the events views only need the name and the dates.
 */
export const EVENT_PERSON_COLUMNS =
  'id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased'

/**
 * PostgREST `.or()` filter keeping only people who can produce an event: a
 * solar birth day and month, or a lunar death day and month, or a solar death
 * day and month (the lunar date is derived from it). This is the condition
 * `computeEvents` uses, without `is_deceased`, so the list may hold a few
 * people it then skips but never drops one it would use. A lunar-only date
 * (no solar date) matches through the lunar columns.
 */
export const EVENT_PERSON_FILTER = [
  'and(birth_month.not.is.null,birth_day.not.is.null)',
  'and(death_lunar_month.not.is.null,death_lunar_day.not.is.null)',
  'and(death_month.not.is.null,death_day.not.is.null)'
].join(',')

/** In-memory twin of `EVENT_PERSON_FILTER` (used by the tests). */
export function hasEventDate(p: {
  birth_month: number | null
  birth_day: number | null
  death_month: number | null
  death_day: number | null
  death_lunar_month: number | null
  death_lunar_day: number | null
}): boolean {
  return (
    (p.birth_month != null && p.birth_day != null) ||
    (p.death_lunar_month != null && p.death_lunar_day != null) ||
    (p.death_month != null && p.death_day != null)
  )
}
