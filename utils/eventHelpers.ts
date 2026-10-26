import { lunarAnniversaryInYear, solarToLunar } from '@/utils/lunarCalendar'

export type EventType = 'birthday' | 'death_anniversary' | 'custom_event'

export interface FamilyEvent {
  personId: string | null
  personName: string
  type: EventType
  /** Solar date of the next occurrence */
  nextOccurrence: Date
  /** Days until the next occurrence (negative = already passed this year, shown for context) */
  daysUntil: number
  /** Display label for the date of the event (e.g., "12/03" solar or "05/02 ÂL") */
  eventDateLabel: string
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null
  originMonth?: number | null
  originDay?: number | null
  /** Whether the person is deceased */
  isDeceased: boolean
  /** Optional location for the event */
  location?: string | null
  /** Optional content/description for the event */
  content?: string | null
}

export interface CustomEventRecord {
  id: string
  name: string
  content: string | null
  event_date: string
  location: string | null
  created_by: string | null
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
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death.
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
  now: Date = new Date()
): FamilyEvent[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const events: FamilyEvent[] = []

  for (const p of persons) {
    // ── Birthday (solar) ────────────────────────────────────────────
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear()
      const thisYearDate = new Date(thisYear, p.birth_month - 1, p.birth_day)
      const isUpcoming = thisYearDate >= today

      // Next occurrence (upcoming)
      const next = isUpcoming
        ? thisYearDate
        : new Date(thisYear + 1, p.birth_month - 1, p.birth_day)

      const daysUntil = Math.round(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

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

      // Past occurrence (already happened this year)
      if (!isUpcoming) {
        const pastDaysUntil = Math.round(
          (thisYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        events.push({
          ...baseEvent,
          nextOccurrence: thisYearDate,
          daysUntil: pastDaysUntil
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
        // Fallback: Convert the solar death date to a lunar date
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

      // This lunar year's anniversary; once it has passed, the next one is
      // in the following lunar year and this one is listed as past.
      const thisYear = anniversaryDate(currentLunarYear, lMonth, lDay, leap)
      const nextYear = anniversaryDate(currentLunarYear + 1, lMonth, lDay, leap)
      const next = thisYear && thisYear >= today ? thisYear : nextYear
      if (!next) continue

      const daysUntil = Math.round(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      const deathEvent: FamilyEvent = {
        personId: p.id,
        personName: p.full_name,
        type: 'death_anniversary',
        nextOccurrence: next,
        daysUntil,
        eventDateLabel: `${lDay.toString().padStart(2, '0')}/${lMonth.toString().padStart(2, '0')} ÂL`,
        originYear: (p.death_lunar_year ?? p.death_year) || null,
        originMonth: p.death_lunar_month ?? p.death_month,
        originDay: p.death_lunar_day ?? p.death_day,
        isDeceased: p.is_deceased
      }
      events.push(deathEvent)

      if (thisYear && thisYear < today) {
        events.push({
          ...deathEvent,
          nextOccurrence: thisYear,
          daysUntil: Math.round(
            (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )
        })
      }
    }
  }

  // ── Custom Events (solar) ───────────────────────────────────────
  for (const ce of customEvents) {
    if (!ce.event_date) continue
    const [y, m, d] = ce.event_date.split('-').map(Number)
    if (!y || !m || !d) continue

    const next = new Date(y, m - 1, d)
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    events.push({
      personId: ce.id, // using event id here
      personName: ce.name, // mapping custom event name to personName
      type: 'custom_event',
      nextOccurrence: next,
      daysUntil,
      eventDateLabel: `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content
    })
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil)
  return events
}
