import { describe, expect, test } from 'bun:test'

import { messages } from '@/lib/i18n/messages'

import { vnToday } from './dateHelpers'
import {
  computeEvents,
  defaultEventDate,
  eventHref,
  filterVisibleEvents,
  formatLunarDateLabel,
  isUpcomingEvent,
  toRecurrence,
  type CustomEventRecord
} from './eventHelpers'
import { lunarToSolar } from './lunarCalendar'

const tFor =
  (locale: 'vi' | 'en') =>
  (key: keyof typeof messages.vi, values?: Record<string, unknown>) =>
    (messages[locale][key] as string).replace(/\{(\w+)\}/g, (_, k) =>
      String(values?.[k] ?? '')
    )
const tVi = tFor('vi')
const tEn = tFor('en')

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

/** Events from today on (computeEvents also lists recent past ones). */
const fromToday = <T extends { daysUntil: number }>(events: T[]) =>
  events.filter((e) => e.daysUntil >= 0)

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
    expect(event.eventDateLabel).toBe('01/01')
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

  test('the origin year is the lunar year when only the solar date is stored', () => {
    // 2020-01-05 is 11/12 âm lịch 2019 (Kỷ Hợi).
    const person = deceased({ death_year: 2020, death_month: 1, death_day: 5 })
    const events = deathEvents(person, day(2021, 1, 10))
    expect(events.map((e) => e.originYear)).toEqual([2019])
    expect(events[0].nextOccurrence).toEqual(day(2021, 1, 23))
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
    const [event] = deathEvents(person, day(2026, 3, 1))
    // Lunar 2026 has no leap month 6: observed in the regular month.
    expect(event.nextOccurrence).toEqual(day(2026, 7, 14))
    expect(event.eventDateLabel).toBe('01/06')
    expect(event.lunarLabel).toEqual({ day: 1, month: 6, leap: true })
    expect(formatLunarDateLabel(event, tVi)).toBe('01/06 ÂL nhuận')
    expect(formatLunarDateLabel(event, tEn)).toBe('01/06 L leap')
  })

  test('a regular-month death ignores that year’s leap month', () => {
    const person = deceased({ death_lunar_month: 6, death_lunar_day: 1 })
    const [event] = fromToday(deathEvents(person, day(2025, 6, 1)))
    expect(event.nextOccurrence).toEqual(day(2025, 6, 25))
  })

  describe('no anniversary in the lunar year of death', () => {
    const solar = (y: number, m: number, d: number) => {
      const s = lunarToSolar(y, m, d)!
      return day(s.year, s.month, s.day)
    }
    // Died on 10/3 âm lịch of the given lunar year.
    const diedOn = (lunarYear: number) => {
      const death = solar(lunarYear, 3, 10)
      return deceased({
        death_year: death.getFullYear(),
        death_month: death.getMonth() + 1,
        death_day: death.getDate(),
        death_lunar_year: lunarYear,
        death_lunar_month: 3,
        death_lunar_day: 10
      })
    }

    test('died earlier this lunar year: only next year, nothing past', () => {
      const events = deathEvents(diedOn(2026), solar(2026, 5, 1))
      expect(events.map((e) => e.nextOccurrence)).toEqual([solar(2027, 3, 10)])
      expect(events.every((e) => e.daysUntil > 0)).toBe(true)
    })

    test('died today: the next one is next lunar year', () => {
      const events = deathEvents(diedOn(2026), solar(2026, 3, 10))
      expect(events.map((e) => e.nextOccurrence)).toEqual([solar(2027, 3, 10)])
    })

    test('the solar death date gives the year when no lunar year is stored', () => {
      const person = { ...diedOn(2026), death_lunar_year: null }
      const events = deathEvents(person, solar(2026, 5, 1))
      expect(events.map((e) => e.nextOccurrence)).toEqual([solar(2027, 3, 10)])
    })

    test('died the year before: this year’s passed one is still listed', () => {
      const events = deathEvents(diedOn(2025), solar(2026, 5, 1))
      expect(events.map((e) => e.nextOccurrence)).toEqual([
        solar(2026, 3, 10),
        solar(2027, 3, 10)
      ])
    })

    test('unknown year of death: every year as before', () => {
      const person = deceased({ death_lunar_month: 3, death_lunar_day: 10 })
      expect(deathEvents(person, solar(2026, 5, 1))).toHaveLength(2)
    })
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
    const [event] = fromToday(computeEvents([person], [], day(2025, 3, 1)))
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

describe('computeEvents: Vietnam day, estimates and 29/2', () => {
  // 00:30 on 8 March in Vietnam (UTC+7) is 17:30 UTC on 7 March.
  const earlyMorning = new Date('2025-03-07T17:30:00Z')

  test('vnToday is the Vietnamese calendar day', () => {
    expect(vnToday(earlyMorning)).toEqual(day(2025, 3, 8))
    expect(vnToday(new Date('2025-03-08T16:59:00Z'))).toEqual(day(2025, 3, 8))
    expect(vnToday(new Date('2025-03-08T17:00:00Z'))).toEqual(day(2025, 3, 9))
  })

  test('at 00:30 in Vietnam a birthday today is today, not tomorrow', () => {
    const person = deceased({
      is_deceased: false,
      birth_month: 3,
      birth_day: 8
    })
    const [event] = fromToday(
      computeEvents([person], [], vnToday(earlyMorning))
    )
    expect(event.daysUntil).toBe(0)
  })

  test('at 00:30 in Vietnam a giỗ today is today', () => {
    // 8/3/2025 solar = 9/2 lunar
    const person = deceased({
      death_lunar_month: 2,
      death_lunar_day: 9,
      death_year: 2000,
      death_month: 1,
      death_day: 1
    })
    const [event] = fromToday(deathEvents(person, vnToday(earlyMorning)))
    expect(event.daysUntil).toBe(0)
  })

  test('a death without a year is an estimate', () => {
    const [event] = deathEvents(
      deceased({ death_month: 3, death_day: 8 }),
      day(2025, 1, 1)
    )
    expect(event.approximate).toBe(true)
  })

  test('a death with a year, or a stored lunar date, is exact', () => {
    const withYear = deathEvents(
      deceased({ death_year: 2000, death_month: 3, death_day: 8 }),
      day(2025, 1, 1)
    )
    const withLunar = deathEvents(
      deceased({ death_lunar_month: 2, death_lunar_day: 9 }),
      day(2025, 1, 1)
    )
    for (const e of [...withYear, ...withLunar]) {
      expect(e.approximate).toBeUndefined()
    }
  })

  test('a 29/2 birthday is on 28/2 in a common year, 29/2 in a leap year', () => {
    const person = deceased({
      is_deceased: false,
      birth_month: 2,
      birth_day: 29
    })
    const common = fromToday(computeEvents([person], [], day(2025, 2, 1)))[0]
    expect(common.nextOccurrence).toEqual(day(2025, 2, 28))
    expect(common.daysUntil).toBe(27)
    const leap = fromToday(computeEvents([person], [], day(2028, 2, 1)))[0]
    expect(leap.nextOccurrence).toEqual(day(2028, 2, 29))
    // After 28/2 of a common year, the next one is in the following year.
    const after = computeEvents([person], [], day(2027, 3, 1)).find(
      (e) => e.daysUntil >= 0
    )!
    expect(after.nextOccurrence).toEqual(day(2028, 2, 29))
  })
})

describe('isUpcomingEvent', () => {
  test('keeps a death anniversary 383 days away after a leap-month year', () => {
    // Lunar 2025 has a leap 6th month: Tết 2025-01-29, next Tết 2026-02-17.
    const upcoming = computeEvents(
      [deceased({ death_lunar_month: 1, death_lunar_day: 1 })],
      [],
      day(2025, 1, 30)
    ).filter(isUpcomingEvent)
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].nextOccurrence).toEqual(day(2026, 2, 17))
    expect(upcoming[0].daysUntil).toBe(383)
  })

  test('drops past events', () => {
    expect(isUpcomingEvent({ daysUntil: -1 })).toBe(false)
    expect(isUpcomingEvent({ daysUntil: 0 })).toBe(true)
  })
})

