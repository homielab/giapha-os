import { describe, expect, test } from 'bun:test'

import { getGalleryStoragePath } from './storage-path'

describe('getGalleryStoragePath', () => {
  test('a bare path is returned as is', () => {
    expect(getGalleryStoragePath('1700-abc.jpg')).toBe('1700-abc.jpg')
  })

  test('leading slashes are dropped', () => {
    expect(getGalleryStoragePath('/1700-abc.jpg')).toBe('1700-abc.jpg')
  })

  test('a signed URL gives the path without bucket and token', () => {
    expect(
      getGalleryStoragePath(
        'https://x.supabase.co/storage/v1/object/sign/gallery/1700-abc.jpg?token=eyJ.abc'
      )
    ).toBe('1700-abc.jpg')
  })

  test('a public URL is decoded', () => {
    expect(
      getGalleryStoragePath(
        'https://x.supabase.co/storage/v1/object/public/gallery/a%20b.jpg'
      )
    ).toBe('a b.jpg')
  })

  test('nested folders are kept', () => {
    expect(
      getGalleryStoragePath(
        'https://x.supabase.co/storage/v1/object/sign/gallery/2026/10/a.png?token=t'
      )
    ).toBe('2026/10/a.png')
    expect(getGalleryStoragePath('2026/10/a.png')).toBe('2026/10/a.png')
  })

  test('an empty string stays empty', () => {
    expect(getGalleryStoragePath('')).toBe('')
  })

  test('a string that is not a URL is treated as a path', () => {
    expect(getGalleryStoragePath('not a url/x.jpg')).toBe('not a url/x.jpg')
  })
})
