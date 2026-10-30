import { formatIsoDay, vnToday, type Translate } from '@/utils/dateHelpers'
import { lunarAnniversaryInYear, solarToLunar } from '@/utils/lunarCalendar'

export type EventType = 'birthday' | 'death_anniversary' | 'custom_event'

export interface FamilyEvent {
  personId: string | null
  personName: string
  type: EventType
  /** Solar date of the next occurrence */
  nextOccurrence: Date
  /** Days until the next occurrence (negative = a past occurrence within the last year) */
  daysUntil: number
  /** Plain label for the date of the event ("12/03" solar, "05/02" lunar day/month). */
  eventDateLabel: string
  /** Lunar day, month and leap flag when the event is on a lunar date. */
  lunarLabel?: { day: number; month: number; leap: boolean }
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null
  originMonth?: number | null
  originDay?: number | null
  /**
   * The lunar date was derived from a solar date without a year, so it depends
   * on the current year and may differ from the real anniversary.
   */
  approximate?: boolean
  /** Whether the person is deceased */
  isDeceased: boolean
  /** Optional location for the event */
  location?: string | null
  /** Optional content/description for the event */
  content?: string | null
  /** How a custom event repeats (custom events only; missing = once). */
  recurrence?: CustomEventRecurrence
}

/**
 * How a custom event repeats: once on its date, every year on the same solar
 * day and month, or every year on the lunar day and month of its date.
 */
export const CUSTOM_EVENT_RECURRENCES = [
  'none',
  'yearly_solar',
  'yearly_lunar'
] as const
export type CustomEventRecurrence = (typeof CUSTOM_EVENT_RECURRENCES)[number]

/** A stored or imported value as a recurrence; anything else is 'none'. */
export function toRecurrence(value: unknown): CustomEventRecurrence {
  return CUSTOM_EVENT_RECURRENCES.includes(value as CustomEventRecurrence)
    ? (value as CustomEventRecurrence)
    : 'none'
}

/**
 * Default `event_date` (`YYYY-MM-DD`) of a new custom event: today in Vietnam,
 * like the rest of the dashboard, whatever the browser's time zone.
 */
export function defaultEventDate(now: Date = new Date()): string {
  return formatIsoDay(vnToday(now))
}

export interface CustomEventRecord {
  id: string
  name: string
  content: string | null
  event_date: string
  location: string | null
  created_by: string | null
  /** Missing on databases without the recurrence column (= 'none'). */
  recurrence?: CustomEventRecurrence | null
}

/**
 * Solar date in a year; a day the month does not have in that year (29/2 in a
 * common year) falls on the last day of the month (28/2).
 */
function solarDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, lastDay))
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * The latest occurrence before today, if it is less than 365 days ago: this
 * year's once it has passed, otherwise last year's (early January shows the
 * December birthdays and anniversaries just gone).
 */
