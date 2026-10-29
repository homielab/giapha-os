import { describe, expect, test } from 'bun:test'

import { MAX_SCALE, MIN_SCALE } from './pinchZoom'
import {
  KEYBOARD_SCROLL_STEP,
  scrollAfterZoomAround,
  treeKeyAction
} from './treeKeyboard'

describe('treeKeyAction', () => {
  test('+ and - change the scale by 0.1', () => {
    expect(treeKeyAction('+', 1)).toEqual({ type: 'zoom', scale: 1.1 })
    expect(treeKeyAction('=', 1)).toEqual({ type: 'zoom', scale: 1.1 })
    expect(treeKeyAction('-', 1)).toEqual({ type: 'zoom', scale: 0.9 })
    expect(treeKeyAction('_', 1)).toEqual({ type: 'zoom', scale: 0.9 })
  })

  test('zoom stays within the allowed range', () => {
    expect(treeKeyAction('+', MAX_SCALE)).toEqual({
      type: 'zoom',
      scale: MAX_SCALE
    })
    expect(treeKeyAction('-', MIN_SCALE)).toEqual({
      type: 'zoom',
      scale: MIN_SCALE
    })
  })

  test('0 resets the zoom', () => {
    expect(treeKeyAction('0', 1.7)).toEqual({ type: 'reset' })
  })

  test('arrows scroll by 40 px', () => {
    expect(KEYBOARD_SCROLL_STEP).toBe(40)
    expect(treeKeyAction('ArrowLeft', 1)).toEqual({
      type: 'scroll',
      dx: -40,
      dy: 0
    })
    expect(treeKeyAction('ArrowRight', 1)).toEqual({
      type: 'scroll',
      dx: 40,
      dy: 0
    })
    expect(treeKeyAction('ArrowUp', 1)).toEqual({
      type: 'scroll',
      dx: 0,
      dy: -40
    })
    expect(treeKeyAction('ArrowDown', 1)).toEqual({
      type: 'scroll',
      dx: 0,
      dy: 40
    })
  })

  test('other keys and keys with a modifier are ignored', () => {
    expect(treeKeyAction('a', 1)).toBeNull()
    expect(treeKeyAction('Enter', 1)).toBeNull()
    expect(treeKeyAction('+', 1, { ctrlKey: true })).toBeNull()
    expect(treeKeyAction('0', 1, { metaKey: true })).toBeNull()
    expect(treeKeyAction('ArrowDown', 1, { altKey: true })).toBeNull()
  })
})

describe('scrollAfterZoomAround', () => {
  // Screen position of a content point, given scroll, scale and its unscaled
  // position: what must not change across a zoom.
  const onScreen = (scroll: number, scale: number, content: number) =>
    content * scale - scroll

  test('keeps the anchor point at the same screen position', () => {
    const cases = [
      { scroll: 100, anchor: 400, from: 1, to: 2 },
      { scroll: 600, anchor: 400, from: 2, to: 1 },
      { scroll: 250, anchor: 37, from: 1.1, to: 1.2 },
      { scroll: 900, anchor: 712, from: 1.7, to: 0.9 }
    ]
    for (const { scroll, anchor, from, to } of cases) {
      const content = (scroll + anchor) / from
      const next = scrollAfterZoomAround(scroll, anchor, from, to)
      expect(onScreen(next, to, content)).toBeCloseTo(anchor, 9)
      expect(onScreen(scroll, from, content)).toBeCloseTo(anchor, 9)
    }
  })

  test('zooms around the viewport centre (+/- buttons and keys)', () => {
    // Centre at content x = (100 + 400) / 1 = 500 px; at scale 2 it is at 1000.
    expect(scrollAfterZoomAround(100, 400, 1, 2)).toBe(600)
    expect(scrollAfterZoomAround(600, 400, 2, 1)).toBe(100)
  })

  test('zooms around the pointer (Ctrl + wheel)', () => {
    // Pointer at 100 px: content x = (300 + 100) / 1 = 400 px → 800 at scale 2.
    expect(scrollAfterZoomAround(300, 100, 1, 2)).toBe(700)
  })

  test('chained zooms equal one zoom over the whole range', () => {
    const a = scrollAfterZoomAround(200, 150, 1, 1.1)
    const b = scrollAfterZoomAround(a, 150, 1.1, 1.3)
    expect(b).toBeCloseTo(scrollAfterZoomAround(200, 150, 1, 1.3), 9)
  })

  test('never goes below 0', () => {
    expect(scrollAfterZoomAround(0, 400, 1, 0.5)).toBe(0)
  })

  test('is unchanged for an invalid starting scale', () => {
    expect(scrollAfterZoomAround(50, 400, 0, 1)).toBe(50)
  })
})
