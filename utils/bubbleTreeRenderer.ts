import { drag } from 'd3-drag'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation
} from 'd3-force'
import { select, type BaseType, type Selection } from 'd3-selection'
import { zoom, type ZoomBehavior } from 'd3-zoom'
import { RefObject } from 'react'

import { AVATAR_VERSION } from '@/components/DefaultAvatar'
import { GraphLink, GraphNode } from '@/utils/bubbleGraph'
import {
  alphaDecayFor,
  avatarOffsets,
  pinRootNodes,
  shortNodeName
} from '@/utils/bubbleLayout'

const showAvatar = true

interface CreateBubbleTreeRendererOptions {
  svgRef: RefObject<SVGSVGElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  zoomRef: RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>
  nodes: GraphNode[]
  links: GraphLink[]
  /** Maps a stored `avatar_url` to a displayable URL (see useAvatarUrl). */
  avatarUrl: (value: string | null | undefined) => string | null
  onZoomLevelChange: (level: number) => void
  onSelectionChange: () => void
  onNodeClick: (nodeId: string) => void
  /** Accessible name of the whole canvas. */
  canvasLabel: string
  /** Accessible name of one node (family unit). */
  getNodeLabel: (node: GraphNode) => string
}

// Builds the whole D3 scene (zoom, force simulation, nodes/links) and returns
// a teardown function that releases every subscription it registered.
// Throws on rendering failures; the caller owns error reporting.
export function createBubbleTreeRenderer({
  svgRef,
  containerRef,
  zoomRef,
  nodes,
  links,
  avatarUrl,
  onZoomLevelChange,
  onSelectionChange,
  onNodeClick,
  canvasLabel,
  getNodeLabel
}: CreateBubbleTreeRendererOptions): () => void {
  const container = containerRef.current!
  const width = container.clientWidth
  const height = container.clientHeight

  const svg = select(svgRef.current!)
    .attr('viewBox', [0, 0, width, height])
    .style('cursor', 'grab')
  svg.selectAll('*').remove() // Clear previous render

  let simulation: Simulation<GraphNode, undefined> | null = null
  let nodeSelection: Selection<
    BaseType,
    GraphNode,
    SVGGElement,
    unknown
  > | null = null
  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null

  // Pin root nodes to the center
  pinRootNodes(nodes, width, height)

  svg.attr('viewBox', [0, 0, width, height]).style('cursor', 'grab')
  svg.selectAll('*').remove() // Clear previous render

  svg
    .attr('role', 'group')
    .attr('aria-label', canvasLabel)
    .append('title')
    .text(canvasLabel)

  const g = svg.append('g')

  // Defs for avatar clipping
  const defs = svg.append('defs')
  defs
    .append('clipPath')
    .attr('id', 'avatar-clip')
    .append('circle')
    .attr('r', 26)
    .attr('cx', 0)
    .attr('cy', 0)
  defs
    .append('clipPath')
    .attr('id', 'avatar-clip-root')
    .append('circle')
    .attr('r', 36)
    .attr('cx', 0)
    .attr('cy', 0)

  // Zoom setup
  zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
      // Only re-render React when the displayed percentage changes
      const k = Math.round(event.transform.k * 100) / 100
      onZoomLevelChange(k)
    })
  zoomRef.current = zoomBehavior
  svg.call(
    zoomBehavior as unknown as (
      selection: Selection<SVGSVGElement, unknown, null, undefined>
    ) => void
  )

  svg.on('click', (event) => {
    if (event.target === svgRef.current) {
      onSelectionChange()
    }
  })

  // Initial center transform
  svg.call(
    zoomBehavior!.translateTo as unknown as (
      selection: Selection<SVGSVGElement, unknown, null, undefined>,
      x: number,
      y: number
    ) => void,
    width / 2,
    height / 2
  )

  // Force simulation
  simulation = forceSimulation<GraphNode>(nodes)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(150)
    )
    .force('charge', forceManyBody().strength(-1200))
    // Use width / 2 as the collision radius to prevent overlapping of the wider family units
    .force(
      'collide',
      forceCollide<GraphNode>()
        .radius((d) => d.width / 2 + 15)
        .iterations(2)
    )

  // Large families: settle faster so the layout stops moving sooner
  const alphaDecay = alphaDecayFor(nodes.length)
  if (alphaDecay !== null) simulation.alphaDecay(alphaDecay)

  // Draw links
  const link = g
    .append('g')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'bubble-link')
    .attr('stroke', '#d6d3d1')
    .attr('stroke-width', 2)

  // Click, Enter and Space all select the node and centre it.
  const activateNode = (d: GraphNode) => {
    if (d.x != null && d.y != null) {
      svg.transition().duration(450).call(zoomBehavior!.translateTo, d.x, d.y)
    }
    onNodeClick(d.id)
  }

  // Draw nodes (Family Units)
  nodeSelection = g
    .append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr(
      'class',
      'bubble-node focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600'
    )
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-pressed', 'false')
    .attr('aria-label', (d) => getNodeLabel(d))
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      if (event.defaultPrevented) return
      activateNode(d)
    })
    .on('keydown', (event: KeyboardEvent, d) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      activateNode(d)
    })
    .on('focus', (event: FocusEvent, d) => {
      // Keep the node focused with Tab in view; the browser would otherwise
      // scroll the clipped container instead of moving the canvas.
      const container = svg.node()?.parentElement?.parentElement
      if (container) {
        container.scrollLeft = 0
        container.scrollTop = 0
      }
      if (
        (event.target as Element).matches(':focus-visible') &&
        d.x != null &&
        d.y != null
      ) {
        svg.transition().duration(250).call(zoomBehavior!.translateTo, d.x, d.y)
      }
    })
    .call(
      drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation!.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
          svg.style('cursor', 'grabbing')
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation!.alphaTarget(0)
          if (!d.isRoot) {
            d.fx = null
            d.fy = null
          }
          svg.style('cursor', 'grab')
        }) as never
    )

  // Pill shape for the Family Unit
  nodeSelection
    .append('rect')
    .attr('x', (d) => -d.width / 2)
    .attr('y', (d) => -d.radius)
    .attr('rx', (d) => d.radius)
    .attr('ry', (d) => d.radius)
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.radius * 2)
    .attr('fill', 'white')
    .attr('stroke', (d) =>
      d.people[0].gender === 'male' ? '#3b82f6' : '#ec4899'
    )
    .attr('stroke-width', (d) => (d.isRoot ? 4 : 2))
    .attr('class', 'shadow-md transition hover:scale-105 cursor-pointer')

  // Avatars for everyone in the Family Unit
  if (showAvatar) {
    nodeSelection.each(function (d) {
      const unitContent = select(this)

      const offsets = avatarOffsets(d)
      d.people.forEach((person, index) => {
        // Each avatar sits at its own X offset inside the pill
        const cx = offsets[index]

        const avatarGroup = unitContent
          .append('g')
          .attr('transform', `translate(${cx}, 0)`)

        avatarGroup
          .append('image')
          .attr('x', -d.radius + 4)
          .attr('y', -d.radius + 4)
          .attr('width', (d.radius - 4) * 2)
          .attr('height', (d.radius - 4) * 2)
          .attr(
            'clip-path',
            d.isRoot ? 'url(#avatar-clip-root)' : 'url(#avatar-clip)'
          )
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .attr(
            'href',
            avatarUrl(person.avatar_url) ||
              (person.gender === 'male'
                ? `/avatar/${AVATAR_VERSION}/male.svg`
                : `/avatar/${AVATAR_VERSION}/female.svg`)
          )
      })
    })
  }

  // Node text (concatenated names)
  nodeSelection
    .append('text')
    .attr('dy', (d) => d.radius + 18)
    .attr('text-anchor', 'middle')
    .attr('fill', '#44403c')
    .attr('font-size', (d) => (d.isRoot ? '14px' : '12px'))
    .attr('font-weight', (d) => (d.isRoot ? 'bold' : 'normal'))
    .style('pointer-events', 'none')
    .text((d) => shortNodeName(d))

  simulation!.on('tick', () => {
    link
      .attr('x1', (d) => (d.source as GraphNode).x!)
      .attr('y1', (d) => (d.source as GraphNode).y!)
      .attr('x2', (d) => (d.target as GraphNode).x!)
      .attr('y2', (d) => (d.target as GraphNode).y!)

    nodeSelection!.attr('transform', (d) => `translate(${d.x},${d.y})`)
  })
  return () => {
    svg.on('.zoom', null)
    svg.on('click', null)
    zoomBehavior.on('zoom', null)
    simulation.stop()
    simulation.on('tick', null)
    nodeSelection.on('click', null)
    nodeSelection.on('keydown', null)
    nodeSelection.on('focus', null)
    nodeSelection.on('.drag', null)
    zoomRef.current = null
  }
}
