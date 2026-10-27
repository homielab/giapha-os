import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { FamilyEvent, formatLunarDateLabel } from '@/utils/eventHelpers'
import { solarToLunar } from '@/utils/lunarCalendar'

const SPECIAL_DAY_OFFSETS = new Set([-1, 0, 1])

export function daysUntilLabel(
  days: number,
  t: (key: TranslationKey, values?: TranslationValues) => string
): string {
  if (SPECIAL_DAY_OFFSETS.has(days)) {
    return t(days === -1 ? 'yesterday' : days === 0 ? 'today' : 'tomorrow')
  }
  if (days < 0) {
    const abs = Math.abs(days)
    if (abs <= 30) return t('daysAgo', { count: abs })
    if (abs <= 60) return t('weeksAgo', { count: Math.ceil(abs / 7) })
    return t('monthsAgo', { count: Math.ceil(abs / 30) })
  }
  if (days <= 30) return t('daysFromNow', { count: days })
  if (days <= 60) return t('weeksFromNow', { count: Math.ceil(days / 7) })
  return t('monthsFromNow', { count: Math.ceil(days / 30) })
}

type Translate = (key: TranslationKey, values?: TranslationValues) => string

export function formatEventDateLabel(event: FamilyEvent, t: Translate): string {
  const weekdays = [
    t('weekdaySunday'),
    t('weekdayMonday'),
    t('weekdayTuesday'),
    t('weekdayWednesday'),
    t('weekdayThursday'),
    t('weekdayFriday'),
    t('weekdaySaturday')
  ]
  const d = event.nextOccurrence
  const dayOfWeek = weekdays[d.getDay()]
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  let label = t(
    event.type === 'custom_event' ? 'calendarDateWithYear' : 'calendarDate',
    { weekday: dayOfWeek, day, month, year }
  )
  if (
    event.type === 'death_anniversary' ||
    (event.type === 'custom_event' && event.recurrence === 'yearly_lunar')
  ) {
    label += t('lunarDateSuffix', {
      date: formatLunarDateLabel(event, t, false)
    })
  }
  if (event.approximate) label += t('approximateDateSuffix')
  if (event.recurrence && event.recurrence !== 'none') {
    label += t('recurringYearlySuffix')
  }
  return label
}

export function getEventYearsInfo(
  event: FamilyEvent,
  isBirthday: boolean,
  t: Translate
): string | null {
  if (!event.originYear) return null
  // Count to the year of the occurrence shown, not to the current year: an
  // event in early January is the next year's. Anniversaries use the lunar
  // year (a 12th-month anniversary in January still belongs to the old year).
  const d = event.nextOccurrence
  const isAnniversary = event.type === 'death_anniversary'
  const year = isAnniversary
    ? solarToLunar(d.getFullYear(), d.getMonth() + 1, d.getDate())?.year
    : d.getFullYear()
  if (!year) return null
  const diff = year - event.originYear
  if (diff <= 0) return null
  if (isBirthday) return t('yearsOld', { count: diff })
  if (event.type === 'death_anniversary')
    return t('yearsSince', { count: diff })
  return null
}
