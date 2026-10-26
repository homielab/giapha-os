export const MIN_SCALE = 0.3
export const MAX_SCALE = 2

export const clampScale = (s: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(s * 100) / 100))

export type Point = { x: number; y: number }

export function pointerDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function pointerMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export type PinchStart = {
  scale: number
  distance: number
  // Scroll offsets of the container when the pinch began.
  scrollLeft: number
  scrollTop: number
  // Midpoint of the two fingers, relative to the container's top-left corner.
  midpoint: Point
}

/**
 * Scale and scroll position after the fingers moved to `distance` apart with
 * their midpoint at `midpoint` (container coordinates). The content point that
 * was under the starting midpoint stays under the current midpoint, so the tree
 * zooms around the fingers and follows them when they drift.
 */
export function pinchTransform(
  start: PinchStart,
  distance: number,
  midpoint: Point
) {
  const scale =
    start.distance > 0
      ? clampScale(start.scale * (distance / start.distance))
      : start.scale
  const ratio = scale / start.scale
  return {
    scale,
    scrollLeft: Math.max(
      0,
      (start.scrollLeft + start.midpoint.x) * ratio - midpoint.x
    ),
    scrollTop: Math.max(
      0,
      (start.scrollTop + start.midpoint.y) * ratio - midpoint.y
    )
  }
}
