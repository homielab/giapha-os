const AVATAR_MAX_DIMENSION = 512
const GALLERY_MAX_DIMENSION = 2048
const QUALITY = 0.85

export interface ResizeImageOptions {
  /** Longest side in pixels; larger images are scaled down to it. */
  maxDimension: number
  /** Output format; only WebP is supported by every browser that can encode it. */
  mime?: 'image/webp'
  quality?: number
  /** Return every GIF untouched instead of only the small ones. */
  keepGifs?: boolean
  /** Images at or below this size and `maxDimension` are not re-encoded. */
  minBytes?: number
}

// An animated WebP is a RIFF/WEBP file whose VP8X header sets the animation
// flag (bit 1 of the flags byte at offset 20).
async function isAnimatedWebp(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const text = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to))
  return (
    text(0, 4) === 'RIFF' &&
    text(8, 12) === 'WEBP' &&
    text(12, 16) === 'VP8X' &&
    (bytes[20] & 0x02) !== 0
  )
}

/**
 * Downscales and re-encodes an image in the browser before upload. Returns the
 * original file when it is a GIF that must keep its animation, an animated
 * WebP, already small, not made smaller by re-encoding, or cannot be decoded.
 */
export async function resizeImage(
  file: File,
  {
    maxDimension,
    mime = 'image/webp',
    quality = QUALITY,
    keepGifs = false,
    minBytes = 300 * 1024
  }: ResizeImageOptions
): Promise<File> {
  // Keep GIFs untouched so animations survive
  if (file.type === 'image/gif' && (keepGifs || file.size <= 2 * 1024 * 1024)) {
    return file
  }

  try {
    if (file.type === 'image/webp' && (await isAnimatedWebp(file))) return file

    const bitmap = await createImageBitmap(file)
    const ratio = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    )

    if (ratio === 1 && file.size <= minBytes) {
      bitmap.close()
      return file
    }

    const width = Math.round(bitmap.width * ratio)
    const height = Math.round(bitmap.height * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    )
    // Safari < 16 can't encode WebP and silently falls back to PNG
    if (!blob || blob.type !== mime || blob.size >= file.size) {
      return file
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.webp`, { type: mime })
  } catch {
    return file
  }
}

/**
 * Avatars are displayed at 64px or less, so storing multi-megabyte originals
 * only slows down every tree view.
 */
export function resizeAvatar(
  file: File,
  maxDimension = AVATAR_MAX_DIMENSION
): Promise<File> {
  return resizeImage(file, { maxDimension })
}

/**
 * Gallery photos from a phone are 3-10 MB; 2048 px on the long side is plenty
 * for the lightbox and keeps the page and the storage bucket small. Animated
 * GIFs are stored as they are.
 */
export function resizeGalleryImage(file: File): Promise<File> {
  return resizeImage(file, {
    maxDimension: GALLERY_MAX_DIMENSION,
    keepGifs: true
  })
}
