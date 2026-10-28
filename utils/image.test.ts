import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { resizeAvatar, resizeGalleryImage, resizeImage } from './image'

type Globals = {
  createImageBitmap?: unknown
  document?: unknown
}
const g = globalThis as unknown as Globals

interface FakeCanvas {
  width: number
  height: number
  drawn: { width: number; height: number } | null
}

let canvases: FakeCanvas[] = []
let closed = 0
let encodedType = 'image/webp'
let encodedSize = 1000
let hasContext = true
let decodeFails = false

const original = {
  createImageBitmap: g.createImageBitmap,
  document: g.document
}

function fakeFile(type: string, size: number, name = 'photo.jpg') {
  return new File([new Uint8Array(size)], name, { type })
}

beforeEach(() => {
  canvases = []
  closed = 0
  encodedType = 'image/webp'
  encodedSize = 1000
  hasContext = true
  decodeFails = false
  g.createImageBitmap = async () => {
    if (decodeFails) throw new Error('cannot decode')
    return { width: 2000, height: 1000, close: () => (closed += 1) }
  }
  g.document = {
    createElement: () => {
      const canvas: FakeCanvas & Record<string, unknown> = {
        width: 0,
        height: 0,
        drawn: null,
        getContext: () =>
          hasContext
            ? {
                drawImage: (
                  _b: unknown,
                  _x: number,
                  _y: number,
                  w: number,
                  h: number
                ) => {
                  canvas.drawn = { width: w, height: h }
                }
              }
            : null,
        toBlob: (cb: (blob: Blob | null) => void) =>
          cb(new Blob([new Uint8Array(encodedSize)], { type: encodedType }))
      }
      canvases.push(canvas)
      return canvas
    }
  }
})

afterEach(() => {
  g.createImageBitmap = original.createImageBitmap
  g.document = original.document
})

describe('resizeAvatar', () => {
  test('keeps a small GIF so the animation survives', async () => {
    const file = fakeFile('image/gif', 1024, 'a.gif')
    expect(await resizeAvatar(file)).toBe(file)
    expect(canvases).toHaveLength(0)
  })

  test('a large GIF is converted like any other image', async () => {
    const file = fakeFile('image/gif', 3 * 1024 * 1024, 'a.gif')
    const out = await resizeAvatar(file)
    expect(out).not.toBe(file)
    expect(out.type).toBe('image/webp')
  })

  test('downscales to 512 px on the long side and renames to .webp', async () => {
    const file = fakeFile('image/jpeg', 500_000, 'holiday.photo.jpg')
    const out = await resizeAvatar(file)
    expect(canvases[0].width).toBe(512)
    expect(canvases[0].height).toBe(256)
    expect(canvases[0].drawn).toEqual({ width: 512, height: 256 })
    expect(out.name).toBe('holiday.photo.webp')
    expect(out.type).toBe('image/webp')
    expect(out.size).toBe(1000)
    expect(closed).toBe(1)
  })

  test('uses the given maximum dimension', async () => {
    await resizeAvatar(fakeFile('image/png', 500_000), 100)
    expect(canvases[0].width).toBe(100)
    expect(canvases[0].height).toBe(50)
  })

  test('keeps an image that is already small and light', async () => {
    g.createImageBitmap = async () => ({
      width: 200,
      height: 100,
      close: () => (closed += 1)
    })
    const file = fakeFile('image/jpeg', 100 * 1024)
    expect(await resizeAvatar(file)).toBe(file)
    expect(canvases).toHaveLength(0)
    expect(closed).toBe(1)
  })

  test('re-encodes a small image that is heavy', async () => {
    g.createImageBitmap = async () => ({
      width: 200,
      height: 100,
      close: () => (closed += 1)
    })
    const out = await resizeAvatar(fakeFile('image/jpeg', 400 * 1024))
    expect(out.type).toBe('image/webp')
    expect(canvases[0].width).toBe(200)
  })

  test('returns the original when the browser cannot decode it', async () => {
    decodeFails = true
    const file = fakeFile('image/jpeg', 500_000)
    expect(await resizeAvatar(file)).toBe(file)
  })

  test('returns the original without a 2D canvas context', async () => {
    hasContext = false
    const file = fakeFile('image/jpeg', 500_000)
    expect(await resizeAvatar(file)).toBe(file)
    expect(closed).toBe(1)
  })

  test('returns the original when WebP is not supported (PNG fallback)', async () => {
    encodedType = 'image/png'
    const file = fakeFile('image/jpeg', 500_000)
    expect(await resizeAvatar(file)).toBe(file)
  })

  test('returns the original when the result is not smaller', async () => {
    encodedSize = 600_000
    const file = fakeFile('image/jpeg', 500_000)
    expect(await resizeAvatar(file)).toBe(file)
  })

  test('names a file without a base name "image"', async () => {
    const out = await resizeAvatar(fakeFile('image/jpeg', 500_000, '.jpg'))
    expect(out.name).toBe('image.webp')
  })
})

