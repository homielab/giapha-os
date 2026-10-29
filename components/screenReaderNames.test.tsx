import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { FemaleIcon, MaleIcon } from '@/components/GenderIcons'
import PersonCard from '@/components/PersonCard'
import { PersonAvatarBadge } from '@/components/PersonSelectorParts'
import RelationshipList from '@/components/relationship/RelationshipList'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { Person } from '@/types'

const noop = () => {}

const person = {
  id: 'p1',
  full_name: 'Nguyễn Văn An',
  gender: 'male',
  avatar_url: 'p1/a.jpg',
  birth_year: 1950,
  is_deceased: false
} as unknown as Person

function render(node: React.ReactNode) {
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

const count = (html: string, text: string) => html.split(text).length - 1

describe('screen readers hear each person once, with gender', () => {
  test('member card: photo is decorative, gender icon is named', () => {
    const html = render(<PersonCard person={person} />)
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(html).not.toContain('alt="Nguyễn Văn An"')
    expect(html).toContain('role="img" aria-label="Nam"')
  })

  test('relationship list: photo is decorative', () => {
    const html = render(
      <RelationshipList
        relationships={[
          {
            id: 'r1',
            type: 'biological_child',
            direction: 'child',
            targetPerson: person,
            note: null
          } as never
        ]}
        isAdmin={false}
        canEdit={false}
        onPersonClick={noop}
        onDelete={noop}
      />
    )
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(count(html, 'Nguyễn Văn An')).toBe(1)
  })

  test('person selector badge names the gender', () => {
    const html = render(
      <PersonAvatarBadge
        person={{ ...person, gender: 'female' }}
        bgClassName=''
        fallback={null}
      />
    )
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(html).toContain('role="img" aria-label="Nữ"')
  })

  test('gender icon without a label is hidden', () => {
    expect(renderToStaticMarkup(<MaleIcon />)).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(<FemaleIcon label='Nữ' />)).toContain(
      '<title>Nữ</title>'
    )
  })
})
