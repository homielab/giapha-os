import { beforeEach, describe, expect, test } from 'bun:test'

import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  getAvatarStoragePath,
  NO_SIGNED_AVATAR_URLS,
  resolveAvatarUrl
} from '@/utils/avatar'
import { clearSignedAvatarCache, signAvatarUrls } from '@/utils/avatarSigning'
import { fakeSupabase } from '@/utils/testing/fakeSupabase'

const LEGACY_PUBLIC =
  'https://abc.supabase.co/storage/v1/object/public/avatars/p1_an.jpg'
const LEGACY_SIGNED =
  'https://abc.supabase.co/storage/v1/object/sign/avatars/p2_binh.png?token=x'

describe('getAvatarStoragePath', () => {
  test('reads paths from old URLs and new path-only values', () => {
    expect(getAvatarStoragePath(LEGACY_PUBLIC)).toBe('p1_an.jpg')
    expect(getAvatarStoragePath(LEGACY_SIGNED)).toBe('p2_binh.png')
    expect(getAvatarStoragePath('p3_chi.webp')).toBe('p3_chi.webp')
  })

  test('rejects external URLs, other buckets and path traversal', () => {
    expect(getAvatarStoragePath('https://evil.example/a.png')).toBeNull()
    expect(
      getAvatarStoragePath(
        'https://abc.supabase.co/storage/v1/object/public/gallery/a.png'
      )
    ).toBeNull()
    expect(getAvatarStoragePath('../secret')).toBeNull()
    expect(getAvatarStoragePath(null)).toBeNull()
  })
})

describe('resolveAvatarUrl', () => {
  const signed = {
    urls: { 'p1_an.jpg': 'https://abc.supabase.co/signed/p1' },
    expiresAt: 10 * 60 * 1000
  }

  test('uses the signed URL for old and new values while it is fresh', () => {
    expect(resolveAvatarUrl(LEGACY_PUBLIC, signed, 0)).toBe(
      'https://abc.supabase.co/signed/p1'
    )
    expect(resolveAvatarUrl('p1_an.jpg', signed, 0)).toBe(
      'https://abc.supabase.co/signed/p1'
    )
  })

  test('falls back to /api/avatar when unsigned or about to expire', () => {
    expect(resolveAvatarUrl('p9 new.png', signed, 0)).toBe(
      '/api/avatar?path=p9%20new.png'
    )
    expect(resolveAvatarUrl('p1_an.jpg', signed, 6 * 60 * 1000)).toBe(
      '/api/avatar?path=p1_an.jpg'
    )
    expect(resolveAvatarUrl('p1_an.jpg', NO_SIGNED_AVATAR_URLS)).toBe(
      '/api/avatar?path=p1_an.jpg'
    )
  })

  test('returns null when there is no usable avatar', () => {
    expect(resolveAvatarUrl(null, signed)).toBeNull()
    expect(resolveAvatarUrl('https://evil.example/a.png', signed)).toBeNull()
  })
})

describe('signAvatarUrls', () => {
  beforeEach(clearSignedAvatarCache)
  const refs = (values: (string | null)[]) =>
    values.map((avatar_url) => ({ avatar_url }))

  test('signs all avatars of a page in one storage request', async () => {
    const { client, calls } = fakeSupabase((call) => {
      const [paths] = call.payload as [string[]]
      return {
        data: paths.map((path) => ({
          path,
          signedUrl: `https://signed/${path}`,
          error: null
        }))
      }
    })

    const result = await signAvatarUrls(
      client,
      refs([LEGACY_PUBLIC, 'p1_an.jpg', 'p3_chi.webp', null]),
      1000
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('storage:avatars')
    expect(calls[0].op).toBe('createSignedUrls')
    expect(calls[0].payload).toEqual([
      ['p1_an.jpg', 'p3_chi.webp'],
      AVATAR_SIGNED_URL_TTL_SECONDS
    ])
    expect(result).toEqual({
      urls: {
        'p1_an.jpg': 'https://signed/p1_an.jpg',
        'p3_chi.webp': 'https://signed/p3_chi.webp'
      },
      expiresAt: 1000 + AVATAR_SIGNED_URL_TTL_SECONDS * 1000
    })
  })

  test('makes no request without avatars', async () => {
    const { client, calls } = fakeSupabase(() => ({}))
    expect(await signAvatarUrls(client, refs([null, '']))).toBe(
      NO_SIGNED_AVATAR_URLS
    )
    expect(calls).toEqual([])
  })

  test('leaves out missing files and failed requests', async () => {
    const missing = fakeSupabase(() => ({
      data: [
        { path: 'a.png', signedUrl: 'https://signed/a', error: null },
        { path: 'gone.png', signedUrl: null, error: 'Object not found' }
      ]
    }))
    const partial = await signAvatarUrls(
      missing.client,
      refs(['a.png', 'gone.png'])
    )
    expect(partial.urls).toEqual({ 'a.png': 'https://signed/a' })

    const denied = fakeSupabase(() => ({ error: { message: 'denied' } }))
    const none = await signAvatarUrls(denied.client, refs(['b.png']))
    expect(none.urls).toEqual({})
  })
})
