/**
 * Normalizes text for accent-insensitive Vietnamese search:
 * "Nguyễn Văn Đức" -> "nguyen van duc".
 */
export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export const PERSON_SEARCH_LIMIT = 20

/**
 * Accent-insensitive person search. A query matches when it is contained in
 * the normalized name (or other names); results are ranked by name starting
 * with the query, then a word starting with it, then any other match, and
 * ties go alphabetically (Vietnamese collation).
 */
export function searchPersons<
  T extends { full_name: string; other_names?: string | null }
>(persons: T[], query: string, limit: number = PERSON_SEARCH_LIMIT): T[] {
  const q = normalizeSearchText(query)
  if (!q) return []

  const ranked: { person: T; rank: number }[] = []
  for (const person of persons) {
    const name = normalizeSearchText(person.full_name)
    let rank = -1
    if (name.startsWith(q)) rank = 0
    else if (name.includes(` ${q}`)) rank = 1
    else if (name.includes(q)) rank = 2
    else if (normalizeSearchText(person.other_names).includes(q)) rank = 3
    if (rank >= 0) ranked.push({ person, rank })
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.person.full_name.localeCompare(b.person.full_name, 'vi')
  )
  return ranked.slice(0, limit).map((r) => r.person)
}

/** Per-person index for the member list filter: names kept apart, years as text. */
export interface PersonSearchIndex {
  names: string[]
  years: string[]
}

export function buildPersonSearchIndex(person: {
  full_name: string
  other_names?: string | null
  birth_year?: number | null
  death_year?: number | null
}): PersonSearchIndex {
  return {
    names: [person.full_name, person.other_names]
      .map(normalizeSearchText)
      .filter(Boolean),
    years: [person.birth_year, person.death_year]
      .filter((y): y is number => typeof y === 'number')
      .map(String)
  }
}

/**
 * True when every word of the query matches: number words must equal the
 * birth or death year, the other words must all occur in the same name field
 * (full name or other names), so a query never spans both fields.
 */
export function matchesPersonSearch(
  index: PersonSearchIndex,
  query: string
): boolean {
  const words = normalizeSearchText(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const yearWords = words.filter((w) => /^\d+$/.test(w))
  const nameWords = words.filter((w) => !/^\d+$/.test(w))
  if (!yearWords.every((w) => index.years.includes(w))) return false
  if (nameWords.length === 0) return true
  return index.names.some((name) => nameWords.every((w) => name.includes(w)))
}
