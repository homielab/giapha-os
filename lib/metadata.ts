import type { Metadata } from 'next'

import config from '@/app/config'
import type { Locale } from '@/lib/i18n/messages'

const OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: config.siteName
}

/**
 * Title, description, canonical URL and Open Graph / Twitter tags of a public
 * page. `title` omitted = the site name; `path` omitted = no canonical URL
 * (the root layout's defaults).
 */
export function publicPageMetadata({
  title,
  description,
  path,
  locale
}: {
  title?: string
  description: string
  path?: string
  locale: Locale
}): Metadata {
  const fullTitle = title ? `${title} | ${config.siteName}` : config.siteName
  return {
    ...(title ? { title } : {}),
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: 'website',
      siteName: config.siteName,
      title: fullTitle,
      description,
      ...(path ? { url: path } : {}),
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      images: [OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [OG_IMAGE.url]
    }
  }
}
