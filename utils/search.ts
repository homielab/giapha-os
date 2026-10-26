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
