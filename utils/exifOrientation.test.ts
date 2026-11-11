import { describe, expect, it } from 'bun:test'

import {
  orientationTransform,
  readJpegOrientation,
  swapsSides
} from './exifOrientation'
import { jpegWithOrientation } from './exifOrientation.fixture'

describe('readJpegOrientation', () => {
  it('reads big- and little-endian EXIF, after an APP0 segment', () => {
    expect(readJpegOrientation(jpegWithOrientation(6))).toBe(6)
    expect(readJpegOrientation(jpegWithOrientation(3, true))).toBe(3)
    expect(readJpegOrientation(jpegWithOrientation(8, false, false))).toBe(8)
  })

  it('returns 1 for no EXIF, another format or an invalid value', () => {
    expect(readJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda]))).toBe(
      1
    )
    expect(readJpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(
      1
    )
    expect(readJpegOrientation(jpegWithOrientation(9))).toBe(1)
    expect(readJpegOrientation(jpegWithOrientation(6).slice(0, 20))).toBe(1)
  })
})

describe('orientationTransform', () => {
  // Where the stored top-left (0,0) and top-right (w,0) corners end up.
  const apply = (m: number[], x: number, y: number) => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5]
  ]

  it('keeps every corner on the canvas for all 8 orientations', () => {
    const [w, h] = [40, 30]
    for (let o = 1; o <= 8; o++) {
      const [cw, ch] = swapsSides(o) ? [h, w] : [w, h]
      const m = orientationTransform(o, w, h)
      for (const [x, y] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h]
      ]) {
        const [px, py] = apply(m, x, y)
        expect(px).toBeGreaterThanOrEqual(0)
        expect(px).toBeLessThanOrEqual(cw)
        expect(py).toBeGreaterThanOrEqual(0)
        expect(py).toBeLessThanOrEqual(ch)
      }
    }
  })

  it('turns orientation 6 (phone held upright) a quarter clockwise', () => {
    // The stored top-left corner lands at the top right.
    expect(apply(orientationTransform(6, 40, 30), 0, 0)).toEqual([30, 0])
    expect(swapsSides(6)).toBe(true)
    expect(swapsSides(3)).toBe(false)
  })
})
