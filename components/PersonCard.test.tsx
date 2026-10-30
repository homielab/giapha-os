import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { PersonBadges } from '@/components/PersonCard'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { Person } from '@/types'

const dict = messages.vi

function render(extra: Partial<Person>) {
  const person = {
    id: 'p',
    full_name: 'p',
    gender: 'female',
    is_in_law: false,
    birth_order: 1,
    generation: null,
    ...extra
  } as Person
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale: 'vi',
        messages: dict,
        setLocale: () => {},
        t: (key, values) => interpolate(dict[key], values)
      }}>
      <PersonBadges person={person} isDeceased={false} />
    </I18nContext.Provider>
  )
}

describe('PersonBadges birth order', () => {
  test('shows the eldest badge for a blood member', () => {
    expect(render({})).toContain(dict.firstChild)
  })
  test('hides the birth order badge for an in-law', () => {
    const html = render({ is_in_law: true })
    expect(html).toContain(dict.inLawFemale)
    expect(html).not.toContain(dict.firstChild)
  })
  test('renders nothing when there is no badge to show', () => {
    expect(render({ is_in_law: false, birth_order: null })).toBe('')
  })
})
