export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Largest photo the gallery accepts before it is resized in the browser. Phone
// photos are often 12-20 MB; after resizing they fit in MAX_IMAGE_BYTES.
export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024

export const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
} as const

export type ImageMimeType = keyof typeof IMAGE_EXTENSIONS

// Value for the file input's `accept` attribute.
export const IMAGE_ACCEPT = Object.keys(IMAGE_EXTENSIONS).join(',')

export type ImageValidation =
  | { ok: true; type: ImageMimeType; extension: string }
  | { ok: false; reason: 'too-large' | 'unsupported-type' }

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

// Detects the image format from the file's first bytes, so a renamed text
// file is rejected even when the browser reports `image/jpeg` for it.
export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }
  if (
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif'
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }
  return null
}

// Reads the first bytes of a file and returns its real image type, or null
// when the content is not a JPEG, PNG, GIF or WebP image.
export async function readImageType(file: Blob): Promise<ImageMimeType | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return detectImageType(header)
}

export function isAllowedImageType(type: string): type is ImageMimeType {
  return Object.hasOwn(IMAGE_EXTENSIONS, type)
}

// Checks size, the reported MIME type and the file signature. The returned
// type comes from the signature and decides the stored file extension.
export async function validateImageFile(
  file: Blob,
  maxBytes = MAX_IMAGE_BYTES
): Promise<ImageValidation> {
  if (file.size > maxBytes) return { ok: false, reason: 'too-large' }
  if (!isAllowedImageType(file.type)) {
    return { ok: false, reason: 'unsupported-type' }
  }

  const type = await readImageType(file)
  if (!type) return { ok: false, reason: 'unsupported-type' }

  return { ok: true, type, extension: IMAGE_EXTENSIONS[type] }
}

// Checks a photo chosen for the gallery, before it is resized. GIFs are stored
// as they are, so they must already fit the stored limit.
export async function validateGallerySource(
  file: Blob
): Promise<ImageValidation> {
  const validation = await validateImageFile(file, MAX_SOURCE_IMAGE_BYTES)
  if (
    validation.ok &&
    validation.type === 'image/gif' &&
    file.size > MAX_IMAGE_BYTES
  ) {
    return { ok: false, reason: 'too-large' }
  }
  return validation
}
