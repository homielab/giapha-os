import { describe, expect, test } from 'bun:test'

import { solarToLunar } from './lunarCalendar'
import {
  findLunarMismatches,
  MAX_RECOMPUTE_IDS,
  parseRecomputeIds,
  recomputeLunarDeathDate,
  type LunarRecomputeSource
} from './lunarRecompute'

function person(
  id: string,
  solar: [number, number, number] | null,
  lunar: [number, number, number] | null
): LunarRecomputeSource {
  return {
    id,
    full_name: `Person ${id}`,
    death_year: solar?.[0] ?? null,
    death_month: solar?.[1] ?? null,
    death_day: solar?.[2] ?? null,
    death_lunar_year: lunar?.[0] ?? null,
    death_lunar_month: lunar?.[1] ?? null,
    death_lunar_day: lunar?.[2] ?? null
  }
}

describe('recomputeLunarDeathDate', () => {
  test('a date saved with the Chinese calendar is a day off on Tết 2007', () => {
    // 17/02/2007 is Tết in Vietnam; the Chinese calendar still has 30/12/2006.
    const row = recomputeLunarDeathDate(
      person('a', [2007, 2, 17], [2006, 12, 30])
    )
    expect(row).toEqual({
      id: 'a',
      fullName: 'Person a',
      solar: { year: 2007, month: 2, day: 17 },
      stored: { year: 2006, month: 12, day: 30 },
      recomputed: { year: 2007, month: 1, day: 1, leap: false }
    })
  })

  test('a matching date needs no change', () => {
    expect(
      recomputeLunarDeathDate(person('b', [2024, 2, 10], [2024, 1, 1]))
    ).toBeNull()
  })

  test('a leap-month date matches on the month number', () => {
    // 2023 has a leap 2nd month; the database keeps no leap flag.
    const lunar = solarToLunar(2023, 4, 10)
    expect(lunar?.leap).toBe(true)
    expect(
      recomputeLunarDeathDate(
        person('c', [2023, 4, 10], [lunar!.year, lunar!.month, lunar!.day])
      )
    ).toBeNull()
  })

  test.each([
    ['no solar date', null, [2006, 12, 30]],
    ['no lunar date', [2007, 2, 17], null],
    ['an invalid solar date', [2007, 2, 30], [2007, 1, 1]]
  ] as const)('skips %s', (_label, solar, lunar) => {
    expect(
      recomputeLunarDeathDate(
        person(
          'd',
          solar ? [...solar] : null,
          lunar ? ([...lunar] as [number, number, number]) : null
        )
      )
    ).toBeNull()
  })

  test('skips a partial solar or lunar date', () => {
    const p = person('e', [2007, 2, 17], [2006, 12, 30])
    expect(recomputeLunarDeathDate({ ...p, death_day: null })).toBeNull()
    expect(recomputeLunarDeathDate({ ...p, death_lunar_year: null })).toBeNull()
  })
})

describe('findLunarMismatches', () => {
  test('returns only the rows that differ, in order', () => {
    const persons = [
      // Differ: Chinese-calendar values in years the calendars disagree.
      person('1', [2007, 2, 17], [2006, 12, 30]),
      person('2', [1985, 1, 21], [1984, 12, 1]),
      person('3', [2007, 2, 18], [2007, 1, 1]),
      // Match the Vietnamese calendar.
      person('4', [2024, 2, 10], [2024, 1, 1]),
      person('5', [2026, 2, 17], [2026, 1, 1])
    ]
    const rows = findLunarMismatches(persons)
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(rows[1].recomputed).toEqual({
      year: 1985,
      month: 1,
      day: 1,
      leap: false
    })
    expect(rows[2].recomputed).toEqual({
      year: 2007,
      month: 1,
      day: 2,
      leap: false
    })
  })

  test('applying the recomputed dates leaves nothing to change', () => {
    const persons = [
      person('1', [2007, 2, 17], [2006, 12, 30]),
      person('2', [1985, 1, 21], [1984, 12, 1])
    ]
    const fixed = persons.map((p) => {
      const row = recomputeLunarDeathDate(p)!
      return {
        ...p,
        death_lunar_year: row.recomputed.year,
        death_lunar_month: row.recomputed.month,
        death_lunar_day: row.recomputed.day
      }
    })
    expect(findLunarMismatches(fixed)).toEqual([])
  })
})

describe('parseRecomputeIds', () => {
  const id = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'

  test('accepts uuids and drops duplicates', () => {
    expect(parseRecomputeIds([id, id.toUpperCase()])).toEqual([id])
  })

  test.each([
    ['not an array', id],
    ['an empty array', []],
    ['a non-uuid', [id, 'abc']],
    ['a number', [1]],
    ['too many ids', Array(MAX_RECOMPUTE_IDS + 1).fill(id)]
  ])('rejects %s', (_label, input) => {
    expect(parseRecomputeIds(input)).toBeNull()
  })
})
