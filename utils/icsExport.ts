import { vnToday, type Translate } from '@/utils/dateHelpers'
import {
  computeEvents,
  filterVisibleEvents,
  formatLunarDateLabel,
  type CustomEventRecord,
  type FamilyEvent
} from '@/utils/eventHelpers'

type EventPerson = Parameters<typeof computeEvents>[0][number]

export interface IcsOptions {
  persons: EventPerson[]
  customEvents?: CustomEventRecord[]
  t: Translate
  /** Origin of the site, used as the domain part of every UID. */
  siteUrl?: string
  /** Calendar day to start from (default: today in Vietnam). */
  today?: Date
  /** Moment written to DTSTAMP (default: now). */
  now?: Date
}

const CRLF = '\r\n'
const encoder = new TextEncoder()

/** Escapes a TEXT value (RFC 5545 section 3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Folds a content line to at most 75 octets, never splitting a character. */
export function foldIcsLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  // Continuation lines start with one space, which counts toward the limit.
  let limit = 75
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (size + bytes > limit) {
      parts.push(current)
      current = ''
      size = 0
      limit = 74
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join(CRLF + ' ')
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

function icsDate(d: Date): string {
  return `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function icsTimestamp(d: Date): string {
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

function uidDomain(siteUrl?: string): string {
  if (siteUrl) {
    try {
      return new URL(siteUrl).host
    } catch {
      // fall through to the default
    }
  }
  return 'giapha-os'
}

interface VEvent {
  uid: string
  start: Date
  summary: string
  description: string[]
  location?: string | null
  yearly?: boolean
  /** Yearly on the last day of February (an event on 29/2). */
  lastDayOfFebruary?: boolean
}

function renderEvent(e: VEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(e.start)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(e.start, 1))}`
  ]
  if (e.lastDayOfFebruary) {
    lines.push('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1')
  } else if (e.yearly) {
    lines.push('RRULE:FREQ=YEARLY')
  }
  lines.push(`SUMMARY:${escapeIcsText(e.summary)}`)
  if (e.description.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(e.description.join('\n'))}`)
  }
  if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`)
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  return lines
}

/**
 * Builds a VCALENDAR with the family's events:
 * - living members' birthdays: one yearly repeating event each;
 * - death anniversaries: the lunar date has no RRULE, so one event per
 *   occurrence falling in this and next calendar year;
 * - custom events: once, on their own date; yearly_solar ones repeat every
 *   year from it (29/2 → last day of February, as on the page); yearly_lunar
 *   ones, like death anniversaries, one event per occurrence in this and
 *   next calendar year.
 * Dates are the same ones the Events page shows (computeEvents).
 */
export function buildIcs({
  persons,
  customEvents = [],
  t,
  siteUrl,
  today = vnToday(),
  now = new Date()
}: IcsOptions): string {
  const year = today.getFullYear()
  const domain = uidDomain(siteUrl)
  const stamp = icsTimestamp(now)
  const events: VEvent[] = []

  // A lunar date comes round every 354-384 days, so sampling the next
  // occurrence every six months finds each one that falls in the two years.
  const samples = [0, 6, 12, 18].map(
    (months) => new Date(year, months, 1)
  ) as Date[]
  const rangeEnd = new Date(year + 2, 0, 1)
  const seen = new Set<string>()
  const occurrences: FamilyEvent[] = []
  for (const sample of samples) {
    for (const event of computeEvents(persons, customEvents, sample)) {
      const date = event.nextOccurrence
      const inRange = date >= samples[0] && date < rangeEnd
      const once =
        event.type === 'custom_event' && event.recurrence !== 'yearly_lunar'
      if (!once && !inRange) continue
      const key = `${event.type}|${event.personId}|${icsDate(date)}`
      if (seen.has(key)) continue
      seen.add(key)
      occurrences.push(event)
    }
  }
  occurrences.sort(
    (a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime()
  )

  const customDates = new Map(customEvents.map((e) => [e.id, e.event_date]))
  const birthdaySeen = new Set<string>()
  const yearlySeen = new Set<string>()
  for (const event of filterVisibleEvents(occurrences)) {
    if (event.type === 'birthday') {
      if (birthdaySeen.has(event.personId ?? '')) continue
      birthdaySeen.add(event.personId ?? '')
      const description: string[] = []
      if (event.originYear) {
        description.push(t('icsBirthYear', { year: event.originYear }))
      }
      events.push({
        uid: `giapha-${event.personId}-birthday@${domain}`,
        start: event.nextOccurrence,
        summary: t('icsBirthdaySummary', { name: event.personName }),
        description,
        yearly: true,
        lastDayOfFebruary: event.originMonth === 2 && event.originDay === 29
      })
    } else if (event.type === 'death_anniversary') {
      const description = [
        t('icsLunarDate', { date: formatLunarDateLabel(event, t, false) })
      ]
      if (event.approximate) description.push(t('icsApproximate'))
      events.push({
        uid: `giapha-${event.personId}-death-${icsDate(event.nextOccurrence)}@${domain}`,
        start: event.nextOccurrence,
        summary: t('icsDeathSummary', { name: event.personName }),
        description
      })
    } else if (event.recurrence === 'yearly_lunar') {
      const description = [
        t('icsCustomLunarDate', { date: formatLunarDateLabel(event, t, false) })
      ]
      if (event.content) description.push(event.content)
      events.push({
        uid: `giapha-${event.personId}-custom-${icsDate(event.nextOccurrence)}@${domain}`,
        start: event.nextOccurrence,
        summary: event.personName,
        description,
        location: event.location
      })
    } else if (event.recurrence === 'yearly_solar') {
      const id = event.personId ?? ''
      if (yearlySeen.has(id)) continue
      yearlySeen.add(id)
      const [y, m, d] = (customDates.get(id) ?? '').split('-').map(Number)
      const start = y && m && d ? new Date(y, m - 1, d) : event.nextOccurrence
      events.push({
        uid: `giapha-${id}-custom@${domain}`,
        start,
        summary: event.personName,
        description: event.content ? [event.content] : [],
        location: event.location,
        yearly: true,
        lastDayOfFebruary: m === 2 && d === 29
      })
    } else {
      events.push({
        uid: `giapha-${event.personId}-custom@${domain}`,
        start: event.nextOccurrence,
        summary: event.personName,
        description: event.content ? [event.content] : [],
        location: event.location
      })
    }
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Giapha OS//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(t('icsCalendarName'))}`,
    ...events.flatMap((e) => renderEvent(e, stamp)),
    'END:VCALENDAR'
  ]
  return lines.map(foldIcsLine).join(CRLF) + CRLF
}
