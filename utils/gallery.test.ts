import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, test } from 'bun:test'

import type { GalleryItem } from '@/types'
import {
  fakeSupabase as fakeClient,
  type FakeCall,
  type FakeResult
} from '@/utils/testing/fakeSupabase'

import {
  deleteGalleryItem,
  GALLERY_PAGE_SIZE,
  GalleryItemNotDeletedError,
  GallerySigningError,
  getGalleryPageCount,
  loadGalleryPage,
  parseGalleryPage,
  saveGalleryItem,
  shouldResignGallery
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

describe('deleteGalleryItem', () => {
  const item = { id: 'g1', image_url: '', storage_path: 'a/b.jpg' }

  test('deletes the row first, then the file', async () => {
    const { client, calls } = fakeClient((call) =>
      call.op === 'delete' ? { data: [{ id: 'g1' }] } : {}
    )
    await expect(deleteGalleryItem(client, item)).resolves.toEqual({
      fileRemoved: true
    })
    expect(calls.map((c) => c.op)).toEqual(['delete', 'select', 'remove'])
    expect(calls[1].filters).toContainEqual(['like', 'image_url', '%a/b.jpg%'])
    expect(calls[2].payload).toEqual([['a/b.jpg']])
  })

  test('keeps the file while another row points at it', async () => {
    const { client, calls } = fakeClient((call) =>
      call.op === 'delete' ? { data: [{ id: 'g1' }] } : { data: [{ id: 'g2' }] }
    )
    await expect(deleteGalleryItem(client, item)).resolves.toEqual({
      fileRemoved: false
    })
    expect(calls.map((c) => c.op)).toEqual(['delete', 'select'])
  })

  test('a failed lookup keeps the file', async () => {
    const { client, calls } = fakeClient((call) =>
      call.op === 'delete'
        ? { data: [{ id: 'g1' }] }
        : { error: { message: 'db down' } }
    )
    const log = console.error
    console.error = () => {}
    try {
      await expect(deleteGalleryItem(client, item)).resolves.toEqual({
        fileRemoved: false
      })
    } finally {
      console.error = log
    }
    expect(calls.map((c) => c.op)).toEqual(['delete', 'select'])
  })

  test('zero rows (RLS) throws and keeps the file', async () => {
    const { client, calls } = fakeClient(() => ({ data: [] }))
    await expect(deleteGalleryItem(client, item)).rejects.toBeInstanceOf(
      GalleryItemNotDeletedError
    )
    expect(calls.map((c) => c.op)).toEqual(['delete'])
  })

  test('a database error throws and keeps the file', async () => {
    const { client, calls } = fakeClient(() => ({ error: { message: 'boom' } }))
    await expect(deleteGalleryItem(client, item)).rejects.toMatchObject({
      message: 'boom'
    })
    expect(calls.map((c) => c.op)).toEqual(['delete'])
  })

  test('a file error after the row is gone is only reported', async () => {
    const { client } = fakeClient((call) =>
      call.op === 'delete'
        ? { data: [{ id: 'g1' }] }
        : { error: { message: 'storage down' } }
    )
    const log = console.error
    console.error = () => {}
    try {
      await expect(deleteGalleryItem(client, item)).resolves.toEqual({
        fileRemoved: false
      })
    } finally {
      console.error = log
    }
  })
})

describe('saveGalleryItem', () => {
  const fields = { title: 'Giỗ tổ', description: null, event_date: null }
  const initialData = {
    id: 'g1',
    image_url: 'old.jpg',
    storage_path: 'old.jpg'
  }

  function run(
    respond: (call: FakeCall) => FakeResult,
    options: Parameters<typeof saveGalleryItem>[1]
  ) {
    const { client, calls } = fakeClient(respond)
    const done = saveGalleryItem(client, options)
    const removed = () =>
      calls
        .filter((c) => c.table === 'storage:gallery' && c.op === 'remove')
        .map((c) => (c.payload as [string[]])[0])
    return { done, removed, calls }
  }

  const ok = (call: FakeCall): FakeResult =>
    call.op === 'update' ? { data: [{ id: 'g1' }] } : { data: [] }

  test('removes the old file after the update succeeds', async () => {
    const { done, removed } = run(ok, {
      initialData,
      fields,
      imagePath: 'new.jpg',
      uploadedPath: 'new.jpg'
    })
    await done
    expect(removed()).toEqual([['old.jpg']])
  })

  test('keeps the old file while another row points at it', async () => {
    const { done, removed } = run(
      (call) =>
        call.op === 'update'
          ? { data: [{ id: 'g1' }] }
          : { data: [{ id: 'g2' }] },
      { initialData, fields, imagePath: 'new.jpg', uploadedPath: 'new.jpg' }
    )
    await done
    expect(removed()).toEqual([])
  })

  test('removes nothing when the path stays the same', async () => {
    const { done, removed } = run(ok, {
      initialData,
      fields,
      imagePath: 'old.jpg'
    })
    await done
    expect(removed()).toEqual([])
  })

  test('a failed removal of the old file does not fail the save', async () => {
    const { done } = run(
      (call) =>
        call.op === 'remove' ? { error: { message: 'boom' } } : ok(call),
      { initialData, fields, imagePath: 'new.jpg', uploadedPath: 'new.jpg' }
    )
    await expect(done).resolves.toBeUndefined()
  })

  test('removes the new file when the update fails', async () => {
    const { done, removed } = run(
      (call) => (call.op === 'update' ? { error: { message: 'db down' } } : {}),
      { initialData, fields, imagePath: 'new.jpg', uploadedPath: 'new.jpg' }
    )
    await expect(done).rejects.toMatchObject({ message: 'db down' })
    expect(removed()).toEqual([['new.jpg']])
  })

  test('removes the new file when the update touches no row', async () => {
    const { done, removed } = run(() => ({ data: [] }), {
      initialData,
      fields,
      imagePath: 'new.jpg',
      uploadedPath: 'new.jpg'
    })
    await expect(done).rejects.toThrow('Gallery item not updated')
    expect(removed()).toEqual([['new.jpg']])
  })

  test('removes the new file when the insert fails', async () => {
    const { done, removed } = run(
      (call) => (call.op === 'insert' ? { error: { message: 'nope' } } : {}),
      { fields, imagePath: 'new.jpg', uploadedPath: 'new.jpg' }
    )
    await expect(done).rejects.toMatchObject({ message: 'nope' })
    expect(removed()).toEqual([['new.jpg']])
  })

  test('a failed update without a new upload removes nothing', async () => {
    const { done, removed } = run(
      (call) => (call.op === 'update' ? { error: { message: 'x' } } : {}),
      { initialData, fields, imagePath: 'old.jpg' }
    )
    await expect(done).rejects.toBeDefined()
    expect(removed()).toEqual([])
  })

  test('a successful insert removes nothing', async () => {
    const { done, removed } = run(() => ({}), {
      fields,
      imagePath: 'new.jpg',
      uploadedPath: 'new.jpg',
      createdBy: 'u1'
    })
    await done
    expect(removed()).toEqual([])
  })
})

describe('loadGalleryPage signing errors', () => {
  function withSigner(
    rows: GalleryItem[],
    sign: (paths: string[]) => Promise<unknown>
  ) {
    const { client } = fakeSupabase(rows)
    const base = client as unknown as {
      from: unknown
      storage: unknown
    }
    return {
      from: base.from,
      storage: { from: () => ({ createSignedUrls: sign }) }
    } as unknown as SupabaseClient
  }

  test('an entry that fails to sign is marked, the others are normal', async () => {
    const client = withSigner(makeItems(3), async (paths) => ({
      data: paths.map((path) =>
        path === '1.jpg'
          ? { path, signedUrl: null, error: 'Object not found' }
          : { path, signedUrl: `https://cdn.test/${path}`, error: null }
      ),
      error: null
    }))
    const { items } = await loadGalleryPage(client, 1)
    expect(items[1].image_url).toBe('')
    expect(items[1].image_error).toBe(true)
    expect(items[0].image_url).toBe('https://cdn.test/0.jpg')
    expect(items[0].image_error).toBe(false)
    expect(items[2].image_error).toBe(false)
  })

  test('a failed signing request throws and names the bucket', async () => {
    const client = withSigner(makeItems(2), async () => ({
      data: null,
      error: { message: 'Bucket not found' }
    }))
    const promise = loadGalleryPage(client, 1)
    await expect(promise).rejects.toBeInstanceOf(GallerySigningError)
    await expect(promise).rejects.toThrow('"gallery"')
  })
})

describe('shouldResignGallery', () => {
  const signedAt = 1_000_000
  const minutes = (n: number) => signedAt + n * 60 * 1000

  test('re-signs once the URLs are 55 minutes old', () => {
    expect(
      shouldResignGallery({
        signedAt,
        now: minutes(54),
        alreadyResigned: false
      })
    ).toBe(false)
    expect(
      shouldResignGallery({
        signedAt,
        now: minutes(55),
        alreadyResigned: false
      })
    ).toBe(true)
  })

  test('re-signs when an image fails after its URL could have expired', () => {
    expect(
      shouldResignGallery({
        signedAt,
        now: minutes(2),
        alreadyResigned: false,
        imageFailed: true
      })
    ).toBe(true)
  })

  test('ignores a fresh URL that fails, so a broken image does not loop', () => {
    expect(
      shouldResignGallery({
        signedAt,
        now: signedAt + 5000,
        alreadyResigned: false,
        imageFailed: true
      })
    ).toBe(false)
  })

  test('never re-signs twice for the same signing', () => {
    expect(
      shouldResignGallery({
        signedAt,
        now: minutes(90),
        alreadyResigned: true,
        imageFailed: true
      })
    ).toBe(false)
  })
})
