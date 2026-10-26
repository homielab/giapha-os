'use client'

import { useState } from 'react'

import {
  DeathDateValues,
  lunarToSolarSafe,
  nextLeapFlag,
  solarToLunarSafe
} from '@/utils/memberFormHelpers'

export interface DeathDateState {
  deathDay: number | ''
  deathMonth: number | ''
  deathYear: number | ''
  deathLunarDay: number | ''
  deathLunarMonth: number | ''
  deathLunarYear: number | ''
  // Only used to convert lunar -> solar; not stored.
  deathLunarLeap: boolean
  setLunarLeap: (leap: boolean) => void
  setSolarField: (field: 'day' | 'month' | 'year', value: number | '') => void
  setLunarField: (field: 'day' | 'month' | 'year', value: number | '') => void
  clearAll: () => void
  currentValues: DeathDateValues
}

// Owns the six death-date inputs. Editing the solar triple auto-fills the
// lunar triple (and vice versa) once all three fields are plausible.
export function useDeathDates(initial: {
  day: number | ''
  month: number | ''
  year: number | ''
  lunarDay: number | ''
  lunarMonth: number | ''
  lunarYear: number | ''
}): DeathDateState {
  const [deathDay, setDeathDay] = useState(initial.day)
  const [deathMonth, setDeathMonth] = useState(initial.month)
  const [deathYear, setDeathYear] = useState(initial.year)
  const [deathLunarDay, setDeathLunarDay] = useState(initial.lunarDay)
  const [deathLunarMonth, setDeathLunarMonth] = useState(initial.lunarMonth)
  const [deathLunarYear, setDeathLunarYear] = useState(initial.lunarYear)
  // The database keeps only the month number, so the leap flag is read back
  // from the saved solar date when it still matches the saved lunar month.
  const [deathLunarLeap, setDeathLunarLeap] = useState(() => {
    const lunar = solarToLunarSafe(initial.day, initial.month, initial.year)
    return Boolean(
      lunar?.leap &&
      lunar.month === initial.lunarMonth &&
      lunar.year === initial.lunarYear
    )
  })

  const setSolarField = (
    field: 'day' | 'month' | 'year',
    value: number | ''
  ) => {
    const next = {
      day: field === 'day' ? value : deathDay,
      month: field === 'month' ? value : deathMonth,
      year: field === 'year' ? value : deathYear
    }
    if (field === 'day') setDeathDay(value)
    else if (field === 'month') setDeathMonth(value)
    else setDeathYear(value)

    const lunar = solarToLunarSafe(next.day, next.month, next.year)
    if (lunar) {
      setDeathLunarDay(lunar.day)
      setDeathLunarMonth(lunar.month)
      setDeathLunarYear(lunar.year)
      setDeathLunarLeap(lunar.leap)
    }
  }

  const setLunarField = (
    field: 'day' | 'month' | 'year',
    value: number | ''
  ) => {
    const next = {
      day: field === 'day' ? value : deathLunarDay,
      month: field === 'month' ? value : deathLunarMonth,
      year: field === 'year' ? value : deathLunarYear
    }
    if (field === 'day') setDeathLunarDay(value)
    else if (field === 'month') setDeathLunarMonth(value)
    else setDeathLunarYear(value)

    const leap = nextLeapFlag(
      { month: deathLunarMonth, year: deathLunarYear, leap: deathLunarLeap },
      next
    )
    setDeathLunarLeap(leap)
    const solar = lunarToSolarSafe(next.day, next.month, next.year, leap)
    if (solar) {
      setDeathDay(solar.day)
      setDeathMonth(solar.month)
      setDeathYear(solar.year)
    }
  }

  const setLunarLeap = (leap: boolean) => {
    setDeathLunarLeap(leap)
    const solar = lunarToSolarSafe(
      deathLunarDay,
      deathLunarMonth,
      deathLunarYear,
      leap
    )
    if (solar) {
      setDeathDay(solar.day)
      setDeathMonth(solar.month)
      setDeathYear(solar.year)
    }
  }

  const clearAll = () => {
    setDeathDay('')
    setDeathMonth('')
    setDeathYear('')
    setDeathLunarDay('')
    setDeathLunarMonth('')
    setDeathLunarYear('')
    setDeathLunarLeap(false)
  }

  return {
    deathDay,
    deathMonth,
    deathYear,
    deathLunarDay,
    deathLunarMonth,
    deathLunarYear,
    deathLunarLeap,
    setLunarLeap,
    setSolarField,
    setLunarField,
    clearAll,
    currentValues: {
      day: deathDay,
      month: deathMonth,
      year: deathYear,
      lunarDay: deathLunarDay,
      lunarMonth: deathLunarMonth,
      lunarYear: deathLunarYear
    }
  }
}
