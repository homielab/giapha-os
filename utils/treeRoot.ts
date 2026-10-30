import { Person, Relationship } from '@/types'

type RootPerson = Pick<Person, 'id' | 'generation' | 'is_in_law' | 'birth_year'>
type RootRelationship = Pick<Relationship, 'type' | 'person_b'>

// Earliest birth year first; people without a birth year go last (stable).
function earliest<T extends RootPerson>(people: T[]): T | undefined {
  let best: T | undefined
  for (const p of people) {
    if (!best || (p.birth_year ?? Infinity) < (best.birth_year ?? Infinity)) {
      best = p
    }
  }
  return best
}

/**
 * Picks the person the tree opens on when no root is chosen: among people
 * who are nobody's child, prefer generation 1 (not married in), then any
 * blood-line person, then anyone; earliest birth year breaks ties.
 */
export function pickDefaultRootId(
  persons: RootPerson[],
  relationships: RootRelationship[]
): string | undefined {
  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === 'biological_child' || r.type === 'adopted_child'
      )
      .map((r) => r.person_b)
  )
  const roots = persons.filter((p) => !childIds.has(p.id))
  const blood = roots.filter((p) => !p.is_in_law)
  const pick =
    earliest(blood.filter((p) => p.generation === 1)) ??
    earliest(blood) ??
    earliest(roots)
  return pick?.id ?? persons[0]?.id
}

/**
 * The root to show: the chosen one while that person still exists (it may be
 * stale after a merge or delete, from storage or a shared link), otherwise
 * the default; null when neither exists.
 */
export function resolveRootId(
  rootId: string | null | undefined,
  personsMap: ReadonlyMap<string, unknown>,
  defaultRootId: string | null | undefined
): string | null {
  if (rootId && personsMap.has(rootId)) return rootId
  if (defaultRootId && personsMap.has(defaultRootId)) return defaultRootId
  return null
}

export const ROOT_STORAGE_KEY = 'members_rootId'

/**
 * Remembers the root the user picked in the root selector. Only a deliberate
 * pick is saved: a root from a shared `?rootId=` link must not replace it.
 */
export function saveChosenRoot(
  storage: Pick<Storage, 'setItem'> | undefined,
  id: string
) {
  try {
    storage?.setItem(ROOT_STORAGE_KEY, id)
  } catch (e) {
    console.warn('Failed to write to localStorage:', e)
  }
}
