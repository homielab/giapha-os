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
  limit = 20
): MemberSearchResult<T>[] {
  return searchPersons(members, query, limit).map((member) => ({
    member,
    years: formatLifeYears(member)
  }))
}
