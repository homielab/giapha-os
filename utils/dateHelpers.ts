import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import {
  lunarToSolar,
  lunarYearName,
  solarToLunar
} from '@/utils/lunarCalendar'

export type Translate = (
  key: TranslationKey,
  values?: TranslationValues
) => string

export function formatDisplayDate(
  year: number | null,
  month: number | null,
  day: number | null,
  t: Translate
): string {
  // A day without its month (older data) would read as a month: drop it.
  if (day && !month) day = null
  if (!year && !month && !day) return t('unknownDate')

  const parts = []
  if (day) parts.push(day.toString().padStart(2, '0'))
  if (month) parts.push(month.toString().padStart(2, '0'))
  if (year) parts.push(year.toString())

  return parts.join('/')
}

export function getLunarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
  t: Translate
): string | null {
  if (!year || !month || !day) return null

  const lunar = solarToLunar(
    year,
    parseInt(month.toString()),
    parseInt(day.toString())
  )
  if (!lunar) return null

  const lDay = lunar.day.toString().padStart(2, '0')
  const lMonth = lunar.month.toString().padStart(2, '0')
  return `${lDay}/${lMonth}${lunar.leap ? t('leapMonth') : ''}/${lunar.year}`
}

export function getSolarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
  t: Translate
): string | null {
  if (!year || !month || !day) return t('unknownDate')

  const solar = lunarToSolar(
    year,
    parseInt(month.toString()),
    parseInt(day.toString())
  )
  if (!solar) return null

  const sDay = solar.day.toString().padStart(2, '0')
  const sMonth = solar.month.toString().padStart(2, '0')
  return `${sDay}/${sMonth}/${solar.year}`
}

export function calculateAge(
  birthYear: number | null,
  birthMonth: number | null,
  birthDay: number | null,
  deathYear: number | null,
  deathMonth: number | null,
  deathDay: number | null,
  isDeceased: boolean = false,
  now: Date = new Date(),
  deathLunar?: {
    year: number | null
    month: number | null
    day: number | null
  } | null
): { age: number; isDeceased: boolean } | null {
  if (!birthYear) return null

  if (!deathYear && deathLunar?.year) {
    // Only a lunar death date: convert it so the age still shows.
    const solar =
      deathLunar.month && deathLunar.day
        ? lunarToSolar(deathLunar.year, deathLunar.month, deathLunar.day)
        : null
    if (solar) {
      deathYear = solar.year
      deathMonth = solar.month
      deathDay = solar.day
    } else {
      // Lunar year N mostly falls in solar year N; month/day unknown.
      deathYear = deathLunar.year
      deathMonth = null
      deathDay = null
    }
  }

  if (isDeceased || deathYear) {
    if (deathYear) {
      let age = deathYear - birthYear
      if (birthMonth && birthDay && deathMonth && deathDay) {
        if (
          deathMonth < birthMonth ||
          (deathMonth === birthMonth && deathDay < birthDay)
        ) {
          age--
        }
      }
      return age < 0 ? null : { age, isDeceased: true }
    }
    return null
  }

  const vnDate = vnToday(now)
  const currentYear = vnDate.getFullYear()

  let age = currentYear - birthYear

  if (birthMonth && birthDay) {
    const currentMonth = vnDate.getMonth() + 1
    const currentDay = vnDate.getDate()
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age--
    }
  }

  return age < 0 ? null : { age, isDeceased: false }
}

// Returns a translation key (zodiacAries …); the caller translates it.
export function getZodiacSign(
  day: number | null,
  month: number | null
): TranslationKey | null {
  if (!day || !month) return null
  const d = day
  const m = month

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'zodiacAries'
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'zodiacTaurus'
  if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return 'zodiacGemini'
  if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return 'zodiacCancer'
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'zodiacLeo'
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'zodiacVirgo'
  if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return 'zodiacLibra'
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return 'zodiacScorpio'
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'zodiacSagittarius'
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'zodiacCapricorn'
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'zodiacAquarius'
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'zodiacPisces'

  return null
}

// Returns a translation key (animalRat …); the caller translates it.
export function getZodiacAnimal(
  year: number | null,
  month: number | null = null,
  day: number | null = null
): TranslationKey | null {
  if (!year) return null
  const animals = [
    'animalMonkey',
    'animalRooster',
    'animalDog',
    'animalPig',
    'animalRat',
    'animalOx',
    'animalTiger',
    'animalCat',
    'animalDragon',
    'animalSnake',
    'animalHorse',
    'animalGoat'
  ] as const

  let targetYear = year

  if (month && day) {
    const lunar = solarToLunar(
      year,
      parseInt(month.toString()),
      parseInt(day.toString())
    )
    if (lunar) targetYear = lunar.year
  }

  return animals[targetYear % 12]
}

const WEEKDAY_KEYS = [
  'weekdaySunday',
  'weekdayMonday',
  'weekdayTuesday',
  'weekdayWednesday',
  'weekdayThursday',
  'weekdayFriday',
  'weekdaySaturday'
] as const

/**
 * Today's calendar date in Vietnam (Asia/Ho_Chi_Minh) as a Date at local
 * midnight, so it can be compared with other dates built from year/month/day.
 * The server (UTC on Vercel) and the browser (any zone) then agree on "today".
 */
export function vnToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(now)
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  return new Date(get('year'), get('month') - 1, get('day'))
}

/** `YYYY-MM-DD` of the Vietnamese calendar day (default: today), for file names. */
export function formatIsoDay(date: Date = vnToday()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get today's solar and lunar date info for display.
 */
export function getTodayLunar(t: Translate, now: Date = new Date()) {
  const vnDate = vnToday(now)

  const lunar = solarToLunar(
    vnDate.getFullYear(),
    vnDate.getMonth() + 1,
    vnDate.getDate()
  )!

  return {
    solarStr: t('todaySolarDate', {
      weekday: t(WEEKDAY_KEYS[vnDate.getDay()]),
      day: vnDate.getDate(),
      month: vnDate.getMonth() + 1,
      year: vnDate.getFullYear()
    }),
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunarYearName(lunar.year),
    lunarDayStr:
      t('lunarDayMonth', { day: lunar.day, month: lunar.month }) +
      (lunar.leap ? t('leapMonth') : '')
  }
}
