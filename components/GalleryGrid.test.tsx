import { afterEach, describe, expect, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  revealOnInteract,
  slideInOnInteract
} from '@/components/galleryCardReveal'
import GalleryGrid from '@/components/GalleryGrid'
import GalleryLightbox from '@/components/GalleryLightbox'
import GalleryViewSwitcher from '@/components/GalleryViewSwitcher'
import { useGalleryView } from '@/hooks/useGalleryView'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { GalleryItem } from '@/types'
import { GALLERY_VIEW_KEY, readGalleryView } from '@/utils/galleryView'

const noop = () => {}

function render(node: ReactNode) {
  const dict = messages.vi
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale: 'vi',
        messages: dict,
        setLocale: noop,
        t: (key, values) => interpolate(dict[key], values)
      }}>
      {node}
    </I18nContext.Provider>
  )
}

const item: GalleryItem = {
  id: 'a1',
  title: 'Giỗ tổ 2024',
  description: null,
  event_date: '2024-03-15',
  image_url: 'https://example.com/a.jpg',
  created_at: '2024-03-16T00:00:00Z',
  created_by: null
}

describe('gallery card reveal classes', () => {
  test('reveal on hover, keyboard focus and screens without hover', () => {
    for (const classes of [revealOnInteract, slideInOnInteract]) {
      expect(classes).toContain('group-hover:')
      expect(classes).toContain('group-focus-within:')
      expect(classes).toContain('[@media(hover:none)]:')
    }
  })
})

describe('GalleryGrid grid view', () => {
  const html = render(<GalleryGrid items={[item]} viewMode='grid' />)

  test('the caption overlay reveals on focus and without hover', () => {
    expect(html).toContain(revealOnInteract)
    expect(html).toContain(slideInOnInteract)
    expect(html).toContain('tabindex="0"')
  })

  test('the title and date stay in the DOM', () => {
    expect(html).toContain('Giỗ tổ 2024')
    expect(html).toContain('15/03/2024')
  })
})

describe('GalleryGrid timeline view', () => {
  test('the expand icon reveals on focus and without hover', () => {
    const html = render(<GalleryGrid items={[item]} viewMode='timeline' />)
    expect(html).toContain(revealOnInteract)
  })
})

describe('GalleryLightbox navigation', () => {
  const lightbox = (position: number, total: number) =>
    render(
      <GalleryLightbox
        item={item}
        isDeleting={false}
        onClose={noop}
        onDelete={noop}
        position={position}
        total={total}
        onPrev={noop}
        onNext={noop}
      />
    )
  const button = (html: string, label: string) =>
    html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? ''

  test('first image: previous disabled, next enabled, counter shown', () => {
    const html = lightbox(1, 3)
    expect(button(html, 'Ảnh trước')).toContain('disabled=""')
    expect(button(html, 'Ảnh sau')).not.toContain('disabled=""')
    expect(html).toContain('Ảnh 1/3')
  })

  test('last image: next disabled', () => {
    const html = lightbox(3, 3)
    expect(button(html, 'Ảnh trước')).not.toContain('disabled=""')
    expect(button(html, 'Ảnh sau')).toContain('disabled=""')
  })

  test('a single image has no navigation', () => {
    const html = lightbox(1, 1)
    expect(html).not.toContain('Ảnh trước')
    expect(html).not.toContain('Ảnh 1/1')
  })
})

describe('GalleryViewSwitcher', () => {
  test('both buttons are named and report which view is on', () => {
    const html = render(<GalleryViewSwitcher value='grid' onChange={noop} />)
    expect(html).toContain(
      `aria-label="${messages.vi.gridView}" aria-pressed="true"`
    )
    expect(html).toContain(
      `aria-label="${messages.vi.timelineView}" aria-pressed="false"`
    )
  })
})

describe('saved gallery view before and after hydration', () => {
  const original = globalThis.localStorage
  afterEach(() => {
    globalThis.localStorage = original
  })

  test('the server renders no view, so neither one flashes', () => {
    let seen: string | null | undefined
    function Probe() {
      seen = useGalleryView()
      return null
    }
    render(<Probe />)
    expect(seen).toBeNull()
    expect(
      render(<GalleryViewSwitcher value={null} onChange={noop} />)
    ).not.toContain('aria-pressed="true"')
  })

  test('on the client a saved grid renders only grid cards', () => {
    globalThis.localStorage = {
      getItem: (key: string) => (key === GALLERY_VIEW_KEY ? 'grid' : null)
    } as Storage
    const html = render(
      <GalleryGrid items={[item]} viewMode={readGalleryView()} />
    )
    expect(html).toContain('columns-1')
    expect(html).not.toContain('space-y-12')
  })
})
