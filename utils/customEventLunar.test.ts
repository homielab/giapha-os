import { describe, expect, test } from 'bun:test'

import { resolveLunarEventDate } from '@/utils/customEventLunar'

const lunar = (
  day: number | '',
  month: number | '',
  year: number | '',
  leap = false
) => resolveLunarEventDate({ day, month, year, leap })

describe('resolveLunarEventDate', () => {
  test('a missing day, month or year is incomplete', () => {
    expect(lunar('', 2, 2025).status).toBe('incomplete')
    expect(lunar(15, '', 2025).status).toBe('incomplete')
    expect(lunar(15, 2, '').status).toBe('incomplete')
  })

  test('a year still being typed is incomplete', () => {
    expect(lunar(15, 2, 20).status).toBe('incomplete')
  })

  test('a day that does not exist in the month is invalid', () => {
    // Lunar month 2 of 2025 has 29 days.
    expect(lunar(30, 2, 2025)).toEqual({ status: 'invalid' })
    expect(lunar(0, 2, 2025)).toEqual({ status: 'invalid' })
    expect(lunar(31, 1, 2025)).toEqual({ status: 'invalid' })
    expect(lunar(1, 13, 2025)).toEqual({ status: 'invalid' })
    expect(lunar(1.5, 2, 2025)).toEqual({ status: 'invalid' })
  })

  test('a valid date gives the solar date', () => {
    expect(lunar(1, 1, 2025)).toEqual({ status: 'ok', date: '2025-01-29' })
  })

  test('the leap month differs from the regular month of the same number', () => {
    expect(lunar(15, 6, 2025)).toEqual({ status: 'ok', date: '2025-07-09' })
    expect(lunar(15, 6, 2025, true)).toEqual({
      status: 'ok',
      date: '2025-08-08'
    })
  })

  test('the leap flag is ignored when the year has no such leap month', () => {
    expect(lunar(15, 5, 2025, true)).toEqual(lunar(15, 5, 2025))
    expect(lunar(15, 6, 2026, true)).toEqual(lunar(15, 6, 2026))
  })
})
