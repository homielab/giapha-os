import { SupabaseClient } from '@supabase/supabase-js'

import type { LinkedRelative } from '@/utils/relationshipValidation'

const RELATIVE_COLUMNS =
  'id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day'
const PARENT_CHILD_TYPES = ['biological_child', 'adopted_child']

export interface SavedRelatives {
  parents: LinkedRelative[]
  children: LinkedRelative[]
}

/**
 * Loads the parents and children of a saved member (adopted ones flagged).
 * Throws when a query fails.
 */
export async function loadSavedRelatives(
  supabase: SupabaseClient,
  personId: string
): Promise<SavedRelatives> {
  const [asParent, asChild] = await Promise.all([
    supabase
      .from('relationships')
      .select('person_b, type')
      .eq('person_a', personId)
      .in('type', PARENT_CHILD_TYPES),
    supabase
      .from('relationships')
      .select('person_a, type')
      .eq('person_b', personId)
      .in('type', PARENT_CHILD_TYPES)
  ])
  if (asParent.error) throw asParent.error
  if (asChild.error) throw asChild.error

  // A relative linked twice counts as adopted only when every link is.
  const link = (rows: unknown, key: 'person_a' | 'person_b') => {
    const ids = new Map<string, boolean>()
    for (const row of (rows ?? []) as Record<string, string>[]) {
      const adopted = row.type === 'adopted_child'
      ids.set(row[key], (ids.get(row[key]) ?? true) && adopted)
    }
    return ids
  }
  const childIds = link(asParent.data, 'person_b')
  const parentIds = link(asChild.data, 'person_a')
  if (childIds.size === 0 && parentIds.size === 0)
    return { parents: [], children: [] }

  const { data, error } = await supabase
    .from('persons')
    .select(RELATIVE_COLUMNS)
    .in('id', [...parentIds.keys(), ...childIds.keys()])
  if (error) throw error

  const relatives = (data ?? []) as LinkedRelative[]
  return {
    parents: relatives
      .filter((p) => parentIds.has(p.id))
      .map((p) => ({ ...p, adopted: parentIds.get(p.id) })),
    children: relatives
      .filter((p) => childIds.has(p.id))
      .map((p) => ({ ...p, adopted: childIds.get(p.id) }))
  }
}
