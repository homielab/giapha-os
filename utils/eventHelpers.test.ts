import { describe, expect, test } from 'bun:test'

import { computeEvents } from './eventHelpers'

type PersonInput = Parameters<typeof computeEvents>[0][number]

function deceased(extra: Partial<PersonInput>): PersonInput {
  return {
    id: 'p1',
    full_name: 'Cụ Tổ',
    birth_year: null,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    death_lunar_year: null,
    death_lunar_month: null,
    death_lunar_day: null,
    is_deceased: true,
    ...extra
  }
}

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

function deathEvents(person: PersonInput, now: Date) {
  return computeEvents([person], [], now).filter(
    (e) => e.type === 'death_anniversary'
  )
}

describe('computeEvents: death anniversaries (giỗ)', () => {
  test('uses the Vietnamese lunar calendar', () => {
    // Giỗ 1/1 âm lịch = Tết: 2007-02-17 in Vietnam (2007-02-18 in China).
    const event = deathEvents(
      deceased({ death_lunar_month: 1, death_lunar_day: 1 }),
      day(2007, 1, 1)
    ).find((e) => e.daysUntil >= 0)!
    expect(event.nextOccurrence).toEqual(day(2007, 2, 17))
    expect(event.daysUntil).toBe(47)
    expect(event.eventDateLabel).toBe('01/01 ÂL')
  })

  test('day 30 in a 29-day month is kept on the last day of the month', () => {
    const person = deceased({
      death_lunar_year: 2023,
      death_lunar_month: 12,
      death_lunar_day: 30,
      death_year: 2024,
      death_month: 2,
      death_day: 9
    })
    const [next] = deathEvents(person, day(2025, 1, 1))
    expect(next.nextOccurrence).toEqual(day(2025, 1, 28))
    expect(next.daysUntil).toBe(27)
  })

  test('lists the passed anniversary of this lunar year as well', () => {
    // 5/1 âm lịch: 2025-02-02 has passed, the next one is 2026-02-21.
    const person = deceased({ death_lunar_month: 1, death_lunar_day: 5 })
    const events = deathEvents(person, day(2025, 3, 1))
    expect(events.map((e) => e.nextOccurrence)).toEqual([
      day(2025, 2, 2),
      day(2026, 2, 21)
    ])
    expect(events[0].daysUntil).toBe(-27)
  })

  test('a death in a leap month is observed in the regular month next year', () => {
    // Died 2025-07-25 = 1/6 nhuận 2025; lunar 2026 has no leap month.
    const person = deceased({
      death_year: 2025,
      death_month: 7,
      death_day: 25,
      death_lunar_year: 2025,
      death_lunar_month: 6,
      death_lunar_day: 1
    })
    const events = deathEvents(person, day(2026, 3, 1))
    expect(events.map((e) => e.nextOccurrence)).toEqual([day(2026, 7, 14)])
  })

  test('the leap flag comes from the solar death date', () => {
    // Without a stored lunar date the solar date is converted (leap month).
    const person = deceased({ death_year: 2025, death_month: 7, death_day: 25 })
    const [event] = deathEvents(person, day(2025, 7, 1))
    expect(event.nextOccurrence).toEqual(day(2025, 7, 25))
    expect(event.eventDateLabel).toBe('01/06 ÂL')
  })

  test('a regular-month death ignores that year’s leap month', () => {
    const person = deceased({ death_lunar_month: 6, death_lunar_day: 1 })
    const [event] = deathEvents(person, day(2025, 6, 1))
    expect(event.nextOccurrence).toEqual(day(2025, 6, 25))
  })

  test('living people have no anniversary', () => {
    const person = deceased({
      is_deceased: false,
      death_lunar_month: 1,
      death_lunar_day: 1
    })
    expect(deathEvents(person, day(2025, 1, 1))).toEqual([])
  })
})

describe('computeEvents: birthdays and custom events', () => {
  test('birthday uses the solar date', () => {
    const person = deceased({
      is_deceased: false,
      birth_month: 3,
      birth_day: 8
    })
    const [event] = computeEvents([person], [], day(2025, 3, 1))
    expect(event.type).toBe('birthday')
    expect(event.daysUntil).toBe(7)
    expect(event.eventDateLabel).toBe('08/03')
  })

  test('custom events keep their solar date', () => {
    const [event] = computeEvents(
      [],
      [
        {
          id: 'e1',
          name: 'Họp họ',
          content: null,
          event_date: '2025-04-10',
          location: 'Nhà thờ họ',
          created_by: null
        }
      ],
      day(2025, 4, 1)
    )
    expect(event.daysUntil).toBe(9)
    expect(event.eventDateLabel).toBe('10/04/2025')
  })
})
