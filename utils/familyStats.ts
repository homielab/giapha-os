import type { TranslationKey } from '@/lib/i18n/messages'
import { Person, Relationship } from '@/types'
import {
  calculateAge,
  getZodiacAnimal,
  getZodiacSign,
  vnToday
} from '@/utils/dateHelpers'

/** Person columns the stats need; select only these to keep the query small. */
export const STATS_PERSON_COLUMNS =
  'id, gender, is_in_law, is_deceased, birth_order, generation, birth_year, birth_month, birth_day, death_year, death_month, death_day, full_name'

/** Relationship columns the stats need (only marriages are counted). */
export const STATS_RELATIONSHIP_COLUMNS = 'type, person_a, person_b'

export type StatsPerson = Pick<
  Person,
  | 'id'
  | 'gender'
  | 'is_in_law'
  | 'is_deceased'
  | 'birth_order'
  | 'generation'
  | 'birth_year'
  | 'birth_month'
  | 'birth_day'
  | 'death_year'
  | 'death_month'
  | 'death_day'
  | 'full_name'
>

export type StatsRelationship = Pick<
  Relationship,
  'type' | 'person_a' | 'person_b'
>

export interface FamilyStatsResult {
  total: number
  male: number
  female: number
  /** Gender 'other'; male + female + other = total. */
  other: number
  daughtersInLaw: number
  sonsInLaw: number
  deceased: number
  firstBorn: number
  married: number
  unmarried: number
  generationBreakdown: { gen: number; count: number }[]
  zodiacBreakdown: { name: TranslationKey; count: number }[]
  chineseZodiacBreakdown: { name: TranslationKey; count: number }[]
  lifespan: LifespanStats
}

export interface LifespanPerson {
  id: string
  name: string
  age: number
}

export interface LifespanStats {
  /** Deceased people with both a birth and a death year. */
  counted: number
  /** Average age at death, one decimal; null when nobody is counted. */
  average: number | null
  longestLived: LifespanPerson | null
  oldestLiving: LifespanPerson | null
  /** Average age at death by birth decade (1920 = born 1920–1929). */
  byDecade: { decade: number; average: number; count: number }[]
}

/** A living person older than this most likely lacks a death date. */
const MAX_LIVING_AGE = 120

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeLifespan(
  persons: StatsPerson[],
  now: Date = vnToday()
): LifespanStats {
  let sum = 0
  let counted = 0
  let longestLived: LifespanPerson | null = null
  let oldestLiving: LifespanPerson | null = null
  const decades = new Map<number, { sum: number; count: number }>()

  for (const p of persons) {
    if (!p.birth_year) continue
    if (p.death_year) {
      const result = calculateAge(
        p.birth_year,
        p.birth_month,
        p.birth_day,
        p.death_year,
        p.death_month,
        p.death_day,
        true
      )
      if (!result || result.age < 0) continue
      sum += result.age
      counted++
      if (!longestLived || result.age > longestLived.age) {
        longestLived = { id: p.id, name: p.full_name, age: result.age }
      }
      const decade = Math.floor(p.birth_year / 10) * 10
      const d = decades.get(decade) ?? { sum: 0, count: 0 }
      d.sum += result.age
      d.count++
      decades.set(decade, d)
    } else if (!p.is_deceased) {
      const result = calculateAge(
        p.birth_year,
        p.birth_month,
        p.birth_day,
        null,
        null,
        null,
        false,
        now
      )
      if (!result || result.age < 0 || result.age > MAX_LIVING_AGE) continue
      if (!oldestLiving || result.age > oldestLiving.age) {
        oldestLiving = { id: p.id, name: p.full_name, age: result.age }
      }
    }
  }

  return {
    counted,
    average: counted > 0 ? round1(sum / counted) : null,
    longestLived,
    oldestLiving,
    byDecade: Array.from(decades.entries())
      .sort(([a], [b]) => a - b)
      .map(([decade, { sum, count }]) => ({
        decade,
        average: round1(sum / count),
        count
      }))
  }
}

export function computeFamilyStats(
  persons: StatsPerson[],
  relationships: StatsRelationship[],
  now: Date = vnToday()
): FamilyStatsResult {
  const total = persons.length

  // Gender
  const male = persons.filter((p) => p.gender === 'male').length
  const female = persons.filter((p) => p.gender === 'female').length
  const other = total - male - female

  // In-laws
  const daughtersInLaw = persons.filter(
    (p) => p.is_in_law && p.gender === 'female'
  ).length
  const sonsInLaw = persons.filter(
    (p) => p.is_in_law && p.gender === 'male'
  ).length

  // Deceased
  const deceased = persons.filter((p) => p.is_deceased).length

  // First-born (con trưởng); an in-law's birth order is in their own family
  const firstBorn = persons.filter(
    (p) => p.birth_order === 1 && !p.is_in_law
  ).length

  // Married / unmarried (based on marriage relationships)
  const marriedIds = new Set<string>()
  relationships
    .filter((r) => r.type === 'marriage')
    .forEach((r) => {
      marriedIds.add(r.person_a)
      marriedIds.add(r.person_b)
    })
  const married = persons.filter((p) => marriedIds.has(p.id)).length
  const unmarried = total - married

  // Generation breakdown
  const genMap = new Map<number, number>()
  const zodiacMap = new Map<TranslationKey, number>()
  const chineseZodiacMap = new Map<TranslationKey, number>()

  persons.forEach((p) => {
    // Generations
    if (p.generation != null) {
      genMap.set(p.generation, (genMap.get(p.generation) ?? 0) + 1)
    }

    // Zodiac Signs
    const zodiac = getZodiacSign(p.birth_day, p.birth_month)
    if (zodiac) {
      zodiacMap.set(zodiac, (zodiacMap.get(zodiac) ?? 0) + 1)
    }

    // Chinese Zodiac
    const chineseZodiac = getZodiacAnimal(
      p.birth_year,
      p.birth_month,
      p.birth_day
    )
    if (chineseZodiac) {
      chineseZodiacMap.set(
        chineseZodiac,
        (chineseZodiacMap.get(chineseZodiac) ?? 0) + 1
      )
    }
  })

  const generationBreakdown = Array.from(genMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([gen, count]) => ({ gen, count }))

  const zodiacBreakdown = Array.from(zodiacMap.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([name, count]) => ({ name, count }))

  const chineseZodiacBreakdown = Array.from(chineseZodiacMap.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([name, count]) => ({ name, count }))

  return {
    total,
    male,
    female,
    other,
    daughtersInLaw,
    sonsInLaw,
    deceased,
    firstBorn,
    married,
    unmarried,
    generationBreakdown,
    zodiacBreakdown,
    chineseZodiacBreakdown,
    lifespan: computeLifespan(persons, now)
  }
}
