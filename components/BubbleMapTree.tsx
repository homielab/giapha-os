'use client'

import 'd3-transition'

import { select } from 'd3-selection'
import { zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import BubbleTreeToolbar from '@/components/tree/BubbleTreeToolbar'
import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useBubbleTreeRender } from '@/hooks/useBubbleTreeRender'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import { buildBubbleGraph, GraphLink, GraphNode } from '@/utils/bubbleGraph'
import { bubbleNodeLabel } from '@/utils/bubbleLayout'

export interface BubbleMapTreeProps {
  personsMap: Map<string, Person>
  relationships: Relationship[]
  roots: Person[]
  canEdit?: boolean
}

export default function BubbleMapTree({
  personsMap,
  relationships,
  roots
}: BubbleMapTreeProps) {
  const { t } = useI18n()
  const avatarUrl = useAvatarUrl()
  const containerRef = useRef<HTMLDivElement>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { nodes, links } = useMemo(
    () => buildBubbleGraph(personsMap, relationships, roots),
    [personsMap, relationships, roots]
  )

  const effectiveSelectedNodeId =
    selectedNodeId && nodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : null

  // Resolve descendants from the raw relationships. D3 mutates link
  // endpoints into GraphNode objects once the simulation starts.
  const highlightedNodeIds = useMemo(() => {
    if (!effectiveSelectedNodeId) return null

    const childrenByParent = new Map<string, string[]>()
    relationships.forEach((relationship) => {
      if (
        relationship.type !== 'biological_child' &&
        relationship.type !== 'adopted_child'
      ) {
        return
      }

      const children = childrenByParent.get(relationship.person_a) || []
      children.push(relationship.person_b)
      childrenByParent.set(relationship.person_a, children)
    })

    const descendantIds = new Set<string>([effectiveSelectedNodeId])
    const queue = [effectiveSelectedNodeId]

    while (queue.length > 0) {
      const parentId = queue.shift()!
      const children = childrenByParent.get(parentId) || []

      children.forEach((childId) => {
        if (!descendantIds.has(childId)) {
          descendantIds.add(childId)
          queue.push(childId)
        }
      })
    }

    return descendantIds
  }, [effectiveSelectedNodeId, relationships])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Stable callbacks: the D3 effect depends on these, so identity churn here
  // would tear down and rebuild the simulation on every render.
  const handleZoomLevelChange = useCallback(
    (k: number) => setZoomLevel((prev) => (prev === k ? prev : k)),
    []
  )
  const handleSelectionClear = useCallback(() => setSelectedNodeId(null), [])
  const handleNodeClick = useCallback(
    (nodeId: string) =>
      setSelectedNodeId((currentId) => (currentId === nodeId ? null : nodeId)),
    []
  )
  const handleRenderError = useCallback(
    (renderError: Error) => setError(renderError),
    []
  )

  const canvasLabel = t('bubbleTreeLabel')
  const getNodeLabel = useCallback(
    (node: GraphNode) =>
      bubbleNodeLabel(node, (name, year) =>
        t('bubbleNodeBorn', { name, year: String(year) })
      ),
    [t]
  )

  useBubbleTreeRender({
    svgRef,
    containerRef,
    zoomRef,
    nodes,
    links,
    isFullscreen,
    avatarUrl,
    onZoomLevelChange: handleZoomLevelChange,
    onSelectionChange: handleSelectionClear,
    onNodeClick: handleNodeClick,
    onRenderError: handleRenderError,
    canvasLabel,
    getNodeLabel
  })

  // Update visual emphasis without rebuilding the force simulation.
  useEffect(() => {
    if (!svgRef.current) return

    const getNodeId = (endpoint: string | GraphNode) =>
      typeof endpoint === 'string' ? endpoint : endpoint.id

    const svg = select(svgRef.current)
    const nodeSelection = svg.selectAll<SVGGElement, GraphNode>('.bubble-node')
    const linkSelection = svg.selectAll<SVGLineElement, GraphLink>(
      '.bubble-link'
    )

    nodeSelection
      .transition()
      .duration(250)
      .style('opacity', (node) =>
        highlightedNodeIds && !highlightedNodeIds.has(node.id) ? 0.16 : 1
      )

    nodeSelection.attr('aria-pressed', (node) =>
      effectiveSelectedNodeId === node.id ? 'true' : 'false'
    )

    nodeSelection
      .select<SVGRectElement>('rect')
      .transition()
      .duration(250)
      .attr('fill', (node) =>
        effectiveSelectedNodeId === node.id ? '#fffbeb' : 'white'
      )
      .attr('stroke', (node) => {
        if (effectiveSelectedNodeId === node.id) return '#d97706'
        return node.people[0].gender === 'male' ? '#3b82f6' : '#ec4899'
      })
      .attr('stroke-width', (node) => {
        if (effectiveSelectedNodeId === node.id) return node.isRoot ? 6 : 4
        return node.isRoot ? 4 : 2
      })

    linkSelection
      .transition()
      .duration(250)
      .attr('stroke-opacity', (link) => {
        if (!highlightedNodeIds) return 0.6

        const sourceId = getNodeId(link.source as string | GraphNode)
        const targetId = getNodeId(link.target as string | GraphNode)
        const isHighlighted =
          highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId)

        return isHighlighted ? 0.9 : 0.08
      })
      .attr('stroke', (link) => {
        if (!highlightedNodeIds) return '#d6d3d1'

        const sourceId = getNodeId(link.source as string | GraphNode)
        const targetId = getNodeId(link.target as string | GraphNode)
        const isHighlighted =
          highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId)

        return isHighlighted ? '#d97706' : '#d6d3d1'
      })
      .attr('stroke-width', (link) => {
        if (!highlightedNodeIds) return 2

        const sourceId = getNodeId(link.source as string | GraphNode)
        const targetId = getNodeId(link.target as string | GraphNode)
        const isHighlighted =
          highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId)

        return isHighlighted ? 3 : 2
      })
  }, [effectiveSelectedNodeId, highlightedNodeIds])

  const changeZoom = (nextLevel: number) => {
    if (!svgRef.current || !zoomRef.current) return

    select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomRef.current.scaleTo, nextLevel)
  }

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return

    select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomRef.current.transform, zoomIdentity)
  }

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return

    try {
      if (document.fullscreenElement === fullscreenRef.current) {
        await document.exitFullscreen()
      } else if (!document.fullscreenElement) {
        await fullscreenRef.current.requestFullscreen()
      }
    } catch (fullscreenError) {
      console.error('Fullscreen error:', fullscreenError)
    }
  }

  if (error) {
    return (
      <div className='absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-stone-200/60 bg-stone-50 p-4 text-center'>
        <span className='text-stone-500'>
          {t('unsupportedBrowser', { error: error.message })}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={fullscreenRef}
      className={`absolute inset-0 overflow-hidden bg-stone-50 ${
        isFullscreen
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-stone-200/60'
      }`}>
      <div
        id='tree-toolbar-portal'
        className='absolute top-4 left-4 z-50'></div>

      <BubbleTreeToolbar
        containerRef={containerRef}
        zoomRef={zoomRef}
        zoomLevel={zoomLevel}
        isFullscreen={isFullscreen}
        onZoomChange={changeZoom}
        onResetZoom={resetZoom}
        onToggleFullscreen={toggleFullscreen}
      />

      <div ref={containerRef} className='h-full w-full'>
        <svg ref={svgRef} className='block h-full w-full' />
      </div>
    </div>
  )
}
