// Browsers refuse to create canvases past a size limit, and html-to-image then
// throws. Safari (macOS and iOS) caps the canvas area at 16,777,216 px; iOS and
// Android also cap each side lower than desktop browsers do.

export interface CanvasLimits {
  /** Longest allowed canvas side in device pixels. */
  maxSide: number
  /** Largest allowed canvas area (width * height) in device pixels. */
  maxArea: number
}

export const DESKTOP_CANVAS_LIMITS: CanvasLimits = {
  maxArea: 16_000_000,
  maxSide: 16384
}

export const MOBILE_CANVAS_LIMITS: CanvasLimits = {
  maxArea: 16_000_000,
  maxSide: 8192
}

/** Sharpest ratio used for small trees (retina quality). */
export const MAX_PIXEL_RATIO = 2
/** Below this the bitmap is unreadable, so the export is refused instead. */
export const MIN_PIXEL_RATIO = 0.1

export interface PixelRatioResult {
  ratio: number
  /** True when even MIN_PIXEL_RATIO would exceed the canvas limits. */
  tooLarge: boolean
}

/**
 * Pixel ratio for rasterizing a `width` x `height` CSS px element so the
 * canvas stays within `limits`: at most MAX_PIXEL_RATIO, scaled down (below 1
 * when needed) to fit the longest side and the area.
 */
export function safePixelRatio(
  width: number,
  height: number,
  limits: CanvasLimits = DESKTOP_CANVAS_LIMITS
): PixelRatioResult {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { ratio: MIN_PIXEL_RATIO, tooLarge: true }
  }
  const bySide = limits.maxSide / Math.max(width, height)
  const byArea = Math.sqrt(limits.maxArea / (width * height))
  const ratio = Math.min(MAX_PIXEL_RATIO, bySide, byArea)
  if (ratio < MIN_PIXEL_RATIO) {
    return { ratio: MIN_PIXEL_RATIO, tooLarge: true }
  }
  return { ratio, tooLarge: false }
}

/**
 * Canvas limits for the current device: phones and tablets (iOS, iPadOS that
 * reports itself as a Mac, Android) get the lower mobile side limit.
 */
export function canvasLimitsFor(
  userAgent: string,
  maxTouchPoints = 0
): CanvasLimits {
  const mobileUa = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)
  const iPadAsMac = /Macintosh/i.test(userAgent) && maxTouchPoints > 1
  return mobileUa || iPadAsMac ? MOBILE_CANVAS_LIMITS : DESKTOP_CANVAS_LIMITS
}

/** Thrown before rasterizing when the tree cannot fit any canvas. */
export class ExportTooLargeError extends Error {
  constructor() {
    super('Export too large for a canvas')
    this.name = 'ExportTooLargeError'
  }
}
