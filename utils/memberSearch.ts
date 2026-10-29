import { searchPersons } from '@/utils/search'

/** Columns the global member search loads (name, birth and death year). */
export const GLOBAL_SEARCH_COLUMNS =
  'id, full_name, gender, birth_year, death_year, is_deceased, other_names'

export interface SearchableMember {
  id: string
  full_name: string
  other_names?: string | null
  birth_year?: number | null
  death_year?: number | null
  is_deceased?: boolean | null
}

export interface MemberSearchResult<T extends SearchableMember> {
  member: T
  /** "1950 – 2020", "1950", "– 2020" or "" when no year is known. */
  years: string
}

/** Years shown beside a name so two people with the same name can be told apart. */
export function formatLifeYears(member: SearchableMember): string {
  const birth = member.birth_year ?? null
  const death = member.death_year ?? null
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
