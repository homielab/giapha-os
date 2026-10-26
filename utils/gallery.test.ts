import { describe, expect, test } from 'bun:test'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { GalleryItem } from '@/types'

import {
  GALLERY_PAGE_SIZE,
  getGalleryPageCount,
  loadGalleryPage,
  parseGalleryPage
} from './gallery'

function makeItems(count: number): GalleryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    title: `Ảnh ${i}`,
    description: null,
    image_url: `${i}.jpg`,
    event_date: null,
    created_at: '2026-01-01T00:00:00Z',
    created_by: null
  }))
}

// Minimal stand-in for the Supabase client that behaves like PostgREST for
// ranged selects (416 / PGRST103 past the last row) and logs every request.
function fakeSupabase(rows: GalleryItem[]) {
  const log = {
    selects: [] as { range?: [number, number]; head: boolean }[],
    signBatches: [] as string[][]
  }

  const from = () => ({
    select(_columns: string, options?: { head?: boolean }) {
      const request: { range?: [number, number]; head: boolean } = {
        head: Boolean(options?.head)
      }
      log.selects.push(request)
      const query = {
        order: () => query,
        range(start: number, end: number) {
          request.range = [start, end]
          return query
        },
        then(resolve: (value: unknown) => void) {
          if (request.head) {
            return resolve({ data: null, count: rows.length, error: null })
          }
          const [start, end] = request.range ?? [0, rows.length - 1]
          if (start > 0 && start >= rows.length) {
            return resolve({
              data: null,
              count: null,
              error: { code: 'PGRST103', message: 'Requested range' }
            })
          }
          resolve({
            data: rows.slice(start, end + 1),
            count: rows.length,
            error: null
          })
        }
      }
      return query
    }
  })

  const storage = {
    from: () => ({
      async createSignedUrls(paths: string[]) {
        log.signBatches.push(paths)
        return {
          data: paths.map((path) => ({
            path,
            signedUrl: `https://cdn.test/${path}?token=x`,
            error: null
          })),
          error: null
        }
      }
    })
  }

  return { client: { from, storage } as unknown as SupabaseClient, log }
}

describe('parseGalleryPage', () => {
  test('reads positive integers and defaults to page 1', () => {
    expect(parseGalleryPage('3')).toBe(3)
    expect(parseGalleryPage(['2', '5'])).toBe(2)
    expect(parseGalleryPage(undefined)).toBe(1)
    expect(parseGalleryPage('0')).toBe(1)
    expect(parseGalleryPage('-2')).toBe(1)
    expect(parseGalleryPage('abc')).toBe(1)
    expect(parseGalleryPage('1.5')).toBe(1)
  })

  test('page count is at least 1', () => {
    expect(getGalleryPageCount(0)).toBe(1)
    expect(getGalleryPageCount(GALLERY_PAGE_SIZE)).toBe(1)
    expect(getGalleryPageCount(GALLERY_PAGE_SIZE + 1)).toBe(2)
  })
})

describe('loadGalleryPage', () => {
  test('30 images: one ranged select and one signing request per page', async () => {
    const { client, log } = fakeSupabase(makeItems(30))

    const first = await loadGalleryPage(client, 1)
    expect(first.items).toHaveLength(GALLERY_PAGE_SIZE)
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 30 })
    expect(log.selects).toEqual([
      { head: false, range: [0, GALLERY_PAGE_SIZE - 1] }
    ])
    expect(log.signBatches).toHaveLength(1)
    expect(log.signBatches[0]).toHaveLength(GALLERY_PAGE_SIZE)
    expect(first.items[0].image_url).toBe('https://cdn.test/0.jpg?token=x')
    expect(first.items[0].storage_path).toBe('0.jpg')

    const second = await loadGalleryPage(client, 2)
    expect(second.items.map((item) => item.id)).toEqual(
      makeItems(30)
        .slice(GALLERY_PAGE_SIZE)
        .map((item) => item.id)
    )
    expect(second).toMatchObject({ page: 2, pageCount: 2 })
    expect(log.signBatches).toHaveLength(2)
  })

  test('no images: empty page and no signing request', async () => {
    const { client, log } = fakeSupabase([])
    const result = await loadGalleryPage(client, 1)
    expect(result).toEqual({ items: [], page: 1, pageCount: 1, total: 0 })
    expect(log.signBatches).toHaveLength(0)
  })

  test('a page past the end falls back to the last page', async () => {
    const { client, log } = fakeSupabase(makeItems(30))
    const result = await loadGalleryPage(client, 9)
    expect(result).toMatchObject({ page: 2, pageCount: 2, total: 30 })
    expect(result.items).toHaveLength(30 - GALLERY_PAGE_SIZE)
    expect(log.signBatches).toHaveLength(1)
  })

  test('a page past the end of an empty gallery is page 1', async () => {
    const { client } = fakeSupabase([])
    const result = await loadGalleryPage(client, 4)
    expect(result).toEqual({ items: [], page: 1, pageCount: 1, total: 0 })
  })

  test('keeps the storage path of full storage URLs', async () => {
    const rows = makeItems(1)
    rows[0].image_url =
      'https://x.supabase.co/storage/v1/object/public/gallery/a%20b.png'
    const { client, log } = fakeSupabase(rows)
    const result = await loadGalleryPage(client, 1)
    expect(log.signBatches[0]).toEqual(['a b.png'])
    expect(result.items[0].storage_path).toBe('a b.png')
  })
})
