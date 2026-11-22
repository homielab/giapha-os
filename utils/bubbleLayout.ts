import type { GraphNode } from '@/utils/bubbleGraph'

/** Horizontal gap between pinned root family units. */
const ROOT_SPACING = 150
/** Above this many nodes the layout settles faster. */
const LARGE_GRAPH = 300
const HUGE_GRAPH = 1000

/** Pins root nodes to the centre of the canvas, side by side when several. */
export function pinRootNodes(
  nodes: GraphNode[],
  width: number,
  height: number
): void {
  const rootNodes = nodes.filter((n) => n.isRoot)
  if (rootNodes.length === 1) {
    rootNodes[0].fx = width / 2
    rootNodes[0].fy = height / 2
  } else if (rootNodes.length > 1) {
    rootNodes.forEach((n, i) => {
      n.fx = width / 2 + (i - (rootNodes.length - 1) / 2) * ROOT_SPACING
      n.fy = height / 2
    })
  }
}

/**
 * Alpha decay of the force simulation for large families so the layout stops
 * moving sooner; null keeps the d3 default.
 */
export function alphaDecayFor(nodeCount: number): number | null {
  if (nodeCount <= LARGE_GRAPH) return null
  return nodeCount > HUGE_GRAPH ? 0.06 : 0.04
}

/** X offsets of the avatars inside a family unit pill, left to right. */
export function avatarOffsets(node: GraphNode): number[] {
  const count = node.people.length
  const totalSpacing = node.width - node.radius * 2
  const step = count > 1 ? totalSpacing / (count - 1) : 0
  const start = -(totalSpacing / 2)
  return node.people.map((_, index) => start + index * step)
}

/** Text under a node: the last word of each person's name, joined by "&". */
export function shortNodeName(node: GraphNode): string {
  return node.people.map((p) => p.full_name.split(' ').pop()).join(' & ')
}

/**
 * Accessible name of a node: every person's full name, with the birth year
 * when known (formatted by `formatBorn`, which is translated).
 */
export function bubbleNodeLabel(
  node: GraphNode,
  formatBorn: (name: string, year: number) => string
): string {
  return node.people
    .map((p) =>
      p.birth_year ? formatBorn(p.full_name, p.birth_year) : p.full_name
    )
    .join(' & ')
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The zoom that shows the whole map in the canvas with some margin: never
 * above 100% (a small family stays at its real size) nor below the zoom
 * limit.
 */
export function fitTransform(
  content: Box,
  canvasWidth: number,
  canvasHeight: number,
  margin = 40,
  minScale = 0.1
): { x: number; y: number; k: number } {
  if (content.width <= 0 || content.height <= 0) {
    return { x: 0, y: 0, k: 1 }
  }
  const k = Math.max(
    minScale,
    Math.min(
      1,
      (canvasWidth - margin * 2) / content.width,
      (canvasHeight - margin * 2) / content.height
    )
  )
  const cx = content.x + content.width / 2
  const cy = content.y + content.height / 2
  return { x: canvasWidth / 2 - cx * k, y: canvasHeight / 2 - cy * k, k }
}
