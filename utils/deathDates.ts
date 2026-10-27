import {
  lunarToSolarSafe,
  nextLeapFlag,
  solarToLunarSafe
} from '@/utils/memberFormHelpers'

export type DatePart = number | ''

export interface DeathDateFields {
  day: DatePart
  month: DatePart
  year: DatePart
  lunarDay: DatePart
  lunarMonth: DatePart
  lunarYear: DatePart
  // Only used to convert lunar -> solar; not stored.
  lunarLeap: boolean
}

export type DateField = 'day' | 'month' | 'year'

export function emptyDeathDates(): DeathDateFields {
  return {
    day: '',
    month: '',
    year: '',
    lunarDay: '',
    lunarMonth: '',
    lunarYear: '',
    lunarLeap: false
  }
}

// The database keeps only the month number, so the leap flag is read back
// from the saved solar date when it still matches the saved lunar month.
export function initialDeathDates(initial: {
  day: DatePart
  month: DatePart
  year: DatePart
  lunarDay: DatePart
  lunarMonth: DatePart
  lunarYear: DatePart
}): DeathDateFields {
  const lunar = solarToLunarSafe(initial.day, initial.month, initial.year)
  return {
    ...initial,
    lunarLeap: Boolean(
      lunar?.leap &&
      lunar.month === initial.lunarMonth &&
      lunar.year === initial.lunarYear
    )
  }
}

// Editing the solar triple fills the lunar triple once it is convertible;
// otherwise the lunar side is left as it was.
export function applySolarEdit(
  state: DeathDateFields,
  field: DateField,
  value: DatePart
): DeathDateFields {
  const next = { ...state, [field]: value }
  const lunar = solarToLunarSafe(next.day, next.month, next.year)
  if (!lunar) return next
  return {
    ...next,
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    lunarLeap: lunar.leap
  }
}

function withSolarFromLunar(state: DeathDateFields): DeathDateFields {
  const solar = lunarToSolarSafe(
    state.lunarDay,
    state.lunarMonth,
    state.lunarYear,
    state.lunarLeap
  )
  if (!solar) return state
  return { ...state, day: solar.day, month: solar.month, year: solar.year }
}

// Editing the lunar triple keeps the leap flag only while month and year are
// unchanged and that year really has the leap month, then fills the solar side.
export function applyLunarEdit(
  state: DeathDateFields,
  field: DateField,
  value: DatePart
): DeathDateFields {
  const key = (
    { day: 'lunarDay', month: 'lunarMonth', year: 'lunarYear' } as const
  )[field]
  const next = { ...state, [key]: value }
  const lunarLeap = nextLeapFlag(
    { month: state.lunarMonth, year: state.lunarYear, leap: state.lunarLeap },
    { month: next.lunarMonth, year: next.lunarYear }
  )
  return withSolarFromLunar({ ...next, lunarLeap })
}

export function applyLeapToggle(
  state: DeathDateFields,
  leap: boolean
): DeathDateFields {
  return withSolarFromLunar({ ...state, lunarLeap: leap })
}
