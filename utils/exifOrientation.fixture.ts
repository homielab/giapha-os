// Test-only helper.
/** Minimal JPEG: SOI, an optional APP0, an APP1 Exif with one IFD0 entry, SOS. */
export function jpegWithOrientation(
  orientation: number,
  little = false,
  withApp0 = true
): Uint8Array {
  const u16 = (n: number) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff])
  const u32 = (n: number) =>
    little
      ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]
      : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(1),
    ...u16(0x0112),
    ...u16(3),
    ...u32(1),
    ...u16(orientation),
    0,
    0,
    ...u32(0)
  ]
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const app1 = [0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff]
  const app0 = withApp0 ? [0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46] : []
  return new Uint8Array([
    0xff,
    0xd8,
    ...app0,
    ...app1,
    ...exif,
    0xff,
    0xda,
    0x00,
    0x02
  ])
}
