import { describe, expect, test } from 'bun:test'

import type { GalleryItem } from '@/types'

import {
  attachGalleryTags,
  galleryHref,
  GalleryTagsNotSavedError,
  parseGalleryMember,
  sameIds,
  saveGalleryTags
} from './galleryTags'
import { fakeSupabase, type FakeCall } from './testing/fakeSupabase'

const ITEM = '44444444-4444-4444-8444-444444444444'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const photo = (id: string) => ({ id, title: id }) as GalleryItem

describe('gallery URLs', () => {
  test('reads a member id only when it is a UUID', () => {
    expect(parseGalleryMember(A)).toBe(A)
    expect(parseGalleryMember([A, B])).toBe(A)
    expect(parseGalleryMember('x')).toBeNull()
    expect(parseGalleryMember(undefined)).toBeNull()
  })

  test('builds the link with the filter, page and photo', () => {
    expect(galleryHref({})).toBe('/dashboard/gallery')
    expect(galleryHref({ page: 1 })).toBe('/dashboard/gallery')
    expect(galleryHref({ member: A, page: 3 })).toBe(
      `/dashboard/gallery?member=${A}&page=3`
    )
    expect(galleryHref({ member: A, photo: ITEM })).toBe(
      `/dashboard/gallery?member=${A}&photo=${ITEM}`
    )
  })

  test('compares id lists as sets', () => {
    expect(sameIds([A, B], [B, A])).toBe(true)
    expect(sameIds([A], [A, B])).toBe(false)
    expect(sameIds([], [])).toBe(true)
  })
})

describe('attachGalleryTags', () => {
  test('reads all tags of the page in one query', async () => {
    // The first page is short, so the loader checks the next one alone.
    const { client, calls } = fakeSupabase((call) => ({
      data:
        call.range?.[0] === 0
          ? [
              { gallery_item_id: 'g1', person_id: A },
              { gallery_item_id: 'g1', person_id: B },
              { gallery_item_id: 'g2', person_id: C }
            ]
          : []
    }))
    const items = await attachGalleryTags(client, [
      photo('g1'),
      photo('g2'),
      photo('g3')
    ])
    expect(items.map((i) => i.person_ids)).toEqual([[A, B], [C], []])
    expect(calls.every((c) => c.table === 'gallery_item_persons')).toBe(true)
    expect(calls[0].table).toBe('gallery_item_persons')
    expect(calls[0].filters).toContainEqual([
      'in',
      'gallery_item_id',
      ['g1', 'g2', 'g3']
    ])
  })

  test('makes no query for an empty page', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: [] }))
    expect(await attachGalleryTags(client, [])).toEqual([])
    expect(calls).toHaveLength(0)
  })

  test('a failed read leaves the photos untagged instead of failing', async () => {
    const original = console.error
    console.error = () => {}
    try {
      const { client } = fakeSupabase(() => ({
        error: { message: 'no table', code: 'PGRST205' }
      }))
      const items = await attachGalleryTags(client, [photo('g1')])
      expect(items[0].person_ids).toEqual([])
    } finally {
      console.error = original
    }
  })
})

describe('saveGalleryTags', () => {
  function run(
    current: string[],
    wanted: string[],
    respondOther?: (call: FakeCall) => object
  ) {
    const { client, calls } = fakeSupabase((call) => {
      if (call.op === 'select')
        return { data: current.map((person_id) => ({ person_id })) }
      return respondOther?.(call) ?? { data: [{ person_id: 'x' }] }
    })
    return { done: saveGalleryTags(client, ITEM, wanted), calls }
  }

  test('inserts the new tags and deletes the removed ones', async () => {
    const { done, calls } = run([A, B], [B, C])
    await done
    const insert = calls.find((c) => c.op === 'insert')
    expect(insert?.payload).toEqual([{ gallery_item_id: ITEM, person_id: C }])
    const del = calls.find((c) => c.op === 'delete')
    expect(del?.filters).toContainEqual(['in', 'person_id', [A]])
    expect(del?.filters).toContainEqual(['eq', 'gallery_item_id', ITEM])
  })

  test('writes nothing when the tags did not change', async () => {
    const { done, calls } = run([A, B], [B, A, A])
    await done
    expect(calls.map((c) => c.op)).toEqual(['select'])
  })

  test('untagging everyone only deletes', async () => {
    const { done, calls } = run([A, B], [])
    await done
    expect(calls.map((c) => c.op)).toEqual(['select', 'delete'])
  })

  test('a delete that removed no row (RLS) is an error', async () => {
    const { done } = run([A], [], (call) =>
      call.op === 'delete' ? { data: [] } : {}
    )
    await expect(done).rejects.toBeInstanceOf(GalleryTagsNotSavedError)
  })

  test('a failed insert is an error', async () => {
    const { done } = run([], [A], (call) =>
      call.op === 'insert' ? { error: { message: 'fk' } } : {}
    )
    await expect(done).rejects.toBeInstanceOf(GalleryTagsNotSavedError)
  })
})
