import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import KinshipResult from '@/components/kinship/KinshipResult'
import type { PersonNode } from '@/components/kinship/kinshipTypes'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import { computeKinship } from '@/utils/kinshipHelpers'

const noop = () => {}

function person(id: string, gender: PersonNode['gender']): PersonNode {
  return {
    id,
    full_name: id,
    gender,
    birth_year: null,
    birth_order: null,
    generation: null,
    is_in_law: false
  }
}

describe('KinshipResult', () => {
  test('the fathers of a married couple are shown as Ông thông gia', () => {
    const persons = [
      person('Ông An', 'male'),
      person('Bình', 'male'),
      person('Chi', 'female'),
      person('Ông Dũng', 'male')
    ]
    const rels = [
      { type: 'biological_child', person_a: 'Ông An', person_b: 'Bình' },
      { type: 'biological_child', person_a: 'Ông Dũng', person_b: 'Chi' },
      { type: 'marriage', person_a: 'Bình', person_b: 'Chi' }
    ]
    const result = computeKinship(persons[0], persons[3], persons, rels)
    const dict = messages.vi
    const html = renderToStaticMarkup(
      <I18nContext.Provider
        value={{
          locale: 'vi',
          messages: dict,
          setLocale: noop,
          t: (key, values) => interpolate(dict[key], values)
        }}>
        <KinshipResult
          personA={persons[0]}
          personB={persons[3]}
          result={result}
        />
      </I18nContext.Provider>
    )
    expect(html).toContain('Ông thông gia')
    expect(html).toContain('ông sui/bà sui')
    expect(html).toContain('Bình là con của Ông An.')
    expect(html).not.toContain(dict.kinshipUnknownTerm)
  })

  test('two wives of one husband show the description, not Chưa xác định', () => {
    const persons = [
      person('Ông Hải', 'male'),
      person('Bà Lan', 'female'),
      person('Bà Mai', 'female')
    ]
    const rels = [
      { type: 'marriage', person_a: 'Ông Hải', person_b: 'Bà Lan' },
      { type: 'marriage', person_a: 'Ông Hải', person_b: 'Bà Mai' }
    ]
    const result = computeKinship(persons[1], persons[2], persons, rels)
    const dict = messages.vi
    const html = renderToStaticMarkup(
      <I18nContext.Provider
        value={{
          locale: 'vi',
          messages: dict,
          setLocale: noop,
          t: (key, values) => interpolate(dict[key], values)
        }}>
        <KinshipResult
          personA={persons[1]}
          personB={persons[2]}
          result={result}
        />
      </I18nContext.Provider>
    )
    expect(html).toContain('Cùng chồng: hai người vợ của Ông Hải')
    expect(html).toContain(dict.kinshipNoTerm)
    expect(html).not.toContain(dict.kinshipUnknownTerm)
  })

  test('a spouse of gender Khác is Vợ/Chồng, with the reason', () => {
    const persons = [person('Lan', 'female'), person('Kha', 'other')]
    const rels = [{ type: 'marriage', person_a: 'Lan', person_b: 'Kha' }]
    const result = computeKinship(persons[0], persons[1], persons, rels)
    const dict = messages.vi
    const html = renderToStaticMarkup(
      <I18nContext.Provider
        value={{
          locale: 'vi',
          messages: dict,
          setLocale: noop,
          t: (key, values) => interpolate(dict[key], values)
        }}>
        <KinshipResult
          personA={persons[0]}
          personB={persons[1]}
          result={result}
        />
      </I18nContext.Provider>
    )
    expect(html).toContain('Vợ/Chồng')
    expect(html).toContain(dict.kinshipNeutralGenderHint)
    expect(html).not.toContain('>Chồng<')
  })
  test('the grandfather’s unlinked wife is Bà nội, with a link to fix it', () => {
    const persons = [
      person('Ông An', 'male'),
      person('Bà Ba', 'female'),
      person('Bình', 'male'),
      person('Chi', 'female')
    ]
    const rels = [
      { type: 'biological_child', person_a: 'Ông An', person_b: 'Bình' },
      { type: 'marriage', person_a: 'Ông An', person_b: 'Bà Ba' },
      { type: 'biological_child', person_a: 'Bình', person_b: 'Chi' }
    ]
    const result = computeKinship(persons[3], persons[1], persons, rels)
    const dict = messages.vi
    const html = renderToStaticMarkup(
      <I18nContext.Provider
        value={{
          locale: 'vi',
          messages: dict,
          setLocale: noop,
          t: (key, values) => interpolate(dict[key], values)
        }}>
        <KinshipResult
          personA={persons[3]}
          personB={persons[1]}
          result={result}
        />
      </I18nContext.Provider>
    )
    expect(html).toContain('Bà nội')
    expect(html).toContain(
      'Bà Ba là vợ của Ông An nhưng chưa được ghi là mẹ của Bình'
    )
    expect(html).toContain(dict.kinshipSpouseOfAncestorHint)
    expect(html).toContain('href="/dashboard/members/Bình"')
    expect(html).toContain(dict.kinshipDisclaimer)
  })
})
