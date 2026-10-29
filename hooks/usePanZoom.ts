import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  clampScale,
  PinchStart,
  pinchTransform,
  Point,
  pointerDistance,
  pointerMidpoint
} from '@/utils/pinchZoom'
import { scrollAfterZoomAround, treeKeyAction } from '@/utils/treeKeyboard'

export function usePanZoom(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [isPressed, setIsPressed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hasDraggedRef = useRef(false)
  // Drag bookkeeping lives in refs: it changes on every pointer event and must
  // not trigger re-renders of the (potentially huge) tree.
  const dragStartRef = useRef({ x: 0, y: 0 })
  const scrollStartRef = useRef({ left: 0, top: 0 })
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)

  // Touch pointers currently down; two of them make a pinch. One finger is
  // left to the browser (native scrolling, `touch-action: pan-x pan-y`).
  const touchesRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<PinchStart | null>(null)
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null)

  // Zoom to `next` keeping the content under `anchor` (container pixels;
  // default: the centre of the viewport) where it is on screen. Several zooms
  // before the next render (fast wheel events) chain on the pending scroll.
  const zoomTo = useCallback(
    (next: number, anchor?: Point) => {
      const el = containerRef.current
      const current = scaleRef.current
      if (next === current) return
      if (el) {
        const point = anchor ?? {
          x: el.clientWidth / 2,
          y: el.clientHeight / 2
        }
        const base = pendingScrollRef.current ?? {
          left: el.scrollLeft,
          top: el.scrollTop
        }
        pendingScrollRef.current = {
          left: scrollAfterZoomAround(base.left, point.x, current, next),
          top: scrollAfterZoomAround(base.top, point.y, current, next)
        }
      }
      scaleRef.current = next
      setScale(next)
    },
    [containerRef]
  )

  const handleZoomIn = useCallback(
    () => zoomTo(clampScale(scaleRef.current + 0.1)),
    [zoomTo]
  )
  const handleZoomOut = useCallback(
    () => zoomTo(clampScale(scaleRef.current - 0.1)),
    [zoomTo]
  )
  const handleResetZoom = useCallback(() => zoomTo(1), [zoomTo])

  // Scroll after the scaled canvas has its new size, otherwise the browser
  // clamps the offset to the old, smaller scroll area.
  useLayoutEffect(() => {
    scaleRef.current = scale
    const pending = pendingScrollRef.current
    const el = containerRef.current
    if (!pending || !el) return
    pendingScrollRef.current = null
    el.scrollLeft = pending.left
    el.scrollTop = pending.top
  }, [scale, containerRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Trackpad pinch (reported as ctrl+wheel) and Ctrl/⌘ + scroll zoom.
    // Plain scrolling keeps panning the canvas as before.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomTo(clampScale(scaleRef.current * Math.exp(-e.deltaY * 0.01)), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    // Two fingers must not scroll the page or the canvas while pinching.
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && e.cancelable) e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [containerRef, zoomTo])

  const beginPinch = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const [a, b] = [...touchesRef.current.values()]
    const mid = pointerMidpoint(a, b)
    pinchRef.current = {
      scale: scaleRef.current,
      distance: pointerDistance(a, b),
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      midpoint: { x: mid.x - rect.left, y: mid.y - rect.top }
    }
  }

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    const el = containerRef.current
    if (!el) return
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return
      setIsPressed(true)
      hasDraggedRef.current = false
      dragStartRef.current = { x: e.pageX, y: e.pageY }
      scrollStartRef.current = { left: el.scrollLeft, top: el.scrollTop }
      return
    }
    if (e.pointerType !== 'touch') return
    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touchesRef.current.size === 2) beginPinch(el)
  }

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    const el = containerRef.current
    if (!el) return

    if (e.pointerType === 'touch') {
      if (!touchesRef.current.has(e.pointerId)) return
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const pinch = pinchRef.current
      if (!pinch || touchesRef.current.size < 2) return
      const [a, b] = [...touchesRef.current.values()]
      const rect = el.getBoundingClientRect()
      const mid = pointerMidpoint(a, b)
      const next = pinchTransform(pinch, pointerDistance(a, b), {
        x: mid.x - rect.left,
        y: mid.y - rect.top
      })
      pendingScrollRef.current = { left: next.scrollLeft, top: next.scrollTop }
      if (next.scale === scaleRef.current) {
        // Same scale: no re-render will follow, so pan right away.
        el.scrollLeft = next.scrollLeft
        el.scrollTop = next.scrollTop
        pendingScrollRef.current = null
      } else {
        setScale(next.scale)
      }
      return
    }

    if (e.pointerType !== 'mouse' || !isPressed) return

    // Only start dragging if moved a bit to allow simple clicks
    const dx = e.pageX - dragStartRef.current.x
    const dy = e.pageY - dragStartRef.current.y

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true)
      hasDraggedRef.current = true
    }

    if (hasDraggedRef.current) {
      e.preventDefault()
      el.scrollLeft = scrollStartRef.current.left - dx
      el.scrollTop = scrollStartRef.current.top - dy
    }
  }

  const handlePointerUpOrLeave = (e?: PointerEvent<HTMLElement>) => {
    if (e?.pointerType === 'touch') {
      touchesRef.current.delete(e.pointerId)
      // A finger lifted: end the pinch; the remaining finger scrolls natively.
      pinchRef.current = null
      pendingScrollRef.current = null
      return
    }
    setIsPressed(false)
    setIsDragging(false)
  }

  // Keyboard shortcuts of the focused canvas: + / - zoom around the centre,
  // 0 resets, arrows scroll. Keys from focusable nodes inside are left alone.
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = containerRef.current
    if (!el || e.target !== e.currentTarget) return
    const action = treeKeyAction(e.key, scaleRef.current, e)
    if (!action) return
    e.preventDefault()
    if (action.type === 'scroll') {
      el.scrollBy({ left: action.dx, top: action.dy })
      return
    }
    zoomTo(action.type === 'zoom' ? action.scale : 1)
  }

  const handleClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    // Intercept clicks if we were dragging, prevent links from opening
    if (hasDraggedRef.current) {
      e.stopPropagation()
      e.preventDefault()
      hasDraggedRef.current = false
    }
  }

  return {
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
  }
}
