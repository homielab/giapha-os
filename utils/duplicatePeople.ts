import { SupabaseClient } from '@supabase/supabase-js'

import { normalizeSearchText } from '@/utils/search'
import { fetchAllRows } from '@/utils/supabase/fetchAll'

export interface PossibleDuplicate {
  id: string
  full_name: string
  birth_year: number | null
}

/**
 * Finds members with the same name (ignoring accents, case and extra spaces)
 * and the same birth year; two members without a birth year match on the name
 * alone. The database has no unaccent, so the rows of that birth year are
 * read and compared here. Throws when a query fails.
 */
export async function findPossibleDuplicates(
  supabase: SupabaseClient,
  fullName: string,
  birthYear: number | null
): Promise<PossibleDuplicate[]> {
  const name = normalizeSearchText(fullName)
  if (name === '') return []

  const { data, error } = await fetchAllRows<PossibleDuplicate>((from, to) => {
    const query = supabase.from('persons').select('id, full_name, birth_year')
    return (
      birthYear == null
        ? query.is('birth_year', null)
        : query.eq('birth_year', birthYear)
    )
      .order('id')
      .range(from, to)
  })
  if (error) throw error

  return data.filter((p) => normalizeSearchText(p.full_name) === name)
}

export interface DuplicateScanPerson {
  id: string
  full_name: string
  birth_year: number | null
  death_year: number | null
  /** Shown when only a lunar date of death is known. */
  death_lunar_year?: number | null
}

export interface DuplicateScanRelationship {
  type: string
  person_a: string
  person_b: string
}

export interface DuplicateGroupMember extends DuplicateScanPerson {
  /** Relationships (marriage, parent, child) the person is part of. */
  relationshipCount: number
}

export interface DuplicateGroup {
  members: DuplicateGroupMember[]
}

/** Columns the whole-tree duplicate scan reads. */
export const DUPLICATE_SCAN_PERSON_COLUMNS =
  'id, full_name, birth_year, death_year, death_lunar_year'

const PARENT_CHILD_TYPES = new Set(['biological_child', 'adopted_child'])

/**
 * Groups members that may be the same person. Two members match when their
 * names are equal (ignoring accents, case and extra spaces) and either both
 * have the same birth year, or they share a parent. Matches chain: A~B and
 * B~C put all three in one group. Pure: reads nothing, writes nothing.
 * Groups and their members are sorted by name, then birth year.
 */
export function groupPossibleDuplicates(
  persons: DuplicateScanPerson[],
  relationships: DuplicateScanRelationship[]
): DuplicateGroup[] {
  const relationshipCount = new Map<string, number>()
  const parentsOf = new Map<string, Set<string>>()
  for (const r of relationships) {
    relationshipCount.set(
      r.person_a,
      (relationshipCount.get(r.person_a) ?? 0) + 1
    )
    relationshipCount.set(
      r.person_b,
      (relationshipCount.get(r.person_b) ?? 0) + 1
    )
    if (PARENT_CHILD_TYPES.has(r.type)) {
      const parents = parentsOf.get(r.person_b) ?? new Set<string>()
      parents.add(r.person_a)
      parentsOf.set(r.person_b, parents)
    }
  }

  const byName = new Map<string, DuplicateScanPerson[]>()
  for (const person of persons) {
    const name = normalizeSearchText(person.full_name)
    if (name === '') continue
    const list = byName.get(name)
    if (list) list.push(person)
    else byName.set(name, [person])
  }

  const sharesParent = (a: string, b: string): boolean => {
    const pa = parentsOf.get(a)
    const pb = parentsOf.get(b)
    if (!pa || !pb) return false
    for (const p of pa) if (pb.has(p)) return true
    return false
  }

  const groups: DuplicateGroup[] = []
  for (const sameName of byName.values()) {
    if (sameName.length < 2) continue

    // Union-find over the people sharing one name.
    const root = sameName.map((_, i) => i)
    const find = (i: number): number => {
      while (root[i] !== i) {
        root[i] = root[root[i]]
        i = root[i]
      }
      return i
    }
    for (let i = 0; i < sameName.length; i++) {
      for (let j = i + 1; j < sameName.length; j++) {
        const a = sameName[i]
        const b = sameName[j]
        const sameYear = a.birth_year != null && a.birth_year === b.birth_year
        if (sameYear || sharesParent(a.id, b.id)) root[find(j)] = find(i)
      }
    }

    const clusters = new Map<number, DuplicateScanPerson[]>()
    sameName.forEach((person, i) => {
      const key = find(i)
      const list = clusters.get(key)
      if (list) list.push(person)
      else clusters.set(key, [person])
    })
    for (const cluster of clusters.values()) {
      if (cluster.length < 2) continue
      groups.push({
        members: cluster
          .sort(
            (a, b) =>
              (a.birth_year ?? Infinity) - (b.birth_year ?? Infinity) ||
              a.id.localeCompare(b.id)
          )
          .map((person) => ({
            ...person,
            relationshipCount: relationshipCount.get(person.id) ?? 0
          }))
      })
    }
  }

  return groups.sort(
    (a, b) =>
      a.members[0].full_name.localeCompare(b.members[0].full_name, 'vi') ||
      a.members[0].id.localeCompare(b.members[0].id)
  )
}
