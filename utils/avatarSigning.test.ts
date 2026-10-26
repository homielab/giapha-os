import { describe, expect, spyOn, test } from 'bun:test'

import { AVATAR_SIGNED_URL_TTL_SECONDS, NO_SIGNED_AVATAR_URLS } from './avatar'
import { signAvatarUrls } from './avatarSigning'
import { fakeSupabase } from './testing/fakeSupabase'

const batchOf = (payload: unknown) => (payload as [string[]])[0]

const signAll = (paths: string[]) =>
  paths.map((path) => ({
    path,
    signedUrl: `https://cdn.test/${path}?token=x`,
    error: null
  }))

describe('signAvatarUrls', () => {
  test('makes no request when nothing has an avatar', async () => {
    const { client, calls } = fakeSupabase(() => ({}))
    const result = await signAvatarUrls(client, [null, undefined, ''])
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
      [
        'a/1.jpg',
        'a/1.jpg',
        'https://x.supabase.co/storage/v1/object/public/avatars/b/2.png',
        'https://evil.test/photo.jpg',
        null
      ],
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
    const result = await signAvatarUrls(client, paths)
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
    const result = await signAvatarUrls(client, paths)
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
    const result = await signAvatarUrls(client, [
      'ok.jpg',
      'missing.jpg',
      'bad.jpg'
    ])
    expect(result.urls).toEqual({ 'ok.jpg': 'https://cdn.test/ok' })
  })
})