function pastOccurrence(
  thisYear: Date | null,
  lastYear: Date | null,
  today: Date
): Date | null {
  const past = thisYear && thisYear < today ? thisYear : lastYear
  return past && past < today && daysBetween(today, past) > -365 ? past : null
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Local Date (midnight) on which a lunar anniversary falls in a lunar year. */
function anniversaryDate(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  leap: boolean
): Date | null {
  const s = lunarAnniversaryInYear(lunarYear, lunarMonth, lunarDay, leap)
  return s ? new Date(s.year, s.month - 1, s.day) : null
}

/**
 * Computes upcoming FamilyEvents from a list of persons.
 * - Birthdays use the solar birth_month / birth_day.
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death,
 *   from the lunar year after the death on (the first giỗ is a year later).
 * - Custom events fall on their date, or repeat every year from it on the
 *   same solar day/month (yearly_solar) or lunar day/month (yearly_lunar,
 *   leap month kept, like a giỗ).
 */
export function computeEvents(
  persons: {
    id: string
    full_name: string
    birth_year: number | null
    birth_month: number | null
    birth_day: number | null
    death_year: number | null
    death_month: number | null
    death_day: number | null
    death_lunar_year: number | null
    death_lunar_month: number | null
    death_lunar_day: number | null
    is_deceased: boolean
  }[],
  customEvents: CustomEventRecord[] = [],
  now: Date = vnToday()
): FamilyEvent[] {
  // `now` is a calendar day (year/month/day in local fields); the default is
  // today in Vietnam, the same day the lunar date on the page uses.
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const events: FamilyEvent[] = []

  for (const p of persons) {
    // ── Birthday (solar) ────────────────────────────────────────────
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear()
      const thisYearDate = solarDate(thisYear, p.birth_month, p.birth_day)
      const isUpcoming = thisYearDate >= today

      // Next occurrence (upcoming)
      const next = isUpcoming
        ? thisYearDate
        : solarDate(thisYear + 1, p.birth_month, p.birth_day)

      const daysUntil = daysBetween(today, next)

      const baseEvent: FamilyEvent = {
        personId: p.id,
        personName: p.full_name,
        type: 'birthday',
        nextOccurrence: next,
        daysUntil,
        eventDateLabel: `${p.birth_day.toString().padStart(2, '0')}/${p.birth_month.toString().padStart(2, '0')}`,
        originYear: p.birth_year || null,
        originMonth: p.birth_month,
        originDay: p.birth_day,
        isDeceased: p.is_deceased
      }
      events.push(baseEvent)

      // Latest past occurrence, this year's or last year's
      const past = pastOccurrence(
        thisYearDate,
        solarDate(thisYear - 1, p.birth_month, p.birth_day),
        today
      )
      if (past) {
        events.push({
          ...baseEvent,
          nextOccurrence: past,
          daysUntil: daysBetween(today, past)
        })
      }
    }

    // ── Death anniversary (lunar) ────────────────────────────────────
    if (
      p.is_deceased &&
      ((p.death_lunar_month && p.death_lunar_day) ||
        (p.death_month && p.death_day))
    ) {
      let lMonth: number
      let lDay: number
      let leap = false
      let approximate = false

      // The solar death date gives the leap-month flag, which is not stored.
      const lunarOfSolarDeath =
        p.death_year && p.death_month && p.death_day
          ? solarToLunar(p.death_year, p.death_month, p.death_day)
          : null

      if (p.death_lunar_month && p.death_lunar_day) {
        // Prefer exact lunar date from DB
        lMonth = p.death_lunar_month
        lDay = p.death_lunar_day
        leap =
          !!lunarOfSolarDeath?.leap &&
          lunarOfSolarDeath.month === lMonth &&
          lunarOfSolarDeath.day === lDay
      } else {
        // Fallback: convert the solar death date to a lunar date. Without a
        // death year this uses the current year, so it is only an estimate.
        approximate = !p.death_year
        const lunar =
          lunarOfSolarDeath ??
          solarToLunar(
            today.getFullYear(),
            p.death_month as number,
            p.death_day as number
          )
        if (!lunar) continue
        lMonth = lunar.month
        lDay = lunar.day
        leap = lunarOfSolarDeath?.leap ?? false
      }

      const currentLunarYear = solarToLunar(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      )?.year
      if (!currentLunarYear) continue

      // The first giỗ is in the lunar year after the death, so no
      // anniversary falls in the lunar year of death or before it. Without a
      // known death year every year is kept.
      const deathLunarYear =
        p.death_lunar_year ?? lunarOfSolarDeath?.year ?? null
      const anniversaryIn = (lunarYear: number) =>
        deathLunarYear !== null && lunarYear <= deathLunarYear
          ? null
          : anniversaryDate(lunarYear, lMonth, lDay, leap)

      // This lunar year's anniversary; once it has passed, the next one is
      // in the following lunar year and this one is listed as past.
      const thisYear = anniversaryIn(currentLunarYear)
      const nextYear = anniversaryIn(currentLunarYear + 1)
      const next = thisYear && thisYear >= today ? thisYear : nextYear
      if (!next) continue

      const daysUntil = daysBetween(today, next)

      const deathEvent: FamilyEvent = {
        personId: p.id,
        personName: p.full_name,
        type: 'death_anniversary',
        nextOccurrence: next,
        daysUntil,
        eventDateLabel: `${pad2(lDay)}/${pad2(lMonth)}`,
        lunarLabel: { day: lDay, month: lMonth, leap },
        // The lunar year of death: a January death is still the previous
        // lunar year, so the solar year would count one giỗ too many.
        originYear:
          (p.death_lunar_year ?? lunarOfSolarDeath?.year ?? p.death_year) ||
          null,
        originMonth: p.death_lunar_month ?? p.death_month,
        originDay: p.death_lunar_day ?? p.death_day,
        ...(approximate ? { approximate } : {}),
        isDeceased: p.is_deceased
      }
      events.push(deathEvent)

      const past = pastOccurrence(
        thisYear,
        anniversaryIn(currentLunarYear - 1),
        today
      )
      if (past) {
        events.push({
          ...deathEvent,
          nextOccurrence: past,
          daysUntil: daysBetween(today, past)
        })
      }
    }
  }

  // ── Custom Events ───────────────────────────────────────────────
  for (const ce of customEvents) {
    if (!ce.event_date) continue
    const [y, m, d] = ce.event_date.split('-').map(Number)
    if (!y || !m || !d) continue

    const start = new Date(y, m - 1, d)
    const recurrence = toRecurrence(ce.recurrence)
    const base = {
      personId: ce.id, // using event id here
      personName: ce.name, // mapping custom event name to personName
      type: 'custom_event' as const,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content,
      recurrence
    }
    // The lunar day and month (and leap flag) of the first occurrence.
    const lunar = recurrence === 'yearly_lunar' ? solarToLunar(y, m, d) : null
    if (recurrence === 'yearly_lunar' && !lunar) continue
    const occurrence = (date: Date, eventDateLabel: string): FamilyEvent => ({
      ...(lunar
        ? {
            lunarLabel: { day: lunar.day, month: lunar.month, leap: lunar.leap }
          }
        : {}),
      ...base,
      nextOccurrence: date,
      daysUntil: daysBetween(today, date),
      eventDateLabel
    })
    const label = lunar
      ? `${pad2(lunar.day)}/${pad2(lunar.month)}`
      : recurrence === 'yearly_solar'
        ? `${pad2(d)}/${pad2(m)}`
        : `${pad2(d)}/${pad2(m)}/${y}`

    // A repeating event starts on its own date: before that it is shown once.
    if (recurrence === 'none' || start >= today) {
      events.push(occurrence(start, label))
      continue
    }

    let thisYear: Date | null
    let nextYear: Date | null
    let lastYear: Date | null
    if (lunar) {
      const currentLunarYear = solarToLunar(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      )?.year
      if (!currentLunarYear) continue
      thisYear = anniversaryDate(
        currentLunarYear,
        lunar.month,
        lunar.day,
        lunar.leap
      )
      nextYear = anniversaryDate(
        currentLunarYear + 1,
        lunar.month,
        lunar.day,
        lunar.leap
      )
      lastYear = anniversaryDate(
        currentLunarYear - 1,
        lunar.month,
        lunar.day,
        lunar.leap
      )
    } else {
      const year = today.getFullYear()
      thisYear = solarDate(year, m, d)
      nextYear = solarDate(year + 1, m, d)
      lastYear = solarDate(year - 1, m, d)
    }

    const next = thisYear && thisYear >= today ? thisYear : nextYear
    if (next) events.push(occurrence(next, label))
    const past = pastOccurrence(thisYear, lastYear, today)
    if (past && past >= start) events.push(occurrence(past, label))
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil)
  return events
}

