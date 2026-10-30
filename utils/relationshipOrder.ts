import type { EnrichedRelationship } from '@/components/relationship/relationshipTypes'

import { compareBirth } from './compareBirth'
import { compareSpouses } from './treeHelpers'

const GENDER_RANK: Record<string, number> = { male: 0, female: 1 }

/**
 * The order of one group on the member page, the same as the tree: parents
 * father first, spouses by `compareSpouses`, children (and their spouses) by
 * `compareBirth`.
 */
export function sortRelationshipGroup(
  direction: EnrichedRelationship['direction'],
  items: EnrichedRelationship[]
): EnrichedRelationship[] {
  const list = [...items]
  if (direction === 'parent') {
    return list.sort(
      (a, b) =>
        (GENDER_RANK[a.targetPerson.gender] ?? 2) -
          (GENDER_RANK[b.targetPerson.gender] ?? 2) ||
        compareBirth(a.targetPerson, b.targetPerson)
    )
  }
  if (direction === 'spouse') {
    const key = (r: EnrichedRelationship) => ({
      person: r.targetPerson,
      createdAt: r.createdAt ?? '',
      relId: r.id
    })
    return list.sort((a, b) => compareSpouses(key(a), key(b)))
  }
  return list.sort((a, b) => compareBirth(a.targetPerson, b.targetPerson))
}
