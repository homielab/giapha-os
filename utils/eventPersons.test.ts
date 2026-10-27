import { describe, expect, test } from 'bun:test'

import { computeEvents } from './eventHelpers'
import { EVENT_PERSON_FILTER, hasEventDate } from './eventPersons'

type PersonInput = Parameters<typeof computeEvents>[0][number]

function person(id: string, extra: Partial<PersonInput>): PersonInput {
  return {
    id,
    full_name: `Người ${id}`,
    birth_year: null,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    death_lunar_year: null,
    death_lunar_month: null,
    death_lunar_day: null,
    is_deceased: false,
    ...extra
  }
}

const sample: PersonInput[] = [
  person('none', {}),
  person('year-only', { birth_year: 1950 }),
  person('birth-month-only', { birth_month: 3 }),
  person('birthday', { birth_year: 1980, birth_month: 3, birth_day: 12 }),
  person('solar-death', {
    is_deceased: true,
    death_year: 2001,
    death_month: 5,
    death_day: 20
  }),
  person('lunar-only-death', {
    is_deceased: true,
    death_lunar_year: 1999,
    death_lunar_month: 2,
    death_lunar_day: 15
  }),
  person('lunar-day-only', { is_deceased: true, death_lunar_day: 15 }),
  person('deceased-no-date', { is_deceased: true, death_year: 1990 }),
  person('both', {
    is_deceased: true,
    birth_month: 1,
    birth_day: 1,
    death_lunar_month: 12,
    death_lunar_day: 30
  })
]

describe('event person filter', () => {
  test('computeEvents gives the same events before and after filtering', () => {
    const filtered = sample.filter(hasEventDate)
    expect(filtered.length).toBeLessThan(sample.length)
    for (const now of [
      new Date(2026, 0, 5),
      new Date(2026, 9, 27),
      new Date(2027, 11, 31)
    ]) {
      expect(computeEvents(filtered, [], now)).toEqual(
        computeEvents(sample, [], now)
      )
    }
  })

  test('keeps lunar-only death dates and drops people without any day and month', () => {
    const ids = sample.filter(hasEventDate).map((p) => p.id)
    expect(ids).toContain('lunar-only-death')
    expect(ids).not.toContain('none')
    expect(ids).not.toContain('year-only')
    expect(ids).not.toContain('lunar-day-only')
    expect(ids).not.toContain('deceased-no-date')
  })

  test('the PostgREST filter has one clause per date pair', () => {
    expect(EVENT_PERSON_FILTER).toBe(
      'and(birth_month.not.is.null,birth_day.not.is.null),and(death_lunar_month.not.is.null,death_lunar_day.not.is.null),and(death_month.not.is.null,death_day.not.is.null)'
    )
  })
})
