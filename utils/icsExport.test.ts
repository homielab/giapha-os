import { describe, expect, test } from 'bun:test'

import { messages } from '@/lib/i18n/messages'

import { vnToday } from './dateHelpers'
import { computeEvents } from './eventHelpers'
import { buildIcs, escapeIcsText, foldIcsLine } from './icsExport'
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
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne')
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

  test('29/2 birthday falls on 28/2 in a common year', () => {
    const [ev] = events(build([person({ birth_month: 2, birth_day: 29 })]))
    expect(ev).toContain('DTSTART;VALUE=DATE:20260228')
    expect(ev).toContain('RRULE:FREQ=YEARLY')
  })

  test('lunar death anniversary: one event for each of this and next year', () => {
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
    expect(evs).toHaveLength(2)
    const dates = evs.map((e) => /DTSTART;VALUE=DATE:(\d{8})/.exec(e)![1])
    expect(dates[0].startsWith('2026')).toBe(true)
    expect(dates[1].startsWith('2027')).toBe(true)
    expect(new Set(evs.map((e) => /UID:(.*)\r/.exec(e)![1])).size).toBe(2)
    for (const e of evs) {
      expect(e).not.toContain('RRULE')
      expect(e).toContain('SUMMARY:Giỗ Cụ\\, Tổ')
      expect(e).toContain('10/05')
    }
    // Same solar date as the Events page
    const solar = lunarToSolar(2026, 5, 10)!
    expect(dates[0]).toBe(
      `${solar.year}${String(solar.month).padStart(2, '0')}${String(solar.day).padStart(2, '0')}`
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
    expect(ev).toContain('SUMMARY:Họp họ\; cả nhà')
    expect(ev).toContain('DESCRIPTION:Mang theo\\nảnh')
    expect(ev).toContain('LOCATION:Nhà thờ họ\\, Huế')
  })

  test('uses the current Vietnam day by default', () => {
    expect(vnToday().getFullYear()).toBeGreaterThan(2000)
    expect(
      buildIcs({ persons: [person({ birth_month: 1, birth_day: 1 })], t })
    ).toContain('UID:giapha-p1-birthday@giapha-os')
  })
})
