import type { Person } from '@/types'

/** Document title used while printing a profile: "Name (1950 – 2020)". */
export function memberPrintTitle(
  person: Pick<Person, 'full_name' | 'birth_year' | 'death_year'>
): string {
  const { full_name, birth_year, death_year } = person
  if (!birth_year && !death_year) return full_name
  const range = death_year
    ? `${birth_year ?? '?'} – ${death_year}`
    : `${birth_year} –`
  return `${full_name} (${range})`
}
