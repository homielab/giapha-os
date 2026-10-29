interface RelationshipLike {
  person_a: string
  person_b: string
  type: string
}

/**
 * Ids of a branch: the root, every biological or adopted descendant, and the
 * spouses of all of them. As in the tree view, a child linked only to a
 * spouse of someone in the branch belongs to the branch too. Parents of the root and the spouses' own families
 * are left out. Walks with a queue, so cyclic data cannot hang it.
 */
export function subtreePersonIds(
  relationships: readonly RelationshipLike[],
  rootId: string
): Set<string> {
  const children = new Map<string, string[]>()
  const spouses = new Map<string, string[]>()
  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key)
    if (list) list.push(value)
    else map.set(key, [value])
  }

  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      push(children, r.person_a, r.person_b)
    } else if (r.type === 'marriage') {
      push(spouses, r.person_a, r.person_b)
      push(spouses, r.person_b, r.person_a)
    }
  }

  const ids = new Set<string>([rootId])
  const queue = [rootId]
  for (let i = 0; i < queue.length; i++) {
    const parents = [queue[i], ...(spouses.get(queue[i]) ?? [])]
    for (const parentId of parents) {
      for (const childId of children.get(parentId) ?? []) {
        if (!ids.has(childId)) {
          ids.add(childId)
          queue.push(childId)
        }
      }
    }
  }

  const descendants = Array.from(ids)
  for (const id of descendants) {
    for (const spouseId of spouses.get(id) ?? []) ids.add(spouseId)
  }
  return ids
}

/**
 * Keeps only the branch under `rootId`. A root that is not among the persons
 * leaves everything untouched (the full export).
 */
export function filterBranch<
  P extends { id: string },
  R extends RelationshipLike,
  D extends { person_id: string }
>(
  data: { persons: P[]; relationships: R[]; details: D[] },
  rootId: string | null | undefined
): { persons: P[]; relationships: R[]; details: D[] } {
  if (!rootId || !data.persons.some((p) => p.id === rootId)) return data
  const ids = subtreePersonIds(data.relationships, rootId)
  return {
    persons: data.persons.filter((p) => ids.has(p.id)),
    relationships: data.relationships.filter(
      (r) => ids.has(r.person_a) && ids.has(r.person_b)
    ),
    details: data.details.filter((d) => ids.has(d.person_id))
  }
}
