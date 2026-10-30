import { beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { AVATAR_SIGNED_URL_TTL_SECONDS, NO_SIGNED_AVATAR_URLS } from './avatar'
import {
  clearSignedAvatarCache,
  signAvatarUrls,
  SIGNED_URL_REUSE_MIN_REMAINING_MS
} from './avatarSigning'
import { fakeSupabase } from './testing/fakeSupabase'

const batchOf = (payload: unknown) => (payload as [string[]])[0]
const refs = (values: (string | null | undefined)[]) =>
  values.map((avatar_url) => ({ avatar_url }))

const signAll = (paths: string[]) =>
  paths.map((path) => ({
    path,
    signedUrl: `https://cdn.test/${path}?token=x`,
    error: null
  }))

describe('signAvatarUrls', () => {
  beforeEach(clearSignedAvatarCache)

  test('makes no request when nothing has an avatar', async () => {
    const { client, calls } = fakeSupabase(() => ({}))
    const result = await signAvatarUrls(client, refs([null, undefined, '']))
    expect(result).toBe(NO_SIGNED_AVATAR_URLS)
    expect(calls).toHaveLength(0)
  })

  test('ignores external URLs and signs each path once', async () => {
    const { client, calls } = fakeSupabase((call) => ({
      data: signAll(batchOf(call.payload))
    }))
    const now = 1_000_000
    const result = await signAvatarUrls(
      client,
      refs([
        'a/1.jpg',
        'a/1.jpg',
        'https://x.supabase.co/storage/v1/object/public/avatars/b/2.png',
        'https://evil.test/photo.jpg',
        null
      ]),
      now
    )
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('storage:avatars')
    expect(calls[0].payload).toEqual([
      ['a/1.jpg', 'b/2.png'],
      AVATAR_SIGNED_URL_TTL_SECONDS
    ])
    expect(Object.keys(result.urls)).toEqual(['a/1.jpg', 'b/2.png'])
    expect(result.expiresAt).toBe(now + AVATAR_SIGNED_URL_TTL_SECONDS * 1000)
  })

  test('signs in batches of 1000 paths and merges the results', async () => {
    const paths = Array.from({ length: 2300 }, (_, i) => `p/${i}.jpg`)
    const { client, calls } = fakeSupabase((call) => ({
      data: signAll(batchOf(call.payload))
    }))
    const result = await signAvatarUrls(client, refs(paths))
    expect(calls.map((c) => batchOf(c.payload).length)).toEqual([
      1000, 1000, 300
    ])
    expect(Object.keys(result.urls)).toHaveLength(2300)
  })

  test('leaves a failed batch out and keeps the others', async () => {
    const paths = Array.from({ length: 1500 }, (_, i) => `p/${i}.jpg`)
    const log = spyOn(console, 'error').mockImplementation(() => {})
    const { client } = fakeSupabase((call) => {
      const batch = batchOf(call.payload)
      return batch[0] === 'p/0.jpg'
        ? { error: { message: 'storage down' } }
        : { data: signAll(batch) }
    })
    const result = await signAvatarUrls(client, refs(paths))
    expect(Object.keys(result.urls)).toHaveLength(500)
    expect(result.urls['p/0.jpg']).toBeUndefined()
    expect(result.urls['p/1200.jpg']).toBeDefined()
    expect(log).toHaveBeenCalledTimes(1)
    log.mockRestore()
  })

  test('skips entries without a URL or with an error', async () => {
    const { client } = fakeSupabase(() => ({
      data: [
        { path: 'ok.jpg', signedUrl: 'https://cdn.test/ok', error: null },
        { path: 'missing.jpg', signedUrl: null, error: 'Object not found' },
        { path: 'bad.jpg', signedUrl: 'https://cdn.test/bad', error: 'denied' },
        { path: null, signedUrl: 'https://cdn.test/none', error: null }
      ]
    }))
    const result = await signAvatarUrls(
      client,
      refs(['ok.jpg', 'missing.jpg', 'bad.jpg'])
    )
    expect(result.urls).toEqual({ 'ok.jpg': 'https://cdn.test/ok' })
  })
})

describe('signAvatarUrls cache', () => {
  beforeEach(clearSignedAvatarCache)

  const HOUR = 60 * 60 * 1000
  // Every signing gets a new token, like Supabase (signing time in the JWT).
  const signer = () => {
    let token = 0
    return fakeSupabase((call) => ({
      data: batchOf(call.payload).map((path) => ({
        path,
        signedUrl: `https://cdn.test/${path}?token=${++token}`,
        error: null
      }))
    }))
  }
  const an = { avatar_url: 'an.jpg', updated_at: '2026-10-01T00:00:00Z' }
  const binh = { avatar_url: 'binh.jpg', updated_at: '2026-10-02T00:00:00Z' }

  test('gives the same URL to the next request without signing again', async () => {
    const { client, calls } = signer()
    const first = await signAvatarUrls(client, [an, binh], 0)
    const second = await signAvatarUrls(client, [binh, an], HOUR)
    expect(calls).toHaveLength(1)
    expect(second.urls).toEqual(first.urls)
    expect(second.expiresAt).toBe(first.expiresAt)
  })

  test('signs again when the avatar changes (new updated_at)', async () => {
    const { client, calls } = signer()
    const first = await signAvatarUrls(client, [an, binh], 0)
    const changed = { ...an, updated_at: '2026-10-30T00:00:00Z' }
    const second = await signAvatarUrls(client, [changed, binh], HOUR)
    expect(calls).toHaveLength(2)
    expect(batchOf(calls[1].payload)).toEqual(['an.jpg'])
    expect(second.urls['an.jpg']).not.toBe(first.urls['an.jpg'])
    expect(second.urls['binh.jpg']).toBe(first.urls['binh.jpg'])
  })

  test('signs again once less than the reuse window is left', async () => {
    const { client, calls } = signer()
    const ttl = AVATAR_SIGNED_URL_TTL_SECONDS * 1000
    const first = await signAvatarUrls(client, [an], 0)
    const lastReuse = ttl - SIGNED_URL_REUSE_MIN_REMAINING_MS
    expect((await signAvatarUrls(client, [an], lastReuse)).urls).toEqual(
      first.urls
    )
    const later = await signAvatarUrls(client, [an], lastReuse + 1)
    expect(calls).toHaveLength(2)
    expect(later.urls['an.jpg']).not.toBe(first.urls['an.jpg'])
    expect(later.expiresAt).toBe(lastReuse + 1 + ttl)
  })

  test('reports the earliest expiry of cached and new URLs', async () => {
    const { client, calls } = signer()
    await signAvatarUrls(client, [an], 0)
    const mixed = await signAvatarUrls(client, [an, binh], 2 * HOUR)
    expect(batchOf(calls[1].payload)).toEqual(['binh.jpg'])
    expect(Object.keys(mixed.urls)).toEqual(['an.jpg', 'binh.jpg'])
    expect(mixed.expiresAt).toBe(AVATAR_SIGNED_URL_TTL_SECONDS * 1000)
  })

  test('does not cache a failed signing', async () => {
    const log = spyOn(console, 'error').mockImplementation(() => {})
    const denied = fakeSupabase(() => ({ error: { message: 'denied' } }))
    expect((await signAvatarUrls(denied.client, [an], 0)).urls).toEqual({})
    log.mockRestore()

    const { client, calls } = signer()
    const retry = await signAvatarUrls(client, [an], 0)
    expect(calls).toHaveLength(1)
    expect(retry.urls['an.jpg']).toBe('https://cdn.test/an.jpg?token=1')
  })
})
