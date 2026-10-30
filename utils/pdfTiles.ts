export type PdfTile = {
  col: number
  h: number
  row: number
  w: number
  x: number
  y: number
}

export type PdfTilePlan = {
  cols: number
  rows: number
  tiles: PdfTile[]
}

export type PdfPageFormat = 'single' | 'a4' | 'a3'

// Landscape page sizes in points (1/72 inch).
export const PDF_PAGE_SIZES_PT: Record<
  Exclude<PdfPageFormat, 'single'>,
  { height: number; width: number }
> = {
  a3: { height: 841.89, width: 1190.55 },
  a4: { height: 595.28, width: 841.89 }
}

export const PDF_OVERLAP_PT = (10 / 25.4) * 72 // 10 mm to glue sheets

// Start offsets of the tiles along one axis. The tiles are spread evenly so
// the overlap between neighbours is the same and at least `overlap`.
function planAxis(length: number, page: number, overlap: number) {
  if (length <= page) return { size: length, starts: [0] }
  const step = Math.max(page - overlap, 1)
  const count = Math.ceil((length - overlap) / step)
  const gap = (length - page) / (count - 1)
  return {
    size: page,
    starts: Array.from({ length: count }, (_, i) => i * gap)
  }
}

/**
 * Cuts an image of imageW x imageH into page-sized tiles, all in the same
 * unit as the page. Neighbouring tiles overlap by at least `overlap`; an image
 * that fits on one page gives a single tile of the image's own size.
 */
export function planPdfTiles(
  imageW: number,
  imageH: number,
  pageW: number,
  pageH: number,
  overlap: number
): PdfTilePlan {
  const safeOverlap = Math.min(Math.max(overlap, 0), Math.min(pageW, pageH) / 2)
  const xs = planAxis(imageW, pageW, safeOverlap)
  const ys = planAxis(imageH, pageH, safeOverlap)
  const tiles: PdfTile[] = []
  ys.starts.forEach((y, row) =>
    xs.starts.forEach((x, col) =>
      tiles.push({ col, h: ys.size, row, w: xs.size, x, y })
    )
  )
  return { cols: xs.starts.length, rows: ys.starts.length, tiles }
}

const MIN_SCALE = 0.5 // points per CSS px; below this the names are too small
const MAX_SCALE = 1.5

/**
 * Points per CSS pixel for a tree of cssW x cssH: the tree spans whole pages
 * along one axis (height or width, whichever gives fewer sheets) while staying
 * legible.
 */
export function chooseTileScale(
  cssW: number,
  cssH: number,
  pageW: number,
  pageH: number,
  overlap: number
): number {
  const candidates: number[] = []
  const addAxis = (length: number, page: number) => {
    for (let n = 1; n <= 200; n++) {
      const scale = (n * page - (n - 1) * overlap) / length
      if (scale >= MIN_SCALE) {
        candidates.push(Math.min(scale, MAX_SCALE))
        return
      }
    }
  }
  addAxis(cssH, pageH)
  addAxis(cssW, pageW)
  if (candidates.length === 0) return MIN_SCALE
  let best = candidates[0]
  let bestPages = Infinity
  for (const scale of candidates) {
    const plan = planPdfTiles(cssW * scale, cssH * scale, pageW, pageH, overlap)
    const pages = plan.tiles.length
    if (pages < bestPages || (pages === bestPages && scale > best)) {
      best = scale
      bestPages = pages
    }
  }
  return best
}

export type PdfPageLayout = {
  height: number
  orientation: 'landscape' | 'portrait'
  /** Number of sheets the tree takes. */
  pages: number
  /** Points per CSS px, from `chooseTileScale`. */
  scale: number
  width: number
}

/**
 * Page orientation and scale for printing a tree of cssW x cssH on A4/A3:
 * the orientation that needs fewer sheets, and on a tie the one matching the
 * tree's shape (portrait for a tree taller than it is wide).
 */
export function choosePdfLayout(
  cssW: number,
  cssH: number,
  format: Exclude<PdfPageFormat, 'single'>,
  overlap = PDF_OVERLAP_PT
): PdfPageLayout {
  const landscape = PDF_PAGE_SIZES_PT[format]
  const preferred = cssH > cssW ? 'portrait' : 'landscape'
  const layouts = (['landscape', 'portrait'] as const).map((orientation) => {
    const width =
      orientation === 'landscape' ? landscape.width : landscape.height
    const height =
      orientation === 'landscape' ? landscape.height : landscape.width
    const scale = chooseTileScale(cssW, cssH, width, height, overlap)
    const pages = planPdfTiles(
      cssW * scale,
      cssH * scale,
      width,
      height,
      overlap
    ).tiles.length
    return { height, orientation, pages, scale, width }
  })
  layouts.sort(
    (a, b) =>
      a.pages - b.pages ||
      Number(b.orientation === preferred) - Number(a.orientation === preferred)
  )
  return layouts[0]
}
