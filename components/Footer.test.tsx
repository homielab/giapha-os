import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import Footer from '@/components/Footer'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'

const noop = () => {}

function render(locale: 'vi' | 'en') {
  const dict = messages[locale]
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale,
        messages: dict,
        setLocale: noop,
        t: (key, values) => interpolate(dict[key], values)
      }}>
      <Footer />
    </I18nContext.Provider>
  )
}

describe('Footer credit', () => {
  test('is translated between the two links', () => {
    expect(render('vi')).toContain('</a>bởi<a')
    expect(render('en')).toContain('</a>by<a')
  })
})
