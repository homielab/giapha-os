import { describe, expect, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import MergeWarnings from '@/components/MergeWarnings'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'

const noop = () => {}

function render(node: ReactNode, locale: 'vi' | 'en' = 'vi') {
  const dict = messages[locale]
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale,
        messages: dict,
        setLocale: noop,
        t: (key, values) => interpolate(dict[key], values)
      }}>
      {node}
    </I18nContext.Provider>
  )
}

describe('MergeWarnings', () => {
  test('lists each warning with an unticked acknowledge box', () => {
    const html = render(
      <MergeWarnings
        warnings={['sameGenderParents', 'loop']}
        acknowledged={false}
        onAcknowledgedChange={noop}
      />
    )
    expect(html).toContain('role="alert"')
    expect(html).toContain(messages.vi.mergeWarningsTitle)
    expect(html).toContain(messages.vi.mergeWarning_sameGenderParents)
    expect(html).toContain(messages.vi.mergeWarning_loop)
    expect(html).not.toContain(messages.vi.mergeWarning_tooManyParents)
    expect(html).toMatch(/<input type="checkbox"[^>]*\/>/)
    expect(html).not.toMatch(/<input type="checkbox"[^>]*checked/)
  })

  test('shows the box ticked once acknowledged', () => {
    const html = render(
      <MergeWarnings
        warnings={['tooManyParents']}
        acknowledged
        onAcknowledgedChange={noop}
      />,
      'en'
    )
    expect(html).toContain(messages.en.mergeWarning_tooManyParents)
    expect(html).toMatch(/<input type="checkbox"[^>]*checked/)
  })

  test('renders nothing without warnings', () => {
    expect(
      render(
        <MergeWarnings
          warnings={[]}
          acknowledged={false}
          onAcknowledgedChange={noop}
        />
      )
    ).toBe('')
  })
})
