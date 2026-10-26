import type { MetadataRoute } from 'next'

import config from '@/app/config'

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
