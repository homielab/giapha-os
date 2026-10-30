import { describe, expect, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import UploadModal from '@/components/modal/UploadModal'
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
  description: 'Cả họ về quê',
  event_date: '2024-03-15',
  image_url: 'https://example.com/a.jpg',
  created_at: '2024-03-16T00:00:00Z',
  created_by: null
}

describe('UploadModal', () => {
  test('editing fills the saved fields and shows the current photo', () => {
    const html = render(
      <UploadModal isOpen onClose={noop} onSuccess={noop} initialData={item} />
    )
    expect(html).toContain('value="Giỗ tổ 2024"')
    expect(html).toContain('value="2024-03-15"')
    expect(html).toContain('Cả họ về quê')
    expect(html).toContain('src="https://example.com/a.jpg"')
  })

  test('adding starts blank with no photo', () => {
    const html = render(<UploadModal isOpen onClose={noop} onSuccess={noop} />)
    expect(html).not.toContain('Giỗ tổ 2024')
    expect(html).not.toContain('example.com')
  })
})