function bitmapOf(width: number, height: number) {
  g.createImageBitmap = async () => ({
    width,
    height,
    close: () => (closed += 1)
  })
}

describe('resizeGalleryImage', () => {
  test('scales a 4000x3000 photo to 2048x1536 WebP', async () => {
    bitmapOf(4000, 3000)
    const out = await resizeGalleryImage(
      fakeFile('image/jpeg', 6 * 1024 * 1024, 'IMG_1.jpg')
    )
    expect(canvases[0].width).toBe(2048)
    expect(canvases[0].height).toBe(1536)
    expect(out.name).toBe('IMG_1.webp')
    expect(out.type).toBe('image/webp')
  })

  test('keeps a 1200 px photo that is already light', async () => {
    bitmapOf(1200, 800)
    const file = fakeFile('image/jpeg', 200 * 1024)
    expect(await resizeGalleryImage(file)).toBe(file)
    expect(canvases).toHaveLength(0)
  })

  test('re-encodes a heavy 1200 px photo without resizing it', async () => {
    bitmapOf(1200, 800)
    await resizeGalleryImage(fakeFile('image/jpeg', 3 * 1024 * 1024))
    expect(canvases[0].width).toBe(1200)
    expect(canvases[0].height).toBe(800)
  })

  test('keeps every GIF, even a large one', async () => {
    const file = fakeFile('image/gif', 5 * 1024 * 1024, 'a.gif')
    expect(await resizeGalleryImage(file)).toBe(file)
    expect(canvases).toHaveLength(0)
  })

  test('keeps an animated WebP but converts a still one', async () => {
    const header = (flags: number) => {
      const bytes = new Uint8Array(1_000_000)
      bytes.set([0x52, 0x49, 0x46, 0x46], 0)
      bytes.set([0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58], 8)
      bytes[20] = flags
      return new File([bytes], 'a.webp', { type: 'image/webp' })
    }
    const animated = header(0x12)
    expect(await resizeGalleryImage(animated)).toBe(animated)
    expect(canvases).toHaveLength(0)

    bitmapOf(4000, 3000)
    const still = header(0x10)
    const out = await resizeGalleryImage(still)
    expect(out).not.toBe(still)
    expect(canvases[0].width).toBe(2048)
  })

  test('returns the original file when decoding fails', async () => {
    decodeFails = true
    const file = fakeFile('image/jpeg', 6 * 1024 * 1024)
    expect(await resizeGalleryImage(file)).toBe(file)
  })
})

describe('resizeImage', () => {
  test('honours a custom maximum dimension and minBytes', async () => {
    bitmapOf(1000, 500)
    const file = fakeFile('image/png', 50_000)
    expect(
      await resizeImage(file, { maxDimension: 800, minBytes: 10 })
    ).not.toBe(file)
    expect(canvases[0].width).toBe(800)
  })
})
