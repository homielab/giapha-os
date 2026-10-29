import { searchPersons } from '@/utils/search'

/** Columns the global member search loads (name, birth and death year). */
export const GLOBAL_SEARCH_COLUMNS =
  'id, full_name, gender, birth_year, death_year, death_lunar_year, is_deceased, other_names'

/** The year fields a life span is shown from. */
export interface LifeYearsPerson {
  birth_year?: number | null
  death_year?: number | null
  death_lunar_year?: number | null
  is_deceased?: boolean | null
}

export interface SearchableMember extends LifeYearsPerson {
  id: string
  full_name: string
  other_names?: string | null
}

export interface MemberSearchResult<T extends SearchableMember> {
  member: T
  /** "1950 – 2020", "1950", "– 2020" or "" when no year is known. */
  years: string
}

/**
 * Year of death to show next to a solar birth year: the solar year, or the
 * lunar year when only a lunar date of death is known. A death on 10/02/2021
 * (lunar 29/12/2020) is 2021, like everywhere else.
 */
export function deathYearOf(person: LifeYearsPerson): number | null {
  return person.death_year || person.death_lunar_year || null
}

/**
 * "1950 → 2021" on member cards and the mind map: the death part only for a
 * deceased person, `unknown` in place of a missing year.
 */
export function lifeYearsLabel(
  person: LifeYearsPerson,
  unknown: string
): string {
  const birth = `${person.birth_year || unknown}`
  if (!person.is_deceased) return birth
  return `${birth} → ${deathYearOf(person) ?? unknown}`
}

/** Years shown beside a name so two people with the same name can be told apart. */
export function formatLifeYears(member: SearchableMember): string {
  const birth = member.birth_year || null
  const death = deathYearOf(member)
  if (birth && death) return `${birth} – ${death}`
  if (birth) return member.is_deceased ? `${birth} – ?` : `${birth}`
  if (death) return `– ${death}`
  return ''
}

/**
 * Accent-insensitive ranking for the global search (name starts with the
 * query, then a word starts with it, then contains it, then other names),
 * at most `limit` results, each with the life years for display.
 */
export function rankMembers<T extends SearchableMember>(
  query: string,
  members: T[],
  limit = GLOBAL_SEARCH_LIMIT
): MemberSearchResult<T>[] {
  return searchPersons(members, query, limit).map((member) => ({
    member,
    years: formatLifeYears(member)
  }))
}

/** Most results the global search shows; more matches mean "type more". */
export const GLOBAL_SEARCH_LIMIT = 20

export type SearchStatus =
  | { key: 'globalSearchLoading' }
  | { key: 'globalSearchNoResults' }
  | { key: 'globalSearchResultCount'; count: number }
  | { key: 'globalSearchResultsCapped'; count: number }

/**
 * Message for the search's live status region: loading, no match, how many
 * matched, or that the list stops at `limit` and a more precise name helps.
 * `results` is the number shown for a non-empty query.
 */
export function searchStatusKey(
  loading: boolean,
  results: number,
  limit = GLOBAL_SEARCH_LIMIT
): SearchStatus {
  if (loading) return { key: 'globalSearchLoading' }
  if (results === 0) return { key: 'globalSearchNoResults' }
  if (results >= limit)
    return { key: 'globalSearchResultsCapped', count: results }
  return { key: 'globalSearchResultCount', count: results }
}
