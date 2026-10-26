import { describe, expect, test } from 'bun:test'

import { MAX_SCALE, MIN_SCALE } from './pinchZoom'
import {
  KEYBOARD_SCROLL_STEP,
  scrollAfterZoomAroundCenter,
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

describe('scrollAfterZoomAroundCenter', () => {
  test('keeps the centre point of the viewport in place', () => {
    // Centre at content x = (100 + 400) / 1 = 500 px; at scale 2 it is at 1000.
    expect(scrollAfterZoomAroundCenter(100, 800, 1, 2)).toBe(600)
    expect(scrollAfterZoomAroundCenter(600, 800, 2, 1)).toBe(100)
  })

  test('never goes below 0', () => {
    expect(scrollAfterZoomAroundCenter(0, 800, 1, 0.5)).toBe(0)
  })

  test('is unchanged for an invalid starting scale', () => {
    expect(scrollAfterZoomAroundCenter(50, 800, 0, 1)).toBe(50)
  })
})
