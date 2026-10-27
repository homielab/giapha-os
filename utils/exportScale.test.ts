import { describe, expect, test } from 'bun:test'

import {
  canvasLimitsFor,
  DESKTOP_CANVAS_LIMITS,
  MIN_PIXEL_RATIO,
  MOBILE_CANVAS_LIMITS,
  safePixelRatio
} from './exportScale'

const fits = (
  width: number,
  height: number,
  ratio: number,
  limits = DESKTOP_CANVAS_LIMITS
) =>
  Math.max(width, height) * ratio <= limits.maxSide + 1e-6 &&
  width * height * ratio * ratio <= limits.maxArea + 1e-3

describe('safePixelRatio', () => {
  test('small trees keep the retina ratio', () => {
    expect(safePixelRatio(1000, 800)).toEqual({ ratio: 2, tooLarge: false })
    expect(safePixelRatio(1000, 800, MOBILE_CANVAS_LIMITS).ratio).toBe(2)
  })

  test('a side at the mobile limit renders at 1x', () => {
    const { ratio, tooLarge } = safePixelRatio(8192, 1000, MOBILE_CANVAS_LIMITS)
    expect(ratio).toBe(1)
    expect(tooLarge).toBe(false)
  })

  test('wide trees scale below 1 instead of stopping at 1x', () => {
    const { ratio, tooLarge } = safePixelRatio(
      30000,
      5000,
      MOBILE_CANVAS_LIMITS
    )
    expect(ratio).toBeCloseTo(8192 / 30000, 5)
    expect(ratio).toBeCloseTo(0.27, 2)
    expect(tooLarge).toBe(false)
    expect(fits(30000, 5000, ratio, MOBILE_CANVAS_LIMITS)).toBe(true)
  })

  test('the area limit applies when both sides are large', () => {
    const { ratio, tooLarge } = safePixelRatio(12000, 12000)
    expect(ratio).toBeLessThan(1)
    expect(ratio).toBeCloseTo(Math.sqrt(16_000_000) / 12000, 5)
    expect(tooLarge).toBe(false)
    expect(fits(12000, 12000, ratio)).toBe(true)
  })

  test('desktop allows a longer side than mobile', () => {
    const desktop = safePixelRatio(16000, 500).ratio
    const mobile = safePixelRatio(16000, 500, MOBILE_CANVAS_LIMITS).ratio
    expect(desktop).toBeGreaterThan(mobile)
    expect(fits(16000, 500, desktop)).toBe(true)
  })

  test('sizes that would need less than the floor are too large', () => {
    expect(safePixelRatio(1_000_000, 1_000_000)).toEqual({
      ratio: MIN_PIXEL_RATIO,
      tooLarge: true
    })
    expect(safePixelRatio(200_000, 100).tooLarge).toBe(true)
  })

  test('nonsense sizes are too large', () => {
    for (const [w, h] of [
      [0, 100],
      [100, -5],
      [Number.NaN, 100],
      [100, Number.POSITIVE_INFINITY]
    ]) {
      expect(safePixelRatio(w, h).tooLarge).toBe(true)
    }
  })
})

describe('canvasLimitsFor', () => {
  test('phones, tablets and iPads reporting as Mac get mobile limits', () => {
    expect(
      canvasLimitsFor(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      )
    ).toBe(MOBILE_CANVAS_LIMITS)
    expect(
      canvasLimitsFor('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140')
    ).toBe(MOBILE_CANVAS_LIMITS)
    expect(
      canvasLimitsFor(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        5
      )
    ).toBe(MOBILE_CANVAS_LIMITS)
  })

  test('desktop browsers get desktop limits', () => {
    expect(
      canvasLimitsFor(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        0
      )
    ).toBe(DESKTOP_CANVAS_LIMITS)
    expect(
      canvasLimitsFor('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140')
    ).toBe(DESKTOP_CANVAS_LIMITS)
  })
})
