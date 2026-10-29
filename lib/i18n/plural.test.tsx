import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { I18nProvider } from './I18nProvider'
import { translateWith } from './interpolate'
import { messages, translate, type TranslationKey } from './messages'
import { useI18n } from './useI18n'

const pluralKeys = [
  'moreEvents',
  'eventsToday',
  'eventsNext7Days',
  'eventCount',
  'loadMoreEvents',
  'peopleCount',
  'lineageBookMembers',
  'weeksAgo',
  'monthsAgo',
  'weeksFromNow',
  'monthsFromNow',
  'yearsOld',
  'yearsSince'
] as const

function ClientText({ k, count }: { k: TranslationKey; count: number }) {
  const { t } = useI18n()
  return <>{t(k, { count })}</>
}

function clientT(locale: 'vi' | 'en', key: TranslationKey, count: number) {
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale} messages={messages[locale]}>
      <ClientText k={key} count={count} />
    </I18nProvider>
  )
}

describe('plural forms', () => {
  test('english uses the singular for a count of 1', () => {
    expect(translate('en', 'eventsToday', { count: 1 })).toBe('1 event today')
    expect(translate('en', 'peopleCount', { count: 1 })).toBe('1 person')
    expect(translate('en', 'yearsOld', { count: 1 })).toBe('1 year old')
    expect(translate('en', 'weeksFromNow', { count: 1 })).toBe('in 1 week')
  })

  test('english keeps the plural for other counts', () => {
    expect(translate('en', 'eventsToday', { count: 2 })).toBe('2 events today')
    expect(translate('en', 'peopleCount', { count: 0 })).toBe('0 people')
    expect(translate('en', 'yearsOld', { count: 21 })).toBe('21 years old')
  })

  test('a count given as text does not pick the singular', () => {
    expect(translate('en', 'peopleCount', { count: '1' })).toBe('1 people')
  })

  test('vietnamese text does not change', () => {
    for (const key of pluralKeys) {
      expect(messages.vi[`${key}_one`]).toBe(messages.vi[key])
      for (const count of [1, 2]) {
        expect(translate('vi', key, { count })).toBe(
          messages.vi[key].replace('{count}', String(count))
        )
      }
    }
  })

  test('every singular form keeps the {count} placeholder', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const key of pluralKeys) {
        expect(messages[locale][`${key}_one`]).toContain('{count}')
      }
    }
  })

  test('falls back to the base key without a _one form', () => {
    const dictionary = { apples: '{count} apples' }
    expect(translateWith(dictionary, 'en', 'apples', { count: 1 })).toBe(
      '1 apples'
    )
    expect(translateWith(dictionary, 'en', 'apples')).toBe('{count} apples')
  })

  test('the client t matches the server translate', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const key of pluralKeys) {
        for (const count of [1, 2]) {
          expect(clientT(locale, key, count)).toBe(
            translate(locale, key, { count })
          )
        }
      }
    }
  })
})
