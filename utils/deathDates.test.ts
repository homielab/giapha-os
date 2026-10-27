import { describe, expect, test } from 'bun:test'

import {
  applyLeapToggle,
  applyLunarEdit,
  applySolarEdit,
  DeathDateFields,
  emptyDeathDates,
  initialDeathDates
} from '@/utils/deathDates'

// 2023 has a leap month 2: 22/3/2023 = 1/2 (leap) and 21/3/2023 = 30/2.
const leapDay1: DeathDateFields = {
  day: 22,
  month: 3,
  year: 2023,
  lunarDay: 1,
  lunarMonth: 2,
  lunarYear: 2023,
  lunarLeap: true
}

describe('initialDeathDates', () => {
  test('reads the leap flag back from the saved solar date', () => {
    expect(
      initialDeathDates({
        day: 22,
        month: 3,
        year: 2023,
        lunarDay: 1,
        lunarMonth: 2,
        lunarYear: 2023
      })
    ).toEqual(leapDay1)
  })

  test('no leap flag when the saved lunar month does not match', () => {
    const s = initialDeathDates({
      day: 22,
      month: 3,
      year: 2023,
      lunarDay: 1,
      lunarMonth: 3,
      lunarYear: 2023
    })
    expect(s.lunarLeap).toBe(false)
  })

  test('no leap flag for a regular month or an empty date', () => {
    expect(
      initialDeathDates({
        day: 21,
        month: 3,
        year: 2023,
        lunarDay: 30,
        lunarMonth: 2,
        lunarYear: 2023
      }).lunarLeap
    ).toBe(false)
    expect(initialDeathDates(emptyDeathDates())).toEqual(emptyDeathDates())
  })
})

describe('applySolarEdit', () => {
  test('fills the lunar date and leap flag once the triple is complete', () => {
    let s = emptyDeathDates()
    s = applySolarEdit(s, 'year', 2023)
    s = applySolarEdit(s, 'month', 3)
    expect(s.lunarDay).toBe('')
    s = applySolarEdit(s, 'day', 22)
    expect(s).toEqual(leapDay1)
  })

  test('clears the leap flag when the new solar date is not a leap day', () => {
    const s = applySolarEdit(leapDay1, 'day', 21)
    expect(s.lunarDay).toBe(30)
    expect(s.lunarMonth).toBe(2)
    expect(s.lunarLeap).toBe(false)
  })

  test('clearing a field keeps the previous lunar date', () => {
    const s = applySolarEdit(leapDay1, 'day', '')
    expect(s.day).toBe('')
    expect(s.lunarDay).toBe(1)
    expect(s.lunarMonth).toBe(2)
    expect(s.lunarLeap).toBe(true)
  })

  test('an impossible date or a year <= 100 leaves the lunar side alone', () => {
    expect(applySolarEdit(leapDay1, 'day', 32)).toEqual({
      ...leapDay1,
      day: 32
    })
    expect(applySolarEdit(leapDay1, 'year', 100)).toEqual({
      ...leapDay1,
      year: 100
    })
  })

  test('does not mutate the input', () => {
    const copy = { ...leapDay1 }
    applySolarEdit(leapDay1, 'day', 21)
    expect(leapDay1).toEqual(copy)
  })
})

describe('applyLunarEdit', () => {
  test('keeps the leap flag when only the day changes in the leap month', () => {
    const s = applyLunarEdit(leapDay1, 'day', 2)
    expect(s.lunarLeap).toBe(true)
    expect([s.day, s.month, s.year]).toEqual([23, 3, 2023])
  })

  test('resets the flag when the month changes', () => {
    const s = applyLunarEdit(leapDay1, 'month', 3)
    expect(s.lunarLeap).toBe(false)
    expect([s.day, s.month, s.year]).toEqual([20, 4, 2023])
  })

  test('resets the flag when the year changes', () => {
    const s = applyLunarEdit(leapDay1, 'year', 2024)
    expect(s.lunarLeap).toBe(false)
    expect([s.day, s.month, s.year]).toEqual([10, 3, 2024])
  })

  test('resets the flag when the year has no such leap month', () => {
    const s = applyLunarEdit(
      { ...leapDay1, lunarYear: 2022, lunarLeap: true },
      'day',
      5
    )
    expect(s.lunarLeap).toBe(false)
  })

  test('day 30 of a 29-day month has no solar date: solar side unchanged', () => {
    const s = applyLunarEdit(
      { ...leapDay1, lunarMonth: 1, lunarLeap: false },
      'day',
      30
    )
    expect(s.lunarDay).toBe(30)
    expect([s.day, s.month, s.year]).toEqual([22, 3, 2023])
  })

  test('day 30 of a regular month 2 converts, but not as a leap month', () => {
    const regular = applyLunarEdit({ ...leapDay1, lunarLeap: false }, 'day', 30)
    expect([regular.day, regular.month, regular.year]).toEqual([21, 3, 2023])
    // Leap month 2 of 2023 has 29 days.
    const leap = applyLunarEdit(leapDay1, 'day', 30)
    expect(leap.lunarLeap).toBe(true)
    expect([leap.day, leap.month, leap.year]).toEqual([22, 3, 2023])
  })

  test('clearing a field clears the flag and keeps the solar date', () => {
    const s = applyLunarEdit(leapDay1, 'month', '')
    expect(s.lunarMonth).toBe('')
    expect(s.lunarLeap).toBe(false)
    expect([s.day, s.month, s.year]).toEqual([22, 3, 2023])
  })

  test('filling a lunar date from scratch fills the solar date', () => {
    let s = emptyDeathDates()
    s = applyLunarEdit(s, 'year', 2023)
    s = applyLunarEdit(s, 'month', 4)
    expect(s.day).toBe('')
    s = applyLunarEdit(s, 'day', 30)
    expect([s.day, s.month, s.year]).toEqual([17, 6, 2023])
    expect(s.lunarLeap).toBe(false)
  })
})

describe('applyLeapToggle', () => {
  test('turning the flag on moves the solar date to the leap month', () => {
    const s = applyLeapToggle({ ...leapDay1, lunarLeap: false, day: 21 }, true)
    expect(s.lunarLeap).toBe(true)
    expect([s.day, s.month, s.year]).toEqual([22, 3, 2023])
  })

  test('turning it off moves the solar date to the regular month', () => {
    const s = applyLeapToggle(leapDay1, false)
    expect(s.lunarLeap).toBe(false)
    expect([s.day, s.month, s.year]).toEqual([20, 2, 2023])
  })

  test('a leap month that does not exist keeps the solar date', () => {
    const base = { ...leapDay1, lunarMonth: 5, lunarLeap: false }
    const s = applyLeapToggle(base, true)
    expect(s.lunarLeap).toBe(true)
    expect([s.day, s.month, s.year]).toEqual([22, 3, 2023])
  })
})
