import type { TranslationKey } from '@/lib/i18n/messages'
import { Person, Relationship } from '@/types'
import { getZodiacAnimal, getZodiacSign } from '@/utils/dateHelpers'

export interface FamilyStatsResult {
  total: number
  male: number
  female: number
  daughtersInLaw: number
  sonsInLaw: number
  deceased: number
  firstBorn: number
  married: number
  unmarried: number
  generationBreakdown: { gen: number; count: number }[]
  zodiacBreakdown: { name: TranslationKey; count: number }[]
  chineseZodiacBreakdown: { name: TranslationKey; count: number }[]
}

export function computeFamilyStats(
  persons: Person[],
  relationships: Relationship[]
): FamilyStatsResult {
  const total = persons.length

  // Gender
  const male = persons.filter((p) => p.gender === 'male').length
  const female = persons.filter((p) => p.gender === 'female').length

  // In-laws
  const daughtersInLaw = persons.filter(
    (p) => p.is_in_law && p.gender === 'female'
  ).length
  const sonsInLaw = persons.filter(
    (p) => p.is_in_law && p.gender === 'male'
  ).length

  // Deceased
  const deceased = persons.filter((p) => p.is_deceased).length

  // First-born (con trưởng)
  const firstBorn = persons.filter((p) => p.birth_order === 1).length

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
    daughtersInLaw,
    sonsInLaw,
    deceased,
    firstBorn,
    married,
    unmarried,
    generationBreakdown,
    zodiacBreakdown,
    chineseZodiacBreakdown
  }
}
