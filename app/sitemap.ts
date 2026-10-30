import type { MetadataRoute } from 'next'

import config from '@/app/config'

// Only the public pages; everything else needs a signed-in member.
const PUBLIC_PATHS = ['/', '/about', '/login']

// Read SITE_NAME / APP_URL at request time: a Docker image is built without them.
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${config.siteUrl}${path === '/' ? '' : path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.5
  }))
}
