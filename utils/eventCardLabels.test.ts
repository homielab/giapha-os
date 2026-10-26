import { describe, expect, test } from 'bun:test'

import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'

import {
  daysUntilLabel,
  formatEventDateLabel,
  getEventYearsInfo
} from './eventCardLabels'
import type { FamilyEvent } from './eventHelpers'

// Fake translator: shows the key and its values, so tests pin which message
// is chosen without depending on the wording.
const t = (key: TranslationKey, values?: TranslationValues) =>
  values ? `${key}:${JSON.stringify(values)}` : key

function event(extra: Partial<FamilyEvent> = {}): FamilyEvent {
  return {
    personId: 'p1',
    personName: 'An',
    type: 'birthday',
    nextOccurrence: new Date(2026, 2, 5), // Thursday 05/03/2026
    daysUntil: 0,
    eventDateLabel: '05/03',
    isDeceased: false,
    ...extra
  }
}

describe('daysUntilLabel', () => {
  test('names yesterday, today and tomorrow', () => {
    expect(daysUntilLabel(-1, t)).toBe('yesterday')
    expect(daysUntilLabel(0, t)).toBe('today')
    expect(daysUntilLabel(1, t)).toBe('tomorrow')
  })

  test('counts days up to 30, then weeks up to 60, then months', () => {
    expect(daysUntilLabel(2, t)).toBe('daysFromNow:{"count":2}')
    expect(daysUntilLabel(30, t)).toBe('daysFromNow:{"count":30}')
    expect(daysUntilLabel(31, t)).toBe('weeksFromNow:{"count":5}')
    expect(daysUntilLabel(60, t)).toBe('weeksFromNow:{"count":9}')
    expect(daysUntilLabel(61, t)).toBe('monthsFromNow:{"count":3}')
    expect(daysUntilLabel(365, t)).toBe('monthsFromNow:{"count":13}')
  })

  test('mirrors the ranges for past dates', () => {
    expect(daysUntilLabel(-2, t)).toBe('daysAgo:{"count":2}')
    expect(daysUntilLabel(-30, t)).toBe('daysAgo:{"count":30}')
    expect(daysUntilLabel(-31, t)).toBe('weeksAgo:{"count":5}')
    expect(daysUntilLabel(-61, t)).toBe('monthsAgo:{"count":3}')
  })
})

describe('formatEventDateLabel', () => {
  test('birthday: weekday and zero-padded day/month, no year', () => {
    expect(formatEventDateLabel(event(), t)).toBe(
      'calendarDate:{"weekday":"weekdayThursday","day":"05","month":"03","year":2026}'
    )
  })

  test('custom event includes the year', () => {
    expect(
      formatEventDateLabel(event({ type: 'custom_event' }), t)
    ).toStartWith('calendarDateWithYear:')
  })

  test('death anniversary appends the lunar date without its suffix', () => {
    const label = formatEventDateLabel(
      event({ type: 'death_anniversary', eventDateLabel: '12/02 ÂL' }),
      t
    )
    expect(label).toStartWith('calendarDate:')
    expect(label).toEndWith('lunarDateSuffix:{"date":"12/02"}')
  })

  test('picks the weekday of the next occurrence', () => {
    const sunday = event({ nextOccurrence: new Date(2026, 2, 8) })
    expect(formatEventDateLabel(sunday, t)).toContain('weekdaySunday')
  })
})

describe('getEventYearsInfo', () => {
  const year = new Date().getFullYear()

  test('birthday gives the age, death anniversary the years since', () => {
    expect(getEventYearsInfo(event({ originYear: year - 30 }), true, t)).toBe(
      'yearsOld:{"count":30}'
    )
    expect(
      getEventYearsInfo(
        event({ type: 'death_anniversary', originYear: year - 5 }),
        false,
        t
      )
    ).toBe('yearsSince:{"count":5}')
  })

  test('is null without a year, for this year or the future', () => {
    expect(getEventYearsInfo(event(), true, t)).toBeNull()
    expect(getEventYearsInfo(event({ originYear: year }), true, t)).toBeNull()
    expect(
      getEventYearsInfo(event({ originYear: year + 1 }), true, t)
    ).toBeNull()
  })

  test('is null for custom events', () => {
    expect(
      getEventYearsInfo(
        event({ type: 'custom_event', originYear: year - 3 }),
        false,
        t
      )
    ).toBeNull()
  })
})
