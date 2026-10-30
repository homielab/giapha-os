import { beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  detectImageType,
  MAX_IMAGE_BYTES,
  MAX_SOURCE_IMAGE_BYTES,
  readImageType,
  validateGallerySource,
  validateImageFile
} from './imageUpload'

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]

function fileOf(bytes: number[], name: string, type: string, size?: number) {
  const body = new Uint8Array(size ?? bytes.length)
  body.set(bytes)
  return new File([body], name, { type })
}

describe('detectImageType', () => {
  test('recognises jpeg, png, gif and webp signatures', () => {
    expect(detectImageType(new Uint8Array(JPEG))).toBe('image/jpeg')
    expect(detectImageType(new Uint8Array(PNG))).toBe('image/png')
    expect(detectImageType(new Uint8Array(GIF))).toBe('image/gif')
    expect(detectImageType(new Uint8Array(WEBP))).toBe('image/webp')
  })

  test('rejects text, svg and empty input', () => {
    expect(detectImageType(new TextEncoder().encode('hello world'))).toBeNull()
    expect(detectImageType(new TextEncoder().encode('<svg xmlns='))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
  })
})

describe('readImageType', () => {
  test('reads the type from the content, not the name or MIME type', async () => {
    expect(await readImageType(fileOf(WEBP, 'a.png', 'image/png'))).toBe(
      'image/webp'
    )
    expect(
      await readImageType(
        new File(['just some notes'], 'notes.jpg', { type: 'image/jpeg' })
      )
    ).toBeNull()
  })
})

describe('validateImageFile', () => {
  test('accepts a real image and takes the extension from its content', async () => {
    // A PNG named .jpg is stored as .png.
    const result = await validateImageFile(
      fileOf(PNG, 'photo.jpg', 'image/jpeg')
    )
    expect(result).toEqual({ ok: true, type: 'image/png', extension: 'png' })
  })

  test('rejects a text file renamed to .jpg', async () => {
    const file = new File(['just some notes'], 'notes.jpg', {
      type: 'image/jpeg'
    })
    expect(await validateImageFile(file)).toEqual({
      ok: false,
      reason: 'unsupported-type'
    })
  })

  test('rejects types outside jpeg/png/gif/webp', async () => {
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })
    expect((await validateImageFile(svg)).ok).toBe(false)
    const heic = fileOf(JPEG, 'a.heic', 'image/heic')
    expect((await validateImageFile(heic)).ok).toBe(false)
  })

  test('rejects files over 10 MB', async () => {
    const big = fileOf(JPEG, 'big.jpg', 'image/jpeg', 12 * 1024 * 1024)
    expect(await validateImageFile(big)).toEqual({
      ok: false,
      reason: 'too-large'
    })
    const limit = fileOf(JPEG, 'ok.jpg', 'image/jpeg', MAX_IMAGE_BYTES)
    expect((await validateImageFile(limit)).ok).toBe(true)
  })
})

describe('validateGallerySource', () => {
  const MB = 1024 * 1024

  test('accepts a 15 MB phone photo before it is resized', async () => {
    const photo = fileOf(JPEG, 'IMG_0001.jpg', 'image/jpeg', 15 * MB)
    expect(await validateGallerySource(photo)).toEqual({
      ok: true,
      type: 'image/jpeg',
      extension: 'jpg'
    })
    const limit = fileOf(PNG, 'a.png', 'image/png', MAX_SOURCE_IMAGE_BYTES)
    expect((await validateGallerySource(limit)).ok).toBe(true)
  })

  test('rejects photos over 20 MB', async () => {
    const big = fileOf(JPEG, 'big.jpg', 'image/jpeg', 21 * MB)
    expect(await validateGallerySource(big)).toEqual({
      ok: false,
      reason: 'too-large'
    })
  })

  test('GIFs are stored unchanged, so they keep the 10 MB limit', async () => {
    const gif = fileOf(GIF, 'a.gif', 'image/gif', 12 * MB)
    expect(await validateGallerySource(gif)).toEqual({
      ok: false,
      reason: 'too-large'
    })
    const small = fileOf(GIF, 'b.gif', 'image/gif', MAX_IMAGE_BYTES)
    expect((await validateGallerySource(small)).ok).toBe(true)
  })

  test('still checks the content', async () => {
    const renamed = new File(['plain text'], 'x.jpg', { type: 'image/jpeg' })
    expect(await validateGallerySource(renamed)).toEqual({
      ok: false,
      reason: 'unsupported-type'
    })
  })
})

describe('uploadGalleryImage', () => {
  const upload = mock(async () => ({ data: {}, error: null }))

  mock.module('@/utils/supabase/client', () => ({
    createClient: () => ({ storage: { from: () => ({ upload }) } })
  }))

  beforeEach(() => upload.mockClear())

  test('invalid files never reach storage', async () => {
    const { InvalidImageError, uploadGalleryImage } =
      await import('./supabase/storage')
    const renamed = new File(['plain text'], 'x.jpg', { type: 'image/jpeg' })
    const big = fileOf(JPEG, 'big.jpg', 'image/jpeg', 12 * 1024 * 1024)
    const errorLog = console.error
    console.error = () => {}
    try {
      for (const file of [renamed, big]) {
        const { path, error } = await uploadGalleryImage(file)
        expect(path).toBeNull()
        expect(error).toBeInstanceOf(InvalidImageError)
      }
    } finally {
      console.error = errorLog
    }
    expect(upload).not.toHaveBeenCalled()
  })

  test('valid files are stored with the detected extension and type', async () => {
    const { uploadGalleryImage } = await import('./supabase/storage')
    const { path, error } = await uploadGalleryImage(
      fileOf(WEBP, 'holiday.JPG', 'image/webp')
    )
    expect(error).toBeNull()
    expect(path).toMatch(/^\d+-[a-z0-9]+\.webp$/)
    expect(upload).toHaveBeenCalledTimes(1)
    const options = (upload.mock.calls[0] as unknown[])[2]
    expect(options).toMatchObject({ contentType: 'image/webp' })
  })
})
