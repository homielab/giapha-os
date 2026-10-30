import { describe, expect, test } from 'bun:test'
import ICAL from 'ical.js'

import { messages } from '@/lib/i18n/messages'

import { vnToday } from './dateHelpers'
import { computeEvents } from './eventHelpers'
import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  icsReminderTrigger,
  parseIcsRemind
} from './icsExport'
import { lunarToSolar } from './lunarCalendar'

type PersonInput = Parameters<typeof computeEvents>[0][number]

const t = (key: keyof typeof messages.vi, values?: Record<string, unknown>) =>
  (messages.vi[key] as string).replace(/\{(\w+)\}/g, (_, k) =>
    String(values?.[k] ?? '')
  )

function person(extra: Partial<PersonInput>): PersonInput {
  return {
    id: 'p1',
    full_name: 'Nguyễn Văn An',
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

const today = new Date(2026, 9, 26)
const now = new Date(Date.UTC(2026, 9, 26, 3, 4, 5))
const build = (
  persons: PersonInput[],
  customEvents: Parameters<typeof buildIcs>[0]['customEvents'] = []
) =>
  buildIcs({
    persons,
    customEvents,
    t,
    siteUrl: 'https://giapha.example.com/',
    today,
    now
  })

const events = (ics: string) => ics.split('BEGIN:VEVENT').slice(1)

describe('escapeIcsText / foldIcsLine', () => {
  test('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
  })

  test('escapes a semicolon as \\; (not a bare semicolon)', () => {
    expect(escapeIcsText('Giỗ cụ; họp họ')).toBe('Giỗ cụ\\; họp họ')
  })

  test('folds long lines at 75 octets without splitting characters', () => {
    const folded = foldIcsLine(`SUMMARY:${'Nguyễn'.repeat(30)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true)
    expect(lines.join('').replace(/ /g, '')).toBe(
      `SUMMARY:${'Nguyễn'.repeat(30)}`
    )
  })
})

describe('buildIcs', () => {
  test('is a CRLF VCALENDAR', () => {
    const ics = build([person({ birth_month: 3, birth_day: 12 })])
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  test('living member birthday repeats yearly as an all-day event', () => {
    const [ev] = events(
      build([person({ birth_year: 1990, birth_month: 3, birth_day: 12 })])
    )
    expect(ev).toContain('DTSTART;VALUE=DATE:20260312')
    expect(ev).toContain('DTEND;VALUE=DATE:20260313')
    expect(ev).toContain('RRULE:FREQ=YEARLY')
    expect(ev).toContain('UID:giapha-p1-birthday@giapha.example.com')
    expect(ev).toContain('DTSTAMP:20261026T030405Z')
    expect(ev).toContain('SUMMARY:Sinh nhật Nguyễn Văn An')
    expect(ev).toContain('Sinh năm 1990')
  })

  test('birthday of a deceased member is left out', () => {
    expect(
      events(
        build([person({ birth_month: 3, birth_day: 12, is_deceased: true })])
      )
    ).toHaveLength(0)
  })

  test('29/2 birthday starts on 28/2 in a common year and repeats on the last day of February', () => {
    const [ev] = events(build([person({ birth_month: 2, birth_day: 29 })]))
    expect(ev).toContain('DTSTART;VALUE=DATE:20260228')
    expect(ev).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1')
    expect(ev).not.toContain('RRULE:FREQ=YEARLY\r\n')
  })

  test('lunar death anniversary: one event for each of the five years', () => {
    const ics = build([
      person({
        id: 'p2',
        full_name: 'Cụ, Tổ',
        is_deceased: true,
        death_lunar_month: 5,
        death_lunar_day: 10
      })
    ])
    const evs = events(ics)
    expect(evs).toHaveLength(5)
    const dates = evs.map((e) => /DTSTART;VALUE=DATE:(\d{8})/.exec(e)![1])
    expect(new Set(evs.map((e) => /UID:(.*)\r/.exec(e)![1])).size).toBe(5)
    for (const e of evs) {
      expect(e).not.toContain('RRULE')
      expect(e).toContain('SUMMARY:Giỗ Cụ\\, Tổ')
      expect(e).toContain('10/05')
      expect(e.replace(/\r\n /g, '')).toContain('nhắc đến hết 2030')
    }
    // Same solar date as the Events page, one per lunar year 2026-2030
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(dates).toEqual(
      [2026, 2027, 2028, 2029, 2030].map((y) => {
        const s = lunarToSolar(y, 5, 10)!
        return `${s.year}${pad(s.month)}${pad(s.day)}`
      })
    )
  })

  test('no anniversary in the lunar year of death', () => {
    // Died 10/3 âm lịch 2026; the first giỗ is 10/3 âm lịch 2027.
    const death = lunarToSolar(2026, 3, 10)!
    const evs = events(
      build([
        person({
          is_deceased: true,
          death_year: death.year,
          death_month: death.month,
          death_day: death.day,
          death_lunar_year: 2026,
          death_lunar_month: 3,
          death_lunar_day: 10
        })
      ])
    )
    const first = lunarToSolar(2027, 3, 10)!
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(evs).toHaveLength(4)
    expect(evs[0]).toContain(
      `DTSTART;VALUE=DATE:${first.year}${pad(first.month)}${pad(first.day)}`
    )
  })

  test('anniversary dates match computeEvents', () => {
    const p = person({
      is_deceased: true,
      death_lunar_month: 12,
      death_lunar_day: 30
    })
    const next = computeEvents([p], [], today).find(
      (e) => e.type === 'death_anniversary'
    )!.nextOccurrence
    const d = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`
    expect(build([p])).toContain(`DTSTART;VALUE=DATE:${d}`)
  })

  test('estimated anniversary carries a note', () => {
    const ics = build([
      person({ is_deceased: true, death_month: 3, death_day: 4 })
    ])
    expect(ics).toContain('Ngày ước tính')
  })

  test('custom event keeps its own date, location and content', () => {
    const ics = build(
      [],
      [
        {
          id: 'e1',
          name: 'Họp họ; cả nhà',
          content: 'Mang theo\nảnh',
          event_date: '2027-01-15',
          location: 'Nhà thờ họ, Huế',
          created_by: null
        }
      ]
    )
    const [ev] = events(ics)
    expect(ev).toContain('DTSTART;VALUE=DATE:20270115')
    expect(ev).toContain('UID:giapha-e1-custom@giapha.example.com')
    expect(ev).toContain('SUMMARY:Họp họ\\; cả nhà')
    expect(ev).toContain('DESCRIPTION:Mang theo\\nảnh')
    expect(ev).toContain('LOCATION:Nhà thờ họ\\, Huế')
  })

  test('semicolons in summary, description and location are escaped', () => {
    const ics = build(
      [],
      [
        {
          id: 'e2',
          name: 'Giỗ cụ; họp họ',
          content: 'Chuẩn bị: hoa; nhang',
          event_date: '2027-02-01',
          location: 'Nhà thờ họ; Huế',
          created_by: null
        }
      ]
    )
    const [ev] = events(ics)
    expect(ev).toContain('SUMMARY:Giỗ cụ\\; họp họ')
    expect(ev).toContain('DESCRIPTION:Chuẩn bị: hoa\\; nhang')
    expect(ev).toContain('LOCATION:Nhà thờ họ\\; Huế')
  })

  test('uses the current Vietnam day by default', () => {
    expect(vnToday().getFullYear()).toBeGreaterThan(2000)
    expect(
      buildIcs({ persons: [person({ birth_month: 1, birth_day: 1 })], t })
    ).toContain('UID:giapha-p1-birthday@giapha-os')
  })

  test('yearly_solar custom event repeats with an RRULE from its first date', () => {
    const ics = build(
      [],
      [
        {
          id: 'e3',
          name: 'Họp họ',
          content: null,
          event_date: '2020-04-02',
          location: null,
          created_by: null,
          recurrence: 'yearly_solar'
        }
      ]
    )
    const evs = events(ics)
    expect(evs).toHaveLength(1)
    expect(evs[0]).toContain('UID:giapha-e3-custom@giapha.example.com')
    expect(evs[0]).toContain('DTSTART;VALUE=DATE:20200402')
    expect(evs[0]).toContain('RRULE:FREQ=YEARLY\r\n')
  })

  test('a yearly event on 29/2 repeats on the last day of February', () => {
    const ics = build(
      [],
      [
        {
          id: 'e4',
          name: 'Kỷ niệm',
          content: null,
          event_date: '2024-02-29',
          location: null,
          created_by: null,
          recurrence: 'yearly_solar'
        }
      ]
    )
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1')
  })

  test('yearly_lunar custom event: one event per occurrence, no RRULE', () => {
    // 2/4/2020 = 10/3 âm lịch → 26/4/2026, 16/4/2027, … to 2030.
    const ics = build(
      [],
      [
        {
          id: 'e5',
          name: 'Giỗ tổ',
          content: 'Ăn cỗ',
          event_date: '2020-04-02',
          location: null,
          created_by: null,
          recurrence: 'yearly_lunar'
        }
      ]
    )
    const evs = events(ics)
    expect(ics).not.toContain('RRULE')
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(evs.map((e) => e.match(/DTSTART;VALUE=DATE:(\d+)/)?.[1])).toEqual(
      [2026, 2027, 2028, 2029, 2030].map((y) => {
        const s = lunarToSolar(y, 3, 10)!
        return `${s.year}${pad(s.month)}${pad(s.day)}`
      })
    )
    expect(evs[0]).toContain('20260426')
    expect(evs[0]).toContain('UID:giapha-e5-custom-20260426@giapha.example.com')
    expect(evs[0]).toContain('DESCRIPTION:Ngày âm lịch: 10/03\\nĂn cỗ')
  })
})

describe('leap-month anniversary description', () => {
  const leapPerson = person({
    id: 'p3',
    full_name: 'Cụ Bà',
    is_deceased: true,
    death_year: 2025,
    death_month: 7,
    death_day: 25
  })
  const describeIn = (locale: 'vi' | 'en') =>
    buildIcs({
      persons: [leapPerson],
      t: (key, values) =>
        (messages[locale][key] as string).replace(/\{(\w+)\}/g, (_, k) =>
          String(values?.[k] ?? '')
        ),
      siteUrl: 'https://giapha.example.com/',
      today,
      now
    })

  test('english calendar has no Vietnamese leap word', () => {
    const ics = describeIn('en')
    expect(ics).toContain('Lunar date of the anniversary: 01/06 leap')
    expect(ics).not.toContain('nhuận')
  })

  test('vietnamese calendar says nhuận', () => {
    expect(describeIn('vi')).toContain('Ngày giỗ theo âm lịch: 01/06 nhuận')
  })
})

describe('reminders (VALARM)', () => {
  const persons = [
    person({ birth_month: 3, birth_day: 12 }),
    person({
      id: 'p2',
      full_name: `Cụ ${'Nguyễn Thị Bích Ngọc '.repeat(4)}`,
      is_deceased: true,
      death_year: 2000,
      death_lunar_year: 2000,
      death_lunar_month: 3,
      death_lunar_day: 10
    })
  ]
  const withRemind = (remindDaysBefore: number) =>
    buildIcs({ persons, t, today, now, remindDaysBefore })

  test('trigger is 08:00 N days before the all-day start', () => {
    expect(icsReminderTrigger(1)).toBe('-PT16H')
    expect(icsReminderTrigger(3)).toBe('-P2DT16H')
    expect(icsReminderTrigger(7)).toBe('-P6DT16H')
  })

  test('N=1 → exactly one VALARM per VEVENT', () => {
    const evs = events(withRemind(1))
    expect(evs.length).toBeGreaterThan(1)
    for (const ev of evs) {
      expect(ev.split('BEGIN:VALARM').length - 1).toBe(1)
      expect(ev).toContain('TRIGGER:-PT16H')
      expect(ev).toContain('ACTION:DISPLAY')
    }
  })

  test('N=0 (default) → no VALARM', () => {
    expect(withRemind(0)).not.toContain('VALARM')
    expect(build(persons)).not.toContain('VALARM')
  })

  test('parses with ical.js, long folded lines intact', () => {
    const ics = withRemind(3)
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    const cal = new ICAL.Component(ICAL.parse(ics))
    const vevents = cal.getAllSubcomponents('vevent')
    expect(vevents.length).toBe(events(ics).length)
    for (const ev of vevents) {
      const alarms = ev.getAllSubcomponents('valarm')
      expect(alarms.length).toBe(1)
      const trigger = alarms[0].getFirstPropertyValue(
        'trigger'
      ) as ICAL.Duration
      expect(trigger.toSeconds()).toBe(-(3 * 24 - 8) * 3600)
      expect(alarms[0].getFirstPropertyValue('description')).toBe(
        ev.getFirstPropertyValue('summary')
      )
    }
    expect(
      vevents.some((e) =>
        String(e.getFirstPropertyValue('summary')).includes(
          'Nguyễn Thị Bích Ngọc Nguyễn Thị Bích Ngọc Nguyễn'
        )
      )
    ).toBe(true)
  })

  test('saved choice: only known values, default 1', () => {
    expect(parseIcsRemind(null)).toBe(1)
    expect(parseIcsRemind('0')).toBe(0)
    expect(parseIcsRemind('7')).toBe(7)
    expect(parseIcsRemind('5')).toBe(1)
    expect(parseIcsRemind('abc')).toBe(1)
  })
})
