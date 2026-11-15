'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import FamilyTreeNodeRenderer, {
  TreeRenderContext
} from '@/components/FamilyTreeNodeRenderer'
import TreeLinesStyle from '@/components/TreeLinesStyle'
import { useMemberListView } from '@/context/useMemberListView'
import { usePanZoom } from '@/hooks/usePanZoom'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import { createCollapseStore } from '@/utils/treeCollapseStore'
import {
  buildAdjacencyLists,
  buildNodeChildrenMap,
  computeAutoCollapsed,
  equalizeNodeHeights,
  getFilteredTreeData
} from '@/utils/treeHelpers'

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
  const keyboardHintId = useId()
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

  const treeRef = useRef<HTMLDivElement>(null)
  // Unscaled size of the tree (transforms don't change offsetWidth/Height).
  const [naturalSize, setNaturalSize] = useState<{
    width: number
    height: number
  } | null>(null)

  const { showAvatar } = useMemberListView()
  const { t } = useI18n()

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUpOrLeave,
      handleClickCapture,
      handleKeyDown,
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
      computeAutoCollapsed(roots, buildNodeChildrenMap(adj), autoCollapseLevel),
    [roots, adj, autoCollapseLevel]
  )

  // Manual expand/collapse toggles, reset whenever the automatic baseline
  // changes. Each node subscribes to its own branch (see treeCollapseStore).
  const [collapseStore] = useState(createCollapseStore)
  const getCollapsed = () => collapseStore.collapsed(autoCollapsed)
  const collapsedNodes = useSyncExternalStore(
    collapseStore.subscribe,
    getCollapsed,
    getCollapsed
  )

  // The toggle button just pressed and where it was on screen: after the
  // tree re-lays out, the canvas scrolls so it stays under the pointer.
  const toggleAnchor = useRef<{ el: HTMLElement; x: number; y: number }>(null)

  const toggleCollapse = useCallback(
    (personId: string, button: HTMLElement) => {
      const { left, top } = button.getBoundingClientRect()
      toggleAnchor.current = { el: button, x: left, y: top }
      collapseStore.toggle(personId, autoCollapsed)
    },
    [collapseStore, autoCollapsed]
  )

  // Center once the new layout has been committed
  useEffect(() => {
    const raf = requestAnimationFrame(centerTree)
    return () => cancelAnimationFrame(raf)
  }, [autoCollapsed, centerTree])

  // Before paint, so new rows never show at their own height first and the
  // scaled box already has the new size when the toggle anchor is applied.
  useLayoutEffect(() => {
    const container = containerRef.current
    const tree = treeRef.current
    if (!container || !tree) return
    equalizeNodeHeights(container)
    const width = tree.offsetWidth
    const height = tree.offsetHeight
    setNaturalSize((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height }
    )
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

  // Keep the pressed toggle where it was. Waits for the commit in which the
  // scaled box has the tree's new size, still before anything is painted.
  useLayoutEffect(() => {
    const anchor = toggleAnchor.current
    const container = containerRef.current
    const tree = treeRef.current
    if (!anchor || !container || !tree || !naturalSize) return
    if (
      naturalSize.width !== tree.offsetWidth ||
      naturalSize.height !== tree.offsetHeight
    )
      return
    toggleAnchor.current = null
    if (!anchor.el.isConnected) return
    const { left, top } = anchor.el.getBoundingClientRect()
    container.scrollLeft += left - anchor.x
    container.scrollTop += top - anchor.y
  })

  useEffect(() => {
    const equalizeHeights = () => {
      if (containerRef.current) equalizeNodeHeights(containerRef.current)
    }

    let frame = 0
    const scheduleEqualize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(equalizeHeights)
    }

    window.addEventListener('resize', scheduleEqualize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleEqualize)
    }
  }, [])

  const handleCenter = centerTree

  const hasTree = roots.length > 0
  useEffect(() => {
    const el = treeRef.current
    if (!el) return
    const measure = () =>
      setNaturalSize((prev) =>
        prev && prev.width === el.offsetWidth && prev.height === el.offsetHeight
          ? prev
          : { width: el.offsetWidth, height: el.offsetHeight }
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasTree])

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
        aria-describedby={keyboardHintId}
        className={`h-full w-full [touch-action:pan-x_pan-y] overflow-auto bg-stone-50 ${isPressed ? 'cursor-grabbing' : 'cursor-grab'}`}
        tabIndex={0}
        onKeyDown={(e) => {
          // Keyboard users get the same "release" affordance as mouse users:
          // Escape cancels a grab/drag state on the canvas.
          if (e.key === 'Escape') handlePointerUpOrLeave()
          handleKeyDown(e)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // Prevent browser default dragging of links/images
      >
        <TreeLinesStyle />
        <span id={keyboardHintId} className='sr-only'>
          {t('treeKeyboardHint')}
        </span>

        {/*
        The scaled box takes the tree's scaled size, so the scroll area always
        matches what is drawn: nothing is cut off on the left when zoomed in
        and no empty space is left when zoomed out. mx-auto centers it when it
        is narrower than the screen.
      */}
        <div
          className='mx-auto'
          style={
            naturalSize
              ? {
                  width: naturalSize.width * scale,
                  height: naturalSize.height * scale
                }
              : undefined
          }>
          <div
            ref={treeRef}
            id='export-container'
            className={`css-tree w-max p-4 transition-opacity duration-200 ${isDragging ? 'opacity-90' : ''}`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}>
            <ul>
              <MemoizedNodeTree
                roots={roots}
                getTreeData={getTreeData}
                collapseStore={collapseStore}
                autoCollapsed={autoCollapsed}
                showAvatar={showAvatar}
                hideExpandButtons={hideExpandButtons}
                toggleCollapse={toggleCollapse}
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// The node tree is memoized so zooming and panning (which only change
// `scale` / drag state) and expand/collapse toggles (each node subscribes to
// its own branch) never re-render thousands of nodes. It lives in its own
// component so the memo is not re-evaluated on renders that early-return to
// the empty state.
function MemoizedNodeTree({
  roots,
  getTreeData,
  collapseStore,
  autoCollapsed,
  showAvatar,
  hideExpandButtons,
  toggleCollapse
}: { roots: Person[] } & TreeRenderContext) {
  const ctx = useMemo(
    () => ({
      getTreeData,
      collapseStore,
      autoCollapsed,
      showAvatar,
      hideExpandButtons,
      toggleCollapse
    }),
    [
      getTreeData,
      collapseStore,
      autoCollapsed,
      showAvatar,
      hideExpandButtons,
      toggleCollapse
    ]
  )
  return <FamilyTreeNodeRenderer roots={roots} ctx={ctx} />
}
