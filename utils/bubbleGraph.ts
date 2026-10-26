import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

import { Person, Relationship } from '@/types'
import { buildAdjacencyLists, getFilteredTreeData } from '@/utils/treeHelpers'

// Define D3 Node and Link types
export interface GraphNode extends SimulationNodeDatum {
  id: string
  people: Person[] // [main, ...spouses]
  radius: number
  width: number
  isRoot: boolean
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type: string
}

export function buildBubbleGraph(
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  roots: Person[]
): { nodes: GraphNode[]; links: GraphLink[] } {
  const adj = buildAdjacencyLists(relationships, personsMap)
  const nodeMap = new Map<string, GraphNode>()
  const linkArray: GraphLink[] = []

  const addFamilyUnit = (
    mainPerson: Person,
    spouses: Person[],
    isRoot: boolean
  ) => {
    if (!nodeMap.has(mainPerson.id)) {
      const people = [mainPerson, ...spouses]
      const radius = isRoot ? 40 : 30
      // Width expands for each additional spouse
      const width = radius * 2 + (people.length - 1) * (radius * 1.5)

      nodeMap.set(mainPerson.id, {
        id: mainPerson.id,
        people,
        radius,
        width,
        isRoot
      })
    }
  }

  const walk = (personId: string, visited: Set<string>) => {
    if (visited.has(personId)) return
    visited.add(personId)

    const data = getFilteredTreeData(personId, personsMap, adj, {
      hideDaughtersInLaw: false,
      hideSonsInLaw: false,
      hideDaughters: false,
      hideSons: false,
      hideMales: false,
      hideFemales: false
    })

    if (!data.person) return

    const spouses = data.spouses.map((s) => s.person)
    addFamilyUnit(
      data.person,
      spouses,
      roots.some((r) => r.id === personId)
    )

    data.children.forEach((child) => {
      // Link the Parent FamilyUnit -> Child FamilyUnit
      linkArray.push({
        source: personId,
        target: child.id,
        type: 'child'
      })
      walk(child.id, new Set(visited))
    })
  }

  roots.forEach((root) => walk(root.id, new Set()))

  return { nodes: Array.from(nodeMap.values()), links: linkArray }
}
