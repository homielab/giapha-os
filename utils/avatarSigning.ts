import type { SupabaseClient } from '@supabase/supabase-js'

import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  getAvatarStoragePath,
  NO_SIGNED_AVATAR_URLS,
  type SignedAvatarUrls
} from '@/utils/avatar'

// Paths per createSignedUrls request; a normal family tree fits in one.
const SIGN_BATCH_SIZE = 1000

// A cached URL is handed out again only while at least this much of its
// lifetime is left, so every page gets URLs that stay valid for hours.
export const SIGNED_URL_REUSE_MIN_REMAINING_MS = 12 * 60 * 60 * 1000

// Upper bound of the cache (about 300 bytes per entry).
const MAX_CACHED_URLS = 20_000

/** A stored avatar and the row's `updated_at`, which changes with the photo. */
export interface AvatarRef {
  avatar_url?: string | null
  updated_at?: string | null
}

interface CachedUrl {
  url: string
  expiresAt: number
}

// Signed URLs by storage path + `updated_at`. Supabase puts the signing time
// in every token, so signing again gives a new URL the browser has never
// cached; reusing the URL lets it keep the image across page loads. The
// cache is shared by all users of this server process: callers check that
// the user is active first (the same rule as storage RLS), and an active
// user may view every avatar anyway.
const cache = new Map<string, CachedUrl>()

const cacheKey = (path: string, version: string | null | undefined) =>
  `${path}\n${version ?? ''}`

function remember(key: string, entry: CachedUrl, now: number) {
  cache.delete(key)
  if (cache.size >= MAX_CACHED_URLS) {
    for (const [k, v] of cache) {
      if (v.expiresAt - now < SIGNED_URL_REUSE_MIN_REMAINING_MS) cache.delete(k)
    }
    // Still full: drop the oldest entries (Map keeps insertion order).
    for (const k of cache.keys()) {
      if (cache.size < MAX_CACHED_URLS) break
      cache.delete(k)
    }
  }
  cache.set(key, entry)
}

/** Empties the signed URL cache (tests). */
export function clearSignedAvatarCache() {
  cache.clear()
}

/**
 * Signs the avatars of a page with the caller's Supabase client, so storage
 * RLS ("Active users can view avatars") decides access exactly like the
 * `/api/avatar` route. On the server, call it only after checking that the
 * user's profile is active, because a cached URL is returned without asking
 * storage; from the browser, RLS refuses inactive users the same way. URLs
 * are reused until the avatar's `updated_at` changes or less than
 * `SIGNED_URL_REUSE_MIN_REMAINING_MS` is left, so the browser can cache the
 * images. A failed batch is left out and those avatars fall back to
 * `/api/avatar`.
 */
export async function signAvatarUrls(
  supabase: SupabaseClient,
  avatars: Iterable<AvatarRef>,
  now = Date.now()
): Promise<SignedAvatarUrls> {
  // First version seen per path; invalid and external values are dropped.
  const versions = new Map<string, string | null | undefined>()
  for (const avatar of avatars) {
    const path = getAvatarStoragePath(avatar.avatar_url)
    if (path && !versions.has(path)) versions.set(path, avatar.updated_at)
  }
  if (versions.size === 0) return NO_SIGNED_AVATAR_URLS

  const urls: Record<string, string> = {}
  let expiresAt = Infinity
  const take = (path: string, entry: CachedUrl) => {
    urls[path] = entry.url
    expiresAt = Math.min(expiresAt, entry.expiresAt)
  }

  const missing: string[] = []
  for (const [path, version] of versions) {
    const cached = cache.get(cacheKey(path, version))
    if (cached && cached.expiresAt - now >= SIGNED_URL_REUSE_MIN_REMAINING_MS) {
      take(path, cached)
    } else {
      missing.push(path)
    }
  }

  const batches: string[][] = []
  for (let i = 0; i < missing.length; i += SIGN_BATCH_SIZE) {
    batches.push(missing.slice(i, i + SIGN_BATCH_SIZE))
  }

  const results = await Promise.all(
    batches.map((batch) =>
      supabase.storage
        .from('avatars')
        .createSignedUrls(batch, AVATAR_SIGNED_URL_TTL_SECONDS)
    )
  )

  const signedExpiresAt = now + AVATAR_SIGNED_URL_TTL_SECONDS * 1000
  for (const { data, error } of results) {
    if (error) {
      console.error('Cannot sign avatar URLs:', error.message)
      continue
    }
    for (const entry of data ?? []) {
      if (!entry.path || !entry.signedUrl || entry.error) continue
      if (!versions.has(entry.path)) continue
      const signed = { url: entry.signedUrl, expiresAt: signedExpiresAt }
      remember(cacheKey(entry.path, versions.get(entry.path)), signed, now)
      take(entry.path, signed)
    }
  }

  return {
    urls,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : signedExpiresAt
  }
}