/**
 * Hides the birthdays of deceased people unless `showDeceasedBirthdays` is
 * set. Death anniversaries and custom events are never affected.
 */
export function filterVisibleEvents<
  T extends Pick<FamilyEvent, 'type' | 'isDeceased'>
>(events: T[], options: { showDeceasedBirthdays?: boolean } = {}): T[] {
  if (options.showDeceasedBirthdays) return events
  return events.filter((e) => !(e.type === 'birthday' && e.isDeceased))
}

/**
 * Days ahead the upcoming tabs look. A lunar year with a leap month has 383–385
 * days, so the next death anniversary can be more than 365 days away; every
 * yearly event's next occurrence fits in this window.
 */
export const UPCOMING_WINDOW_DAYS = 400

/** Events of the upcoming tabs: from today until the next occurrence. */
export function isUpcomingEvent(
  event: Pick<FamilyEvent, 'daysUntil'>
): boolean {
  return event.daysUntil >= 0 && event.daysUntil <= UPCOMING_WINDOW_DAYS
}

/**
 * Date label of an event in the interface language. Lunar dates carry the
 * lunar marker and the leap-month word ("10/04 ÂL nhuận" / "10/04 L leap");
 * with `withMarker` false only the leap word is kept, for text that already
 * says the date is lunar.
 */
export function formatLunarDateLabel(
  event: Pick<FamilyEvent, 'eventDateLabel' | 'lunarLabel'>,
  t: Translate,
  withMarker = true
): string {
  const lunar = event.lunarLabel
  if (!lunar) return event.eventDateLabel
  return (
    `${pad2(lunar.day)}/${pad2(lunar.month)}` +
    (withMarker ? t('lunarSuffix') : '') +
    (lunar.leap ? t('leapMonth') : '')
  )
}

/** Where an event card links: the member's profile, or the events page for custom events. */
export function eventHref(
  event: Pick<FamilyEvent, 'type' | 'personId'>
): string {
  if (event.type === 'custom_event' || !event.personId)
    return '/dashboard/events'
  return `/dashboard/members/${event.personId}`
}
