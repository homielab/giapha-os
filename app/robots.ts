import type { MetadataRoute } from 'next'

import config from '@/app/config'

// Read SITE_NAME / APP_URL at request time: a Docker image is built without them.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api', '/setup', '/auth', '/missing-db-config']
    },
    sitemap: `${config.siteUrl}/sitemap.xml`
  }
}
