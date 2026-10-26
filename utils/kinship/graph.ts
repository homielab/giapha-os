import type { PersonNode, RelEdge } from './types'

export interface KinshipGraph {
  personsMap: Map<string, PersonNode>
  /** child id -> parent ids (biological and adopted) */
  parentMap: Map<string, string[]>
  /** person id -> spouse ids */
  spouseMap: Map<string, string[]>
}

export interface Ancestry {
  depth: number
  /** From the person up to the ancestor, the ancestor excluded */
  path: PersonNode[]
}

export function buildKinshipGraph(
  persons: PersonNode[],
  relationships: RelEdge[]
): KinshipGraph {
  const personsMap = new Map(persons.map((p) => [p.id, p]))
  const parentMap = new Map<string, string[]>()
  const spouseMap = new Map<string, string[]>()

  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      const p = parentMap.get(r.person_b) ?? []
      p.push(r.person_a)
      parentMap.set(r.person_b, p)
    } else if (r.type === 'marriage') {
      const sA = spouseMap.get(r.person_a) ?? []
      sA.push(r.person_b)
      spouseMap.set(r.person_a, sA)
      const sB = spouseMap.get(r.person_b) ?? []
      sB.push(r.person_a)
      spouseMap.set(r.person_b, sB)
    }
  }

  return { personsMap, parentMap, spouseMap }
}

/** Breadth-first walk up the parents: every ancestor with its shortest depth and path. */
export function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>
): Map<string, Ancestry> {
  const depths = new Map<string, Ancestry>()
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id, depth: 0, path: [] }
  ]

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path })

      const currentNode = personsMap.get(currentId)
      if (!currentNode) continue

      const parents = parentMap.get(currentId) ?? []
      for (const pId of parents) {
        const pNode = personsMap.get(pId)
        if (pNode) {
          // Lưu con đường: từ người gốc lên, path chứa các nút trung gian
          queue.push({
            id: pId,
            depth: depth + 1,
            path: [...path, currentNode]
          })
        }
      }
    }
  }
  return depths
}

/** The common ancestor with the smallest total distance (first found on ties), or null. */
export function findLca(
  ancA: Map<string, Ancestry>,
  ancB: Map<string, Ancestry>
): { id: string; distance: number } | null {
  let lcaId: string | null = null
  let minDistance = Infinity

  for (const [id, dataA] of ancA) {
    const dataB = ancB.get(id)
    if (dataB) {
      const dist = dataA.depth + dataB.depth
      if (dist < minDistance) {
        minDistance = dist
        lcaId = id
      }
    }
  }

  return lcaId === null ? null : { id: lcaId, distance: minDistance }
}
