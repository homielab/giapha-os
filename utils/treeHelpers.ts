import { Person, Relationship } from '@/types'

import { compareBirth } from './compareBirth'

export interface SpouseData {
  person: Person
  note?: string | null
}

export interface SpouseOrderKey {
  person: { birth_year?: number | null }
  createdAt: string
  relId: string
}

interface SpouseEntry extends SpouseData, SpouseOrderKey {
  person: Person
}

/**
 * Spouses in a stable order that does not depend on random ids: spouse's
 * birth year (unknown last), then when the marriage was added, then its id.
 */
export function compareSpouses(a: SpouseOrderKey, b: SpouseOrderKey): number {
  const ya = a.person.birth_year ?? Infinity
  const yb = b.person.birth_year ?? Infinity
  if (ya !== yb) return ya < yb ? -1 : 1
  const ca = a.createdAt || '\uffff'
  const cb = b.createdAt || '\uffff'
  if (ca !== cb) return ca < cb ? -1 : 1
  return a.relId < b.relId ? -1 : a.relId > b.relId ? 1 : 0
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

/**
 * Xây dựng danh sách kề (adjacency lists) cho vợ/chồng và con cái từ dữ liệu thô.
 * Giúp tối ưu truy vấn từ O(N) xuống O(1).
 */
export function buildAdjacencyLists(
  relationships: Relationship[],
  personsMap: Map<string, Person>
): AdjacencyLists {
  const spouses = new Map<string, SpouseEntry[]>()
  const children = new Map<string, Person[]>()

  relationships.forEach((r) => {
    if (r.type === 'marriage') {
      if (!spouses.has(r.person_a)) spouses.set(r.person_a, [])
      if (!spouses.has(r.person_b)) spouses.set(r.person_b, [])

      const meta = { note: r.note, createdAt: r.created_at ?? '', relId: r.id }
      const pB = personsMap.get(r.person_b)
      if (pB) spouses.get(r.person_a)?.push({ person: pB, ...meta })

      const pA = personsMap.get(r.person_a)
      if (pA) spouses.get(r.person_b)?.push({ person: pA, ...meta })
    } else if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!children.has(r.person_a)) children.set(r.person_a, [])
      const child = personsMap.get(r.person_b)
      if (child) children.get(r.person_a)?.push(child)
    }
  })

  // Sắp xếp con cái theo thứ tự sinh hoặc năm sinh
  children.forEach((childArray) => {
    childArray.sort(compareBirth)
  })

  const spousesByPersonId = new Map<string, SpouseData[]>()
  spouses.forEach((list, id) => {
    list.sort(compareSpouses)
    spousesByPersonId.set(
      id,
      list.map(({ person, note }) => ({ person, note }))
    )
  })

  return { spousesByPersonId, childrenByPersonId: children }
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
  return [...own, ...extra].sort(compareBirth)
}

/** The people on the path from a root down to `personId`, `personId` included. */
export function extendPath(
  path: ReadonlySet<string>,
  personId: string
): ReadonlySet<string> {
  return new Set([...path, personId])
}

/**
 * Children that are not already on the path above them. Cyclic data (A child
 * of B and B child of A) would otherwise nest the same people forever.
 */
export function childrenOffPath(
  children: Person[],
  path: ReadonlySet<string>
): Person[] {
  if (!children.some((c) => path.has(c.id))) return children
  return children.filter((c) => !path.has(c.id))
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
 *
 * Runs in three passes over all levels (reset every node, measure every node,
 * then write every max) so the browser lays out once per call instead of once
 * per level: reading `offsetHeight` right after a style write forces a reflow.
 */
export function equalizeNodeHeights(container: HTMLElement) {
  const nodes = container.querySelectorAll('.node-container')
  const levelMap = new Map<string, HTMLElement[]>()

  nodes.forEach((node) => {
    const level = node.getAttribute('data-level')
    const innerFlex = node.firstElementChild as HTMLElement | null
    if (level == null || !innerFlex) return
    const levelNodes = levelMap.get(level)
    if (levelNodes) levelNodes.push(innerFlex)
    else levelMap.set(level, [innerFlex])
  })

  // Pass 1: reset min-height everywhere to get natural heights
  levelMap.forEach((levelNodes) => {
    levelNodes.forEach((el) => {
      el.style.minHeight = '0px'
    })
  })

  // Pass 2: measure every node (one layout for the whole tree)
  const maxHeights = new Map<string, number>()
  levelMap.forEach((levelNodes, level) => {
    let maxHeight = 0
    levelNodes.forEach((el) => {
      maxHeight = Math.max(maxHeight, el.offsetHeight)
    })
    maxHeights.set(level, maxHeight)
  })

  // Pass 3: apply each level's max height
  levelMap.forEach((levelNodes, level) => {
    const maxHeight = maxHeights.get(level) ?? 0
    if (maxHeight <= 0) return
    levelNodes.forEach((el) => {
      el.style.minHeight = `${maxHeight}px`
    })
  })
}
