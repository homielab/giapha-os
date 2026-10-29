import { existsSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import config from '@/app/config'
import {
  buildWebManifest,
  MANIFEST_BACKGROUND_COLOR,
  MANIFEST_ICONS,
  MANIFEST_PATH,
  MANIFEST_THEME_COLOR
} from '@/lib/manifest'
import { rootMetadata } from '@/lib/metadata'

describe('web app manifest', () => {
  test('names the app and starts at the dashboard', () => {
    const manifest = buildWebManifest()
    expect(manifest.name).toBe(config.siteName)
    expect(manifest.name?.trim()).toBeTruthy()
    expect(manifest.short_name?.trim()).toBeTruthy()
    expect(manifest.short_name?.length).toBeLessThanOrEqual(12)
    expect(manifest.start_url).toBe('/dashboard')
    expect(manifest.scope).toBe('/')
    expect(manifest.lang).toBe('vi')
    expect(manifest.dir).toBe('ltr')
    expect(manifest.display).toBe('standalone')
  })

  test('uses the colours of the design tokens', () => {
    const manifest = buildWebManifest()
    expect(manifest.theme_color).toBe(MANIFEST_THEME_COLOR)
    expect(manifest.background_color).toBe(MANIFEST_BACKGROUND_COLOR)
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/)
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('ships the icons that Android and iOS ask for', () => {
    const sizes = MANIFEST_ICONS?.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    for (const icon of MANIFEST_ICONS ?? []) {
      expect(icon.type).toBe('image/png')
      expect(existsSync(`public${icon.src}`)).toBe(true)
    }
    expect(existsSync('public/android-chrome-512x512.png')).toBe(true)
  })

  test('is served where the pages point to it', () => {
    // app/manifest.ts is a metadata route, mapped to this fixed URL.
    expect(MANIFEST_PATH).toBe('/manifest.webmanifest')
  })
})

describe('root metadata', () => {
  test('links the manifest on every page', () => {
    const metadata = rootMetadata({ description: 'Gia phả', locale: 'vi' })
    expect(metadata.manifest).toBe(MANIFEST_PATH)
    expect(metadata.icons).toEqual({ apple: '/apple-touch-icon.png' })
    expect(metadata.description).toBe('Gia phả')
  })
})
