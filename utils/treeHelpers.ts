import { Person, Relationship } from '@/types'

export interface SpouseData {
  person: Person
  note?: string | null
}

export interface AdjacencyLists {
  spousesByPersonId: Map<string, SpouseData[]>
  childrenByPersonId: Map<string, Person[]>
}

export interface TreeFilterOptions {
  hideDaughtersInLaw: boolean
  hideSonsInLaw: boolean
  hideDaughters: boolean
  hideSons: boolean
  hideMales: boolean
  hideFemales: boolean
}

function compareSiblings(a: Person, b: Person): number {
  const aOrder = a.birth_order ?? Infinity
  const bOrder = b.birth_order ?? Infinity
  if (aOrder !== bOrder) return aOrder - bOrder
  const aYear = a.birth_year ?? Infinity
  const bYear = b.birth_year ?? Infinity
  return aYear - bYear
}

/**
 * Xây dựng danh sách kề (adjacency lists) cho vợ/chồng và con cái từ dữ liệu thô.
 * Giúp tối ưu truy vấn từ O(N) xuống O(1).
 */
export function buildAdjacencyLists(
  relationships: Relationship[],
  personsMap: Map<string, Person>
): AdjacencyLists {
  const spouses = new Map<string, SpouseData[]>()
  const children = new Map<string, Person[]>()

  relationships.forEach((r) => {
    if (r.type === 'marriage') {
      if (!spouses.has(r.person_a)) spouses.set(r.person_a, [])
      if (!spouses.has(r.person_b)) spouses.set(r.person_b, [])

      const pB = personsMap.get(r.person_b)
      if (pB) spouses.get(r.person_a)?.push({ person: pB, note: r.note })

      const pA = personsMap.get(r.person_a)
      if (pA) spouses.get(r.person_b)?.push({ person: pA, note: r.note })
    } else if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!children.has(r.person_a)) children.set(r.person_a, [])
      const child = personsMap.get(r.person_b)
      if (child) children.get(r.person_a)?.push(child)
    }
  })

  // Sắp xếp con cái theo thứ tự sinh hoặc năm sinh
  children.forEach((childArray) => {
    childArray.sort(compareSiblings)
  })

  return { spousesByPersonId: spouses, childrenByPersonId: children }
}

/**
 * Children shown under a tree node: the person's own children plus the
 * children linked only to one of the given spouses (the spouse is drawn as a
 * card inside the node, so their children would otherwise never be reached).
 * Deduplicated by id; sorted by birth order, then birth year.
 */
export function getNodeChildren(
  personId: string,
  adj: AdjacencyLists,
  spouses: SpouseData[]
): Person[] {
  const own = adj.childrenByPersonId.get(personId) || []
  const seen = new Set(own.map((c) => c.id))
  const extra: Person[] = []
  spouses.forEach((s) => {
    ;(adj.childrenByPersonId.get(s.person.id) || []).forEach((c) => {
      if (seen.has(c.id) || c.id === personId) return
      seen.add(c.id)
      extra.push(c)
    })
  })
  if (extra.length === 0) return own
  return [...own, ...extra].sort(compareSiblings)
}

/** Children per person including the children linked only to a spouse. */
export function buildNodeChildrenMap(
  adj: AdjacencyLists
): Map<string, Person[]> {
  const map = new Map<string, Person[]>()
  const ids = new Set([
    ...adj.childrenByPersonId.keys(),
    ...adj.spousesByPersonId.keys()
  ])
  ids.forEach((id) => {
    const list = getNodeChildren(id, adj, adj.spousesByPersonId.get(id) || [])
    if (list.length > 0) map.set(id, list)
  })
  return map
}

/**
 * Lấy dữ liệu của một node trong cây (vợ chồng, con cái) đã qua bộ lọc.
 */
export function getFilteredTreeData(
  personId: string,
  personsMap: Map<string, Person>,
  adj: AdjacencyLists,
  filters: TreeFilterOptions
) {
  const {
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales
  } = filters

  let spousesList = adj.spousesByPersonId.get(personId) || []
  spousesList = spousesList.filter((s) => {
    if (hideDaughtersInLaw && s.person.gender === 'female') return false
    if (hideSonsInLaw && s.person.gender === 'male') return false
    if (hideMales && s.person.gender === 'male') return false
    if (hideFemales && s.person.gender === 'female') return false
    return true
  })

  let childrenList = getNodeChildren(personId, adj, spousesList)
  childrenList = childrenList.filter((c) => {
    if (hideDaughters && c.gender === 'female') return false
    if (hideSons && c.gender === 'male') return false
    if (hideMales && c.gender === 'male') return false
    if (hideFemales && c.gender === 'female') return false
    return true
  })

  return {
    person: personsMap.get(personId)!,
    spouses: spousesList,
    children: childrenList
  }
}

/** Person IDs whose branches start collapsed for the given auto-collapse level. */
export function computeAutoCollapsed(
  roots: { id: string }[],
  childrenByPersonId: Map<string, { id: string }[]>,
  autoCollapseLevel: number
): Set<string> {
  const collapsed = new Set<string>()
  if (autoCollapseLevel <= 0) return collapsed

  const visited = new Set<string>()
  const walk = (personId: string, level: number) => {
    if (visited.has(personId)) return
    visited.add(personId)

    const children = childrenByPersonId.get(personId) ?? []
    if (level >= autoCollapseLevel && children.length > 0) {
      collapsed.add(personId)
    }
    children.forEach((child) => walk(child.id, level + 1))
  }

  roots.forEach((root) => walk(root.id, 0))
  return collapsed
}

/**
 * Normalizes each tree level's node heights so rows align. The resize/zoom
 * wiring lives in the component; this is the pure DOM pass.
 */
export function equalizeNodeHeights(container: HTMLElement) {
  const nodes = container.querySelectorAll('.node-container')
  const levelMap: Record<string, HTMLElement[]> = {}

  nodes.forEach((node) => {
    const level = node.getAttribute('data-level')
    if (level != null) {
      if (!levelMap[level]) levelMap[level] = []
      levelMap[level].push(node as HTMLElement)
    }
  })

  Object.values(levelMap).forEach((levelNodes) => {
    // Reset min-height first to get natural height
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex) innerFlex.style.minHeight = '0px'
    })

    let maxHeight = 0
    // Find the maximum height in this level
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex) {
        maxHeight = Math.max(maxHeight, innerFlex.offsetHeight)
      }
    })

    // Apply max height to all nodes in this level
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex && maxHeight > 0) {
        innerFlex.style.minHeight = `${maxHeight}px`
      }
    })
  })
}
