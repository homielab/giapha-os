'use client'

import { useState } from 'react'

import {
  applyLeapToggle,
  applyLunarEdit,
  applySolarEdit,
  DateField,
  DatePart,
  emptyDeathDates,
  initialDeathDates
} from '@/utils/deathDates'
import { DeathDateValues } from '@/utils/memberFormHelpers'

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
  const [state, setState] = useState(() => initialDeathDates(initial))

  const setSolarField = (field: DateField, value: DatePart) =>
    setState((prev) => applySolarEdit(prev, field, value))
  const setLunarField = (field: DateField, value: DatePart) =>
    setState((prev) => applyLunarEdit(prev, field, value))
  const setLunarLeap = (leap: boolean) =>
    setState((prev) => applyLeapToggle(prev, leap))
  const clearAll = () => setState(emptyDeathDates())

  return {
    deathDay: state.day,
    deathMonth: state.month,
    deathYear: state.year,
    deathLunarDay: state.lunarDay,
    deathLunarMonth: state.lunarMonth,
    deathLunarYear: state.lunarYear,
    deathLunarLeap: state.lunarLeap,
    setLunarLeap,
    setSolarField,
    setLunarField,
    clearAll,
    currentValues: {
      day: state.day,
      month: state.month,
      year: state.year,
      lunarDay: state.lunarDay,
      lunarMonth: state.lunarMonth,
      lunarYear: state.lunarYear
    }
  }
}
