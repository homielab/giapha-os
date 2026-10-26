'use client'

import { Minus, Plus } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import FamilyTreeNodeRenderer from '@/components/FamilyTreeNodeRenderer'
import TreeLinesStyle from '@/components/TreeLinesStyle'
import { useMemberListView } from '@/context/useMemberListView'
import { usePanZoom } from '@/hooks/usePanZoom'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import {
  buildAdjacencyLists,
  computeAutoCollapsed,
  equalizeNodeHeights,
  getFilteredTreeData
} from '@/utils/treeHelpers'

import FamilyNodeCard from './FamilyNodeCard'
import TreeToolbar from './TreeToolbar'

const DEFAULT_AUTO_COLLAPSE_LEVEL = 4

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  canEdit
}: {
  personsMap: Map<string, Person>
  relationships: Relationship[]
  roots: Person[]
  canEdit?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false)
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false)
  const [hideDaughters, setHideDaughters] = useState(false)
  const [hideSons, setHideSons] = useState(false)
  const [hideMales, setHideMales] = useState(false)
  const [hideFemales, setHideFemales] = useState(false)

  const [hideExpandButtons, setHideExpandButtons] = useState(false)
  const [autoCollapseLevel, setAutoCollapseLevel] = useState(
    DEFAULT_AUTO_COLLAPSE_LEVEL
  )

  const { showAvatar } = useMemberListView()
  const { t } = useI18n()

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom
    }
  } = usePanZoom(containerRef)

  // Center the scroll area horizontally
  const centerTree = useCallback(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const inner = el.querySelector('#export-container')
    if (inner) {
      const innerRect = inner.getBoundingClientRect()
      const containerRect = el.getBoundingClientRect()
      el.scrollLeft +=
        innerRect.left +
        innerRect.width / 2 -
        (containerRect.left + containerRect.width / 2)
    } else {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    }
  }, [])

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap]
  )

  const filters = useMemo(
    () => ({
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales
    }),
    [
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales
    ]
  )

  const getTreeData = useCallback(
    (personId: string) =>
      getFilteredTreeData(personId, personsMap, adj, filters),
    [personsMap, adj, filters]
  )

  // Branches from `autoCollapseLevel` down start collapsed. This is computed
  // synchronously so the first paint never renders the whole (possibly huge)
  // tree before collapsing it.
  const autoCollapsed = useMemo(
    () =>
      computeAutoCollapsed(roots, adj.childrenByPersonId, autoCollapseLevel),
    [roots, adj, autoCollapseLevel]
  )

  // Manual expand/collapse toggles, reset whenever the automatic baseline changes
  const [collapseState, setCollapseState] = useState({
    base: autoCollapsed,
    nodes: autoCollapsed
  })
  const collapsedNodes =
    collapseState.base === autoCollapsed ? collapseState.nodes : autoCollapsed

  const toggleCollapse = useCallback(
    (personId: string) => {
      setCollapseState((prev) => {
        const current = prev.base === autoCollapsed ? prev.nodes : autoCollapsed
        const next = new Set(current)
        if (next.has(personId)) {
          next.delete(personId)
        } else {
          next.add(personId)
        }
        return { base: autoCollapsed, nodes: next }
      })
    },
    [autoCollapsed]
  )

  // Center once the new layout has been committed
  useEffect(() => {
    const raf = requestAnimationFrame(centerTree)
    return () => cancelAnimationFrame(raf)
  }, [autoCollapsed, centerTree])

  useEffect(() => {
    const equalizeHeights = () => {
      if (containerRef.current) equalizeNodeHeights(containerRef.current)
    }

    let frame = 0
    const scheduleEqualize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(equalizeHeights)
    }

    scheduleEqualize()
    window.addEventListener('resize', scheduleEqualize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleEqualize)
    }
    // `scale` is intentionally not a dependency: CSS transforms don't change
    // layout heights, so zooming never needs a re-measure.
  }, [
    roots,
    personsMap,
    relationships,
    showAvatar,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    collapsedNodes
  ])

  const handleCenter = centerTree

  if (roots.length === 0)
    return (
      <div className='p-10 text-center text-stone-500'>{t('noTreeData')}</div>
    )

  return (
    <div className='relative h-full w-full'>
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        handleCenter={handleCenter}
        hideExpandButtons={hideExpandButtons}
        setHideExpandButtons={setHideExpandButtons}
        autoCollapseLevel={autoCollapseLevel}
        setAutoCollapseLevel={setAutoCollapseLevel}
        hideDaughtersInLaw={hideDaughtersInLaw}
        setHideDaughtersInLaw={setHideDaughtersInLaw}
        hideSonsInLaw={hideSonsInLaw}
        setHideSonsInLaw={setHideSonsInLaw}
        hideDaughters={hideDaughters}
        setHideDaughters={setHideDaughters}
        hideSons={hideSons}
        setHideSons={setHideSons}
        hideMales={hideMales}
        setHideMales={setHideMales}
        hideFemales={hideFemales}
        setHideFemales={setHideFemales}
        canEdit={canEdit}
      />

      <div
        ref={containerRef}
        role='group'
        aria-label={t('treeCanvasLabel')}
        className={`h-full w-full overflow-auto bg-stone-50 ${isPressed ? 'cursor-grabbing' : 'cursor-grab'}`}
        tabIndex={0}
        onKeyDown={(e) => {
          // Keyboard users get the same "release" affordance as mouse users:
          // Escape cancels a grab/drag state on the canvas.
          if (e.key === 'Escape') handleMouseUpOrLeave()
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // Prevent browser default dragging of links/images
      >
        <TreeLinesStyle />

        {/* 
        Use w-max to prevent wrapping and allow scrolling. 
        mx-auto centers it if smaller than screen. 
        p-8 adds padding inside scroll area.
      */}
        <div
          id='export-container'
          className={`css-tree mx-auto w-max min-w-full p-4 transition-[transform,opacity] duration-200 ${isDragging ? 'opacity-90' : ''}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}>
          <ul>
            <MemoizedNodeTree
              roots={roots}
              getTreeData={getTreeData}
              collapsedNodes={collapsedNodes}
              showAvatar={showAvatar}
              hideExpandButtons={hideExpandButtons}
              toggleCollapse={toggleCollapse}
            />
          </ul>
        </div>
      </div>
    </div>
  )
}

// The node tree is memoized so zooming and panning (which only change
// `scale` / drag state) never re-render thousands of nodes. It lives in its
// own component so the memo is not re-evaluated on renders that early-return
// to the empty state.
function MemoizedNodeTree({
  roots,
  getTreeData,
  collapsedNodes,
  showAvatar,
  hideExpandButtons,
  toggleCollapse
}: {
  roots: Person[]
  getTreeData: (personId: string) => ReturnType<typeof getFilteredTreeData>
  collapsedNodes: Set<string>
  showAvatar: boolean
  hideExpandButtons: boolean
  toggleCollapse: (personId: string) => void
}) {
  const treeContent = useMemo(
    () => (
      <FamilyTreeNodeRenderer
        roots={roots}
        getTreeData={getTreeData}
        collapsedNodes={collapsedNodes}
        showAvatar={showAvatar}
        hideExpandButtons={hideExpandButtons}
        toggleCollapse={toggleCollapse}
      />
    ),
    [
      roots,
      getTreeData,
      collapsedNodes,
      showAvatar,
      hideExpandButtons,
      toggleCollapse
    ]
  )
  return treeContent
}
