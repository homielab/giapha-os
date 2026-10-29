import { describe, expect, test } from 'bun:test'

import { parseGalleryView } from '@/utils/galleryView'

describe('parseGalleryView', () => {
  test('missing or unknown values fall back to timeline', () => {
    expect(parseGalleryView(null)).toBe('timeline')
    expect(parseGalleryView('')).toBe('timeline')
    expect(parseGalleryView('GRID')).toBe('timeline')
  })
  test('valid values are kept', () => {
    expect(parseGalleryView('grid')).toBe('grid')
    expect(parseGalleryView('timeline')).toBe('timeline')
  })
})
