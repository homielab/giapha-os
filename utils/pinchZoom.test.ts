import { describe, expect, test } from 'bun:test'

import {
  MAX_SCALE,
  MIN_SCALE,
  pinchTransform,
  pointerDistance,
  pointerMidpoint
} from './pinchZoom'

const start = {
  scale: 1,
  distance: 100,
  scrollLeft: 200,
  scrollTop: 50,
  midpoint: { x: 300, y: 200 }
}

describe('pointer helpers', () => {
  test('distance and midpoint of two pointers', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(pointerMidpoint({ x: 0, y: 10 }, { x: 10, y: 30 })).toEqual({
      x: 5,
      y: 20
    })
  })
})

describe('pinchTransform', () => {
  test('keeps scale and scroll when nothing moved', () => {
    expect(pinchTransform(start, 100, start.midpoint)).toEqual({
      scale: 1,
      scrollLeft: 200,
      scrollTop: 50
    })
  })

  test('spreading fingers zooms in around the midpoint', () => {
    const r = pinchTransform(start, 150, start.midpoint)
    expect(r.scale).toBe(1.5)
    // content point under the midpoint: (200 + 300) / 1 = 500 -> 750 - 300
    expect(r.scrollLeft).toBe(450)
    expect(r.scrollTop).toBe(175)
  })

  test('pinching in zooms out and never scrolls below zero', () => {
    const r = pinchTransform(start, 50, start.midpoint)
    expect(r.scale).toBe(0.5)
    expect(r.scrollLeft).toBe(0)
    expect(r.scrollTop).toBe(0)
  })

  test('moving both fingers pans', () => {
    const r = pinchTransform(start, 100, { x: 250, y: 180 })
    expect(r.scale).toBe(1)
    expect(r.scrollLeft).toBe(250)
    expect(r.scrollTop).toBe(70)
  })

  test('scale is clamped to the zoom limits', () => {
    expect(pinchTransform(start, 10000, start.midpoint).scale).toBe(MAX_SCALE)
    expect(pinchTransform(start, 1, start.midpoint).scale).toBe(MIN_SCALE)
  })

  test('starts from the current scale', () => {
    const r = pinchTransform({ ...start, scale: 0.5 }, 200, start.midpoint)
    expect(r.scale).toBe(1)
    expect(r.scrollLeft).toBe((200 + 300) * 2 - 300)
  })

  test('zero start distance leaves the scale alone', () => {
    expect(
      pinchTransform({ ...start, distance: 0 }, 50, start.midpoint).scale
    ).toBe(1)
  })
})
