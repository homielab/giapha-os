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
})
