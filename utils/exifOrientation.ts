/**
 * EXIF orientation (1–8) of a JPEG, 1 when absent or unreadable. Reads only
 * the APP1 "Exif" segment before the image data.
 */
export function readJpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return 1
    const length = view.getUint16(offset + 2)
    if (marker === 0xffe1) return readExifOrientation(view, offset + 4, length)
    offset += 2 + length
  }
  return 1
}

function readExifOrientation(
  view: DataView,
  start: number,
  length: number
): number {
  const end = Math.min(view.byteLength, start + length - 2)
  // "Exif\0\0", then the TIFF header
  if (start + 14 > end || view.getUint32(start) !== 0x45786966) return 1
  const tiff = start + 6
  const order = view.getUint16(tiff)
  if (order !== 0x4949 && order !== 0x4d4d) return 1
  const little = order === 0x4949

  const ifd = tiff + view.getUint32(tiff + 4, little)
  if (ifd + 2 > end) return 1
  const count = view.getUint16(ifd, little)
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (entry + 12 > end) return 1
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little)
      return value >= 1 && value <= 8 ? value : 1
    }
  }
  return 1
}

/** Orientations 5–8 turn the picture a quarter, so width and height swap. */
export function swapsSides(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8
}

/**
 * Canvas transform (for `setTransform`) that draws a stored `width` x `height`
 * picture upright on a canvas sized for the given orientation.
 */
export function orientationTransform(
  orientation: number,
  width: number,
  height: number
): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2:
      return [-1, 0, 0, 1, width, 0]
    case 3:
      return [-1, 0, 0, -1, width, height]
    case 4:
      return [1, 0, 0, -1, 0, height]
    case 5:
      return [0, 1, 1, 0, 0, 0]
    case 6:
      return [0, 1, -1, 0, height, 0]
    case 7:
      return [0, -1, -1, 0, height, width]
    case 8:
      return [0, -1, 1, 0, 0, width]
    default:
      return [1, 0, 0, 1, 0, 0]
  }
}