describe('filterVisibleEvents', () => {
  const now = day(2026, 3, 10)
  const persons = [
    deceased({
      id: 'gone',
      birth_month: 3,
      birth_day: 12,
      death_year: 2000,
      death_lunar_month: 3,
      death_lunar_day: 14
    }),
    deceased({
      id: 'alive',
      is_deceased: false,
      birth_month: 3,
      birth_day: 11
    })
  ]
  const events = computeEvents(persons, [], now)

  test('hides birthdays of deceased people by default, keeps the rest', () => {
    const visible = filterVisibleEvents(events)
    expect(
      visible.some((e) => e.type === 'birthday' && e.personId === 'gone')
    ).toBe(false)
    expect(
      visible.some((e) => e.type === 'birthday' && e.personId === 'alive')
    ).toBe(true)
    expect(visible.some((e) => e.type === 'death_anniversary')).toBe(true)
  })

  test('shows them when asked', () => {
    const visible = filterVisibleEvents(events, { showDeceasedBirthdays: true })
    expect(visible).toEqual(events)
    expect(
      visible.some((e) => e.type === 'birthday' && e.personId === 'gone')
    ).toBe(true)
  })

  test('counts taken from the filtered list match what is shown', () => {
    const soon = (list: typeof events) =>
      list.filter((e) => e.daysUntil > 0 && e.daysUntil <= 7).length
    expect(soon(filterVisibleEvents(events))).toBe(
      soon(events) - 1 // the deceased birthday on 12/03
    )
  })
})

