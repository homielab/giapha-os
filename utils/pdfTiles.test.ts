import { describe, expect, it } from 'bun:test'

import { chooseTileScale, planPdfTiles } from './pdfTiles'

describe('planPdfTiles', () => {
  it('gives one tile when the image fits on a page', () => {
    const plan = planPdfTiles(500, 300, 800, 600, 28)
    expect(plan.cols).toBe(1)
    expect(plan.rows).toBe(1)
    expect(plan.tiles).toEqual([{ col: 0, h: 300, row: 0, w: 500, x: 0, y: 0 }])
  })

  it('splits evenly and covers the whole image with overlap', () => {
    const plan = planPdfTiles(2000, 1000, 800, 600, 30)
    expect(plan.cols).toBe(3)
    expect(plan.rows).toBe(2)
    expect(plan.tiles).toHaveLength(6)
    const xs = plan.tiles.filter((t) => t.row === 0).map((t) => t.x)
    expect(xs[0]).toBe(0)
    expect(xs[2] + 800).toBeCloseTo(2000)
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1])
    expect(800 - (xs[1] - xs[0])).toBeGreaterThanOrEqual(30)
    const last = plan.tiles[plan.tiles.length - 1]
    expect(last.y + last.h).toBeCloseTo(1000)
    for (const tile of plan.tiles) {
      expect(tile.w).toBe(800)
      expect(tile.h).toBe(600)
    }
  })

  it('does not add a page when the image is exactly one page', () => {
    expect(planPdfTiles(800, 600, 800, 600, 30).tiles).toHaveLength(1)
  })

  it('needs two tiles just past one page', () => {
    const plan = planPdfTiles(801, 600, 800, 600, 30)
    expect(plan.cols).toBe(2)
    expect(plan.tiles[1].x + 800).toBeCloseTo(801)
  })
})

describe('chooseTileScale', () => {
  it('stays legible and not larger than the cap', () => {
    const scale = chooseTileScale(6000, 3000, 842, 595, 28)
    expect(scale).toBeGreaterThanOrEqual(0.5)
    expect(scale).toBeLessThanOrEqual(1.5)
  })

  it('does not blow up a small tree', () => {
    expect(chooseTileScale(300, 200, 842, 595, 28)).toBe(1.5)
  })
})
