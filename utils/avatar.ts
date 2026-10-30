const SUPABASE_STORAGE_MARKER = '/storage/v1/object/'

/**
 * Normalize legacy public/signed URLs and new path-only values to an avatar
 * object path. External URLs are rejected so database input cannot turn into
 * arbitrary browser-side tracking requests.
 */
export function getAvatarStoragePath(value: string | null | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    const markerIndex = url.pathname.indexOf(SUPABASE_STORAGE_MARKER)
    if (markerIndex < 0) return null

    const storagePath = url.pathname.slice(
      markerIndex + SUPABASE_STORAGE_MARKER.length
    )
    const [accessType, bucket, ...segments] = storagePath.split('/')
    if (
      !['public', 'sign', 'authenticated'].includes(accessType) ||
      bucket !== 'avatars'
    ) {
      return null
    }

    const path = segments.join('/')
    return path && !path.includes('..') ? path : null
  } catch {
    const path = value.replace(/^\/+/, '')
    return path && !path.includes('..') ? path : null
  }
}

export function getAvatarUrl(value: string | null | undefined) {
  const path = getAvatarStoragePath(value)
  return path ? `/api/avatar?path=${encodeURIComponent(path)}` : null
}

// Signed avatar URLs live a day; the server reuses each one for its first
// half (`signAvatarUrls`), so the browser can cache the image meanwhile.
export const AVATAR_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
// Signed URLs are dropped this long before they expire, so an image that
// mounts late (view switch, modal) never gets an already-dead link.
const SIGNED_URL_EXPIRY_MARGIN_MS = 5 * 60 * 1000

/** Signed avatar URLs keyed by storage path, made once per page on the server. */
export interface SignedAvatarUrls {
  urls: Record<string, string>
  /** Epoch milliseconds after which the URLs must not be used. */
  expiresAt: number
}

export const NO_SIGNED_AVATAR_URLS: SignedAvatarUrls = {
  urls: {},
  expiresAt: 0
}

/**
 * Picks the pre-signed URL for an avatar while it is still valid, otherwise
 * the authenticated `/api/avatar` route (photos changed after the page loaded,
 * pages without signed URLs, or a tab left open past the expiry).
 */
export function resolveAvatarUrl(
  value: string | null | undefined,
  signed: SignedAvatarUrls,
  now = Date.now()
) {
  const path = getAvatarStoragePath(value)
  if (!path) return null
  const url = signed.urls[path]
  if (url && now < signed.expiresAt - SIGNED_URL_EXPIRY_MARGIN_MS) return url
  return getAvatarUrl(path)
}
