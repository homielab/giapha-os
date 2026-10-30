export const DEFAULT_NEXT_PATH = '/dashboard'

// Any host works: it only lets URL resolve "..", "%2e" and the like so the
// check below sees the path the browser would really open.
const BASE = 'http://giapha.invalid'

/**
 * The page to open after signing in, taken from `?next=` on /login.
 * Only same-site dashboard pages are accepted (path, query and hash kept);
 * anything else — another site (`//host`, `https://…`, `/\host`), /login
 * itself, an empty value — falls back to /dashboard, so a shared link can
 * never send someone off the site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    // Browsers read "\" as "/" and drop tabs/newlines, so "/\evil.com"
    // or "/\t/evil.com" would become "//evil.com".
    /[\\\u0000-\u001f\u007f]/.test(next)
  ) {
    return DEFAULT_NEXT_PATH
  }

  let url: URL
  try {
    url = new URL(next, BASE)
  } catch {
    return DEFAULT_NEXT_PATH
  }

  if (url.origin !== BASE) return DEFAULT_NEXT_PATH
  if (url.pathname !== '/dashboard' && !url.pathname.startsWith('/dashboard/'))
    return DEFAULT_NEXT_PATH

  return url.pathname + url.search + url.hash
}

/**
 * The `next` value for the page being opened, or null when it is the
 * dashboard home (the default anyway, so /login stays a clean URL).
 */
export function nextParamFor(pathname: string, search: string): string | null {
  const path = pathname + search
  return path === DEFAULT_NEXT_PATH ? null : path
}

/**
 * Where Supabase sends the browser back after Google/Facebook sign-in:
 * /auth/callback, carrying `next` so the callback can open the page a shared
 * link pointed to. The dashboard home adds nothing, so that URL is unchanged.
 */
export function oauthRedirectTo(
  origin: string,
  next: string | null | undefined
): string {
  const path = safeNextPath(next)
  const callback = `${origin}/auth/callback`
  return path === DEFAULT_NEXT_PATH
    ? callback
    : `${callback}?next=${encodeURIComponent(path)}`
}
