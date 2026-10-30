import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import MemberNameHeader from '@/context/memberDetail/MemberNameHeader'
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
      <MemberNameHeader person={person} fullName='p' isDeceased={false} />
    </I18nContext.Provider>
  )
}

describe('MemberNameHeader birth order', () => {
  test('shows the eldest badge for a blood member', () => {
    expect(render({})).toContain(dict.firstChild)
  })
  test('hides the birth order badge for an in-law', () => {
    const html = render({ is_in_law: true })
    expect(html).toContain(dict.daughterInLaw)
    expect(html).not.toContain(dict.firstChild)
  })
})
