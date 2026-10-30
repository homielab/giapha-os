import { describe, expect, test } from 'bun:test'

import {
  computeFamilyStats,
  computeLifespan,
  type StatsPerson,
  type StatsRelationship
} from './familyStats'

function person(
  id: string,
  gender: StatsPerson['gender'],
  extra: Partial<StatsPerson> = {}
): StatsPerson {
  return {
    id,
    gender,
    is_in_law: false,
    is_deceased: false,
    birth_order: null,
    generation: null,
    birth_year: null,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    full_name: id,
    ...extra
  }
}

const rel = (
  type: StatsRelationship['type'],
  a: string,
  b: string
): StatsRelationship => ({ type, person_a: a, person_b: b })

const persons = [
  person('grandpa', 'male', {
    generation: 1,
    is_deceased: true,
    birth_year: 1930,
    birth_month: 3,
    birth_day: 25
  }),
  person('grandma', 'female', {
    generation: 1,
    is_in_law: true,
    birth_year: 1932,
    birth_month: 4,
    birth_day: 1
  }),
  person('dad', 'male', { generation: 2, birth_order: 1, birth_year: 2020 }),
  person('aunt', 'female', { generation: 2, birth_order: 2 }),
  person('uncle', 'male', { generation: 2, is_in_law: true }),
  person('kid', 'other', { generation: 3, birth_order: 1 })
]

const relationships = [
  rel('marriage', 'grandpa', 'grandma'),
  rel('marriage', 'aunt', 'uncle'),
  rel('biological_child', 'grandpa', 'dad'),
  rel('biological_child', 'dad', 'kid')
]

describe('computeFamilyStats', () => {
  const stats = computeFamilyStats(persons, relationships)

  test('counts people by gender, in-law and deceased', () => {
    expect(stats.total).toBe(6)
    expect(stats.male).toBe(3)
    expect(stats.female).toBe(2)
    expect(stats.daughtersInLaw).toBe(1)
    expect(stats.sonsInLaw).toBe(1)
    expect(stats.deceased).toBe(1)
    expect(stats.firstBorn).toBe(2)
  })

  test('in-laws with birth order 1 are not counted as first-born', () => {
    const withInLaws = computeFamilyStats(
      [
        ...persons,
        person('wife1', 'female', { is_in_law: true, birth_order: 1 }),
        person('wife2', 'female', { is_in_law: true, birth_order: 1 })
      ],
      relationships
    )
    expect(withInLaws.firstBorn).toBe(2)
    expect(withInLaws.daughtersInLaw).toBe(3)
    expect(withInLaws.total).toBe(8)
  })

  test('married counts both spouses; parent-child links are ignored', () => {
    expect(stats.married).toBe(4)
    expect(stats.unmarried).toBe(2)
  })

  test('generations are sorted ascending and skip unknown ones', () => {
    const withUnknown = computeFamilyStats(
      [...persons, person('stray', 'male')],
      relationships
    )
    expect(withUnknown.generationBreakdown).toEqual([
      { gen: 1, count: 2 },
      { gen: 2, count: 3 },
      { gen: 3, count: 1 }
    ])
  })

  test('zodiac signs and animals are translation keys counted by birth date', () => {
    expect(stats.zodiacBreakdown).toEqual([{ name: 'zodiacAries', count: 2 }])
    // 1930-03-25 and 1932-04-01 are lunar years Canh Ngọ (horse) and Nhâm Thân
    // (monkey); 2020 without a date is the rat.
    expect(
      stats.chineseZodiacBreakdown.map((z): string => z.name).sort()
    ).toEqual(['animalHorse', 'animalMonkey', 'animalRat'].sort())
  })

  test('a birth date before the lunar new year counts in the previous year', () => {
    const s = computeFamilyStats(
      [
        person('a', 'male', { birth_year: 2020, birth_month: 1, birth_day: 10 })
      ],
      []
    )
    expect(s.chineseZodiacBreakdown).toEqual([{ name: 'animalPig', count: 1 }])
  })

  test('a marriage to someone outside the list does not count the outsider', () => {
    const s = computeFamilyStats(
      [person('a', 'male')],
      [rel('marriage', 'a', 'gone')]
    )
    expect(s.married).toBe(1)
    expect(s.unmarried).toBe(0)
  })

  test('an empty family gives zeros and empty lists', () => {
    const s = computeFamilyStats([], [])
    expect(s.total).toBe(0)
    expect(s.married).toBe(0)
    expect(s.generationBreakdown).toEqual([])
    expect(s.zodiacBreakdown).toEqual([])
    expect(s.chineseZodiacBreakdown).toEqual([])
  })
})

describe('computeFamilyStats gender', () => {
  test('counts other so the three parts make the total', () => {
    const s = computeFamilyStats(
      [person('a', 'male'), person('b', 'female'), person('c', 'other')],
      []
    )
    expect([s.male, s.female, s.other]).toEqual([1, 1, 1])
    expect(s.male + s.female + s.other).toBe(s.total)
  })
})

describe('computeLifespan', () => {
  const now = new Date('2026-06-15T12:00:00+07:00')
  const family = [
    // 1920-05-10 → 2010-03-01: 89 (birthday not reached)
    person('a', 'male', {
      is_deceased: true,
      birth_year: 1920,
      birth_month: 5,
      birth_day: 10,
      death_year: 2010,
      death_month: 3,
      death_day: 1
    }),
    // 1925 → 2020: 95
    person('b', 'female', {
      is_deceased: true,
      birth_year: 1925,
      death_year: 2020
    }),
    // 1950 → 2000: 50
    person('c', 'male', {
      is_deceased: true,
      birth_year: 1950,
      death_year: 2000
    }),
    // Missing years: left out.
    person('d', 'male', { is_deceased: true, birth_year: 1930 }),
    person('e', 'male', { is_deceased: true, death_year: 1990 }),
    // Living: 2026 - 1940 = 86, 1960 = 66.
    person('f', 'female', { birth_year: 1940 }),
    person('g', 'male', { birth_year: 1960 }),
    // Living without a death date but 136: left out.
    person('h', 'male', { birth_year: 1890 })
  ]
  const s = computeLifespan(family, now)

  test('average counts only people with both years', () => {
    expect(s.counted).toBe(3)
    expect(s.average).toBe(78)
  })

  test('longest-lived and oldest living', () => {
    expect(s.longestLived).toEqual({ id: 'b', name: 'b', age: 95 })
    expect(s.oldestLiving).toEqual({ id: 'f', name: 'f', age: 86 })
  })

  test('average by birth decade, ascending', () => {
    expect(s.byDecade).toEqual([
      { decade: 1920, average: 92, count: 2 },
      { decade: 1950, average: 50, count: 1 }
    ])
  })

  test('no data gives nulls', () => {
    const empty = computeLifespan([person('x', 'male')], now)
    expect(empty).toEqual({
      counted: 0,
      average: null,
      longestLived: null,
      oldestLiving: null,
      byDecade: []
    })
  })

  test('is part of computeFamilyStats', () => {
    expect(computeFamilyStats(family, [], now).lifespan).toEqual(s)
  })
})
