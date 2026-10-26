import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { vnToday } from '@/utils/dateHelpers'
import { FamilyEvent } from '@/utils/eventHelpers'

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
  if (event.type === 'death_anniversary') {
    label += t('lunarDateSuffix', {
      date: event.eventDateLabel.replace(' ÂL', '').replace(' L', '')
    })
  }
  if (event.approximate) label += t('approximateDateSuffix')
  return label
}

export function getEventYearsInfo(
  event: FamilyEvent,
  isBirthday: boolean,
  t: Translate
): string | null {
  if (!event.originYear) return null
  const now = vnToday().getFullYear()
  const diff = now - event.originYear
  if (diff <= 0) return null
  if (isBirthday) return t('yearsOld', { count: diff })
  if (event.type === 'death_anniversary')
    return t('yearsSince', { count: diff })
  return null
}
