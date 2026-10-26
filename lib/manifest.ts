import type { MetadataRoute } from 'next'

import config from '@/app/config'
import { messages } from '@/lib/i18n/messages'

// app/manifest.ts is a metadata route, served at this fixed URL.
export const MANIFEST_PATH = '/manifest.webmanifest'

// Design tokens (DESIGN.md): primary deep stone for the browser chrome, neutral
// limestone for the splash background.
export const MANIFEST_THEME_COLOR = '#1c1917'
export const MANIFEST_BACKGROUND_COLOR = '#fafaf9'
export const APPLE_TOUCH_ICON = '/apple-touch-icon.png'

export const MANIFEST_ICONS: MetadataRoute.Manifest['icons'] = [
  {
    src: '/android-chrome-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/android-chrome-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any'
  }
]

/**
 * Web app manifest: lets a phone install the app on its home screen with the
 * family's site name instead of a blank label. No service worker, so the app
 * still needs a connection.
 */
export function buildWebManifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: config.siteName,
    short_name: config.shortName,
    description: messages.vi.landingDescription,
    lang: 'vi',
    dir: 'ltr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: MANIFEST_BACKGROUND_COLOR,
    theme_color: MANIFEST_THEME_COLOR,
    icons: MANIFEST_ICONS
  }
}
