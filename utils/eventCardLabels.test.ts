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

  test('repeating custom events say so; lunar ones add the lunar date', () => {
    const solar = formatEventDateLabel(
      event({ type: 'custom_event', recurrence: 'yearly_solar' }),
      t
    )
    expect(solar).toEndWith('recurringYearlySuffix')
    expect(solar).not.toContain('lunarDateSuffix')
    const lunar = formatEventDateLabel(
      event({
        type: 'custom_event',
        recurrence: 'yearly_lunar',
        eventDateLabel: '10/03 ÂL'
      }),
      t
    )
    expect(lunar).toContain('lunarDateSuffix:{"date":"10/03"}')
    expect(lunar).toEndWith('recurringYearlySuffix')
    expect(
      formatEventDateLabel(
        event({ type: 'custom_event', recurrence: 'none' }),
        t
      )
    ).not.toContain('recurringYearlySuffix')
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
  // Fixed dates: the result depends only on the event, not on today.
  const year = 2026
  const thisYear = { nextOccurrence: new Date(2026, 5, 15) }

  test('birthday gives the age, death anniversary the years since', () => {
    expect(
      getEventYearsInfo(event({ ...thisYear, originYear: year - 30 }), true, t)
    ).toBe('yearsOld:{"count":30}')
    expect(
      getEventYearsInfo(
        event({
          ...thisYear,
          type: 'death_anniversary',
          originYear: year - 5
        }),
        false,
        t
      )
    ).toBe('yearsSince:{"count":5}')
  })

  test('is null without a year, for this year or the future', () => {
    expect(getEventYearsInfo(event(), true, t)).toBeNull()
    expect(
      getEventYearsInfo(event({ ...thisYear, originYear: year }), true, t)
    ).toBeNull()
    expect(
      getEventYearsInfo(event({ ...thisYear, originYear: year + 1 }), true, t)
    ).toBeNull()
  })

  test('is null for custom events', () => {
    expect(
      getEventYearsInfo(
        event({ ...thisYear, type: 'custom_event', originYear: year - 3 }),
        false,
        t
      )
    ).toBeNull()
  })

  test('a birthday in early January counts the next year', () => {
    // Born 1990; seen on 20/12/2026, the birthday is 05/01/2027 -> 37.
    expect(
      getEventYearsInfo(
        event({ nextOccurrence: new Date(2027, 0, 5), originYear: 1990 }),
        true,
        t
      )
    ).toBe('yearsOld:{"count":37}')
    // A birthday already passed this year keeps this year's age.
    expect(
      getEventYearsInfo(
        event({ nextOccurrence: new Date(2026, 11, 1), originYear: 1990 }),
        true,
        t
      )
    ).toBe('yearsOld:{"count":36}')
  })

  test('an anniversary counts lunar years, across the solar new year', () => {
    // 05/01/2027 is 27/11 lunar 2026 (Bính Ngọ): died lunar 2021 -> 5th.
    expect(
      getEventYearsInfo(
        event({
          type: 'death_anniversary',
          nextOccurrence: new Date(2027, 0, 5),
          originYear: 2021
        }),
        false,
        t
      )
    ).toBe('yearsSince:{"count":5}')
    // 20/02/2027 is 14/01 lunar 2027 (Tết 2027 = 06/02): died 2021 -> 6th.
    expect(
      getEventYearsInfo(
        event({
          type: 'death_anniversary',
          nextOccurrence: new Date(2027, 1, 20),
          originYear: 2021
        }),
        false,
        t
      )
    ).toBe('yearsSince:{"count":6}')
  })
})

describe('formatEventDateLabel: estimates', () => {
  test('marks an estimated date', () => {
    const label = formatEventDateLabel(
      event({
        type: 'death_anniversary',
        eventDateLabel: '09/02 ÂL',
        approximate: true
      }),
      t
    )
    expect(label.endsWith('approximateDateSuffix')).toBe(true)
    expect(
      formatEventDateLabel(event({ approximate: false }), t)
    ).not.toContain('approximateDateSuffix')
  })
})
