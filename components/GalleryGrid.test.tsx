import { describe, expect, test } from 'bun:test'

import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  revealOnInteract,
  slideInOnInteract
} from '@/components/galleryCardReveal'
import GalleryGrid from '@/components/GalleryGrid'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { GalleryItem } from '@/types'

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
