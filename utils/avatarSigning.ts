import type { SupabaseClient } from '@supabase/supabase-js'

import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  collectAvatarPaths,
  NO_SIGNED_AVATAR_URLS,
  type SignedAvatarUrls
} from '@/utils/avatar'

// Paths per createSignedUrls request; a normal family tree fits in one.
const SIGN_BATCH_SIZE = 1000

/**
 * Signs the avatars of a page with the caller's Supabase client, so storage
 * RLS ("Active users can view avatars") decides access exactly like the
 * `/api/avatar` route. Call it on the server only, after checking that the
 * user's profile is active. A failed batch is left out and those avatars fall
 * back to `/api/avatar`.
 */
export async function signAvatarUrls(
  supabase: SupabaseClient,
  values: Iterable<string | null | undefined>,
  now = Date.now()
): Promise<SignedAvatarUrls> {
  const paths = collectAvatarPaths(values)
  if (paths.length === 0) return NO_SIGNED_AVATAR_URLS

  const batches: string[][] = []
  for (let i = 0; i < paths.length; i += SIGN_BATCH_SIZE) {
    batches.push(paths.slice(i, i + SIGN_BATCH_SIZE))
  }

  const results = await Promise.all(
    batches.map((batch) =>
      supabase.storage
        .from('avatars')
        .createSignedUrls(batch, AVATAR_SIGNED_URL_TTL_SECONDS)
    )
  )

  const urls: Record<string, string> = {}
  for (const { data, error } of results) {
    if (error) {
      console.error('Cannot sign avatar URLs:', error.message)
      continue
    }
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl && !entry.error) {
        urls[entry.path] = entry.signedUrl
      }
    }
  }

  return { urls, expiresAt: now + AVATAR_SIGNED_URL_TTL_SECONDS * 1000 }
}
