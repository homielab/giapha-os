const DEFAULT_SITE_URL = 'http://localhost:3000'

/**
 * Reads a configured public URL and returns its http(s) origin, or null when
 * it is empty or not a web address. A bare host (`giapha.example.com`) gets
 * `https://`; a path, query or trailing slash is dropped.
 */
export function parseSiteOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  let candidate = trimmed
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    // `javascript:…`, `mailto:…` and the like are not hosts; `host:port` is.
    if (/^[a-z][a-z\d+.-]*:(?!\d)/i.test(trimmed)) return null
    candidate = `https://${trimmed}`
  }
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname) return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * Public URL of this deployment, used for canonical/Open Graph links, the
 * sitemap and robots.txt. A valid APP_URL wins; on Vercel the production
 * domain is used automatically; otherwise localhost.
 */
export function getSiteUrl(
  env: Record<string, string | undefined> = process.env
): string {
  return (
    parseSiteOrigin(env.APP_URL) ??
    parseSiteOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    DEFAULT_SITE_URL
  )
}