describe('computeEvents: repeating custom events', () => {
  const custom = (
    event_date: string,
    recurrence?: CustomEventRecord['recurrence']
  ): CustomEventRecord => ({
    id: 'e1',
    name: 'Họp họ',
    content: null,
    event_date,
    location: null,
    created_by: null,
    recurrence
  })
  const customEvents = (event: CustomEventRecord, now: Date) =>
    computeEvents([], [event], now)
  const upcoming = (event: CustomEventRecord, now: Date) =>
    customEvents(event, now).filter((e) => e.daysUntil >= 0)

  test('none (and a missing column) stays on its stored date', () => {
    for (const recurrence of ['none', undefined, null] as const) {
      const events = customEvents(
        custom('2020-04-02', recurrence),
        day(2026, 4, 1)
      )
      expect(events).toHaveLength(1)
      expect(events[0].nextOccurrence).toEqual(day(2020, 4, 2))
      expect(events[0].daysUntil).toBeLessThan(0)
      expect(events[0].eventDateLabel).toBe('02/04/2020')
      expect(events[0].recurrence).toBe('none')
    }
  })

  test('yearly_solar comes back on the same day and month', () => {
    const [next] = fromToday(
      customEvents(custom('2020-04-02', 'yearly_solar'), day(2026, 3, 1))
    )
    expect(next.nextOccurrence).toEqual(day(2026, 4, 2))
    expect(next.daysUntil).toBe(32)
    expect(next.eventDateLabel).toBe('02/04')
    expect(next.recurrence).toBe('yearly_solar')
  })

  test("yearly_solar after this year's date: next year, and this year as past", () => {
    const events = customEvents(
      custom('2020-04-02', 'yearly_solar'),
      day(2026, 5, 1)
    )
    expect(events.map((e) => e.nextOccurrence)).toEqual([
      day(2026, 4, 2),
      day(2027, 4, 2)
    ])
    expect(events[0].daysUntil).toBeLessThan(0)
  })

  test('yearly_solar on 29/2 falls on 28/2 in a common year', () => {
    const [next] = fromToday(
      customEvents(custom('2024-02-29', 'yearly_solar'), day(2026, 1, 1))
    )
    expect(next.nextOccurrence).toEqual(day(2026, 2, 28))
  })

  test('yearly_lunar from 2020 falls on the right solar dates in 2026 and 2027', () => {
    // 2/4/2020 = 10/3 âm lịch; 10/3 âm = 26/4/2026 and 16/4/2027.
    const event = custom('2020-04-02', 'yearly_lunar')
    // 1/1/2026 is still in lunar year 2025: its 10/3 (7/4/2025) is past.
    const [past, in2026] = customEvents(event, day(2026, 1, 1))
    expect(past.nextOccurrence).toEqual(day(2025, 4, 7))
    expect(in2026.nextOccurrence).toEqual(day(2026, 4, 26))
    expect(in2026.eventDateLabel).toBe('10/03')
    expect(in2026.recurrence).toBe('yearly_lunar')
    expect(
      upcoming(event, day(2026, 5, 1)).map((e) => e.nextOccurrence)
    ).toEqual([day(2027, 4, 16)])
  })

  test('yearly_lunar keeps the leap month like a death anniversary', () => {
    // 1/6/2020 is in leap month 4 of 2020.
    const event = custom('2020-06-01', 'yearly_lunar')
    const person = deceased({
      death_year: 2020,
      death_month: 6,
      death_day: 1,
      death_lunar_year: 2020,
      death_lunar_month: 4,
      death_lunar_day: 10
    })
    for (const now of [day(2026, 1, 1), day(2028, 1, 1)]) {
      const [repeat] = upcoming(event, now)
      const [anniversary] = deathEvents(person, now).filter(
        (e) => e.daysUntil >= 0
      )
      expect(repeat.nextOccurrence).toEqual(anniversary.nextOccurrence)
    }
    const [first] = upcoming(event, day(2021, 1, 1))
    expect(first.eventDateLabel).toBe('10/04')
    expect(formatLunarDateLabel(first, tVi)).toBe('10/04 ÂL nhuận')
    expect(formatLunarDateLabel(first, tEn)).toBe('10/04 L leap')
    expect(formatLunarDateLabel(first, tEn, false)).toBe('10/04 leap')
  })

  test('a repeating event is shown once before its first date', () => {
    for (const recurrence of ['yearly_solar', 'yearly_lunar'] as const) {
      const events = customEvents(
        custom('2027-03-15', recurrence),
        day(2026, 4, 1)
      )
      expect(events).toHaveLength(1)
      expect(events[0].nextOccurrence).toEqual(day(2027, 3, 15))
    }
  })

  test('unknown recurrence values count as none', () => {
    expect(toRecurrence('yearly_lunar')).toBe('yearly_lunar')
    expect(toRecurrence('monthly')).toBe('none')
    expect(toRecurrence(undefined)).toBe('none')
  })
})

