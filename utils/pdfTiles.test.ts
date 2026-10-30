import { describe, expect, it } from 'bun:test'

import {
  choosePdfLayout,
  chooseTileScale,
  PDF_OVERLAP_PT,
  PDF_PAGE_SIZES_PT,
  planPdfTiles
} from './pdfTiles'

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

describe('choosePdfLayout', () => {
  it('prints a tall, narrow tree on portrait pages when that saves sheets', () => {
    const a3 = choosePdfLayout(1200, 20000, 'a3')
    expect(a3.orientation).toBe('portrait')
    expect(a3.width).toBe(PDF_PAGE_SIZES_PT.a3.height)
    expect(a3.height).toBe(PDF_PAGE_SIZES_PT.a3.width)
    // Landscape A3 needs 13 sheets for the same tree.
    expect(a3.pages).toBe(9)

    const a4 = choosePdfLayout(1000, 1300, 'a4')
    expect(a4.orientation).toBe('portrait')
    expect(a4.pages).toBe(1)
  })

  it('never takes more sheets than landscape alone', () => {
    for (const [w, h] of [
      [1200, 20000],
      [20000, 1200],
      [3000, 2000],
      [1500, 2500],
      [800, 600]
    ]) {
      for (const format of ['a4', 'a3'] as const) {
        const page = PDF_PAGE_SIZES_PT[format]
        const scale = chooseTileScale(
          w,
          h,
          page.width,
          page.height,
          PDF_OVERLAP_PT
        )
        const landscape = planPdfTiles(
          w * scale,
          h * scale,
          page.width,
          page.height,
          PDF_OVERLAP_PT
        ).tiles.length
        expect(choosePdfLayout(w, h, format).pages).toBeLessThanOrEqual(
          landscape
        )
      }
    }
  })

  it('keeps a 1200 px wide tree on one column of A4 landscape', () => {
    // A4 portrait is 595 pt wide: 1200 px only fits below the legible
    // minimum scale, so it would need two columns and more sheets.
    const a4 = choosePdfLayout(1200, 20000, 'a4')
    expect(a4.orientation).toBe('landscape')
    expect(a4.pages).toBe(18)
  })

  it('a wide tree stays landscape', () => {
    expect(choosePdfLayout(20000, 1200, 'a3').orientation).toBe('landscape')
    expect(choosePdfLayout(800, 600, 'a4').orientation).toBe('landscape')
  })

  it('on a tie the orientation follows the tree shape', () => {
    expect(choosePdfLayout(1000, 1300, 'a3')).toMatchObject({
      orientation: 'portrait',
      pages: 1
    })
    expect(choosePdfLayout(1300, 1000, 'a3')).toMatchObject({
      orientation: 'landscape',
      pages: 1
    })
  })
})
