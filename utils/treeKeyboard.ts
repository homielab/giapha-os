import { clampScale } from '@/utils/pinchZoom'

/** Pixels the arrow keys scroll the tree canvas by. */
export const KEYBOARD_SCROLL_STEP = 40
/** Scale change of the + / - keys (same as the toolbar buttons). */
export const KEYBOARD_ZOOM_STEP = 0.1

export type TreeKeyAction =
  | { type: 'zoom'; scale: number }
  | { type: 'reset' }
  | { type: 'scroll'; dx: number; dy: number }

/**
 * What a key press does on the focused tree canvas, or null when the key is
 * not a tree shortcut (or a modifier is held, so browser shortcuts such as
 * Ctrl + plus keep working).
 */
export function treeKeyAction(
  key: string,
  currentScale: number,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}
): TreeKeyAction | null {
  if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) return null
  switch (key) {
    case '+':
    case '=':
      return {
        type: 'zoom',
        scale: clampScale(currentScale + KEYBOARD_ZOOM_STEP)
      }
    case '-':
    case '_':
      return {
        type: 'zoom',
        scale: clampScale(currentScale - KEYBOARD_ZOOM_STEP)
      }
    case '0':
      return { type: 'reset' }
    case 'ArrowLeft':
      return { type: 'scroll', dx: -KEYBOARD_SCROLL_STEP, dy: 0 }
    case 'ArrowRight':
      return { type: 'scroll', dx: KEYBOARD_SCROLL_STEP, dy: 0 }
    case 'ArrowUp':
      return { type: 'scroll', dx: 0, dy: -KEYBOARD_SCROLL_STEP }
    case 'ArrowDown':
      return { type: 'scroll', dx: 0, dy: KEYBOARD_SCROLL_STEP }
    default:
      return null
  }
}

/**
 * Scroll offset along one axis that keeps the content point at `anchor`
 * (viewport pixels from the container's top-left corner) in place when the
 * scale changes from `from` to `to`.
 */
export function scrollAfterZoomAround(
  scroll: number,
  anchor: number,
  from: number,
  to: number
): number {
  if (from <= 0) return scroll
  return Math.max(0, ((scroll + anchor) * to) / from - anchor)
}