describe('defaultEventDate', () => {
  test('is already tomorrow after midnight in Vietnam', () => {
    expect(defaultEventDate(new Date('2026-10-27T18:30:00Z'))).toBe(
      '2026-10-28'
    )
  })

  test('is still today just before midnight in Vietnam', () => {
    expect(defaultEventDate(new Date('2026-10-27T16:59:00Z'))).toBe(
      '2026-10-27'
    )
  })
})

describe('computeEvents: past occurrences across the new year', () => {
  const pastOf = (events: ReturnType<typeof computeEvents>) =>
    events.filter((e) => e.daysUntil < 0)

  test('early January lists the December birthday just gone', () => {
    const person = { ...deceased({ birth_month: 12, birth_day: 28 }) }
    person.is_deceased = false
    const past = pastOf(computeEvents([person], [], day(2027, 1, 5)))
    expect(past).toHaveLength(1)
    expect(past[0].daysUntil).toBe(-8)
    expect(past[0].nextOccurrence).toEqual(day(2026, 12, 28))
  })

  test('lists last lunar year’s giỗ after Tết, from the year after death', () => {
    // 20/12 of lunar 2026 falls in late January 2027; Tết 2027 is before 20/2.
    const date = lunarToSolar(2026, 12, 20)!
    const occurred = new Date(date.year, date.month - 1, date.day)
    const now = day(2027, 2, 20)
    const kept = pastOf(
      deathEvents(
        deceased({
          death_lunar_year: 2025,
          death_lunar_month: 12,
          death_lunar_day: 20
        }),
        now
      )
    )
    expect(kept).toHaveLength(1)
    expect(kept[0].nextOccurrence).toEqual(occurred)
    // Died in lunar 2026: no giỗ in that lunar year.
    const none = pastOf(
      deathEvents(
        deceased({
          death_lunar_year: 2026,
          death_lunar_month: 12,
          death_lunar_day: 20
        }),
        now
      )
    )
    expect(none).toHaveLength(0)
  })

  test('a repeating custom event is never listed before its start', () => {
    const event = (event_date: string): CustomEventRecord => ({
      id: 'e1',
      name: 'Họp họ',
      content: null,
      event_date,
      location: null,
      created_by: null,
      recurrence: 'yearly_solar'
    })
    const now = day(2027, 1, 5)
    const after = pastOf(computeEvents([], [event('2025-12-30')], now))
    expect(after.map((e) => e.nextOccurrence)).toEqual([day(2026, 12, 30)])
    const before = pastOf(computeEvents([], [event('2027-01-02')], now))
    expect(before.map((e) => e.nextOccurrence)).toEqual([day(2027, 1, 2)])
  })

  test('never lists an occurrence more than 365 days ago', () => {
    const people = Array.from({ length: 12 }, (_, i) =>
      deceased({
        id: `p${i}`,
        birth_month: i + 1,
        birth_day: 6,
        death_lunar_month: i + 1,
        death_lunar_day: 6
      })
    )
    for (const now of [day(2027, 1, 5), day(2027, 2, 20), day(2028, 3, 1)]) {
      const past = pastOf(computeEvents(people, [], now))
      expect(past.length).toBeGreaterThan(0)
      for (const e of past) expect(e.daysUntil).toBeGreaterThanOrEqual(-365)
    }
  })
})

describe('eventHref', () => {
  test('birthday and death anniversary open the member profile', () => {
    expect(eventHref({ type: 'birthday', personId: 'p1' })).toBe(
      '/dashboard/members/p1'
    )
    expect(eventHref({ type: 'death_anniversary', personId: 'p2' })).toBe(
      '/dashboard/members/p2'
    )
  })
  test('custom event opens the events page, not a member', () => {
    expect(eventHref({ type: 'custom_event', personId: 'e1' })).toBe(
      '/dashboard/events'
    )
  })
  test('missing person id falls back to the events page', () => {
    expect(eventHref({ type: 'birthday', personId: null })).toBe(
      '/dashboard/events'
    )
  })
})
