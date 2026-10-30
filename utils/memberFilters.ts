import type { Person } from '@/types'

const GENERATION_PREFIX = 'generation:'

/** Filter option value for one generation, e.g. `generation:5`. */
export function generationFilterOption(generation: number): string {
  return `${GENERATION_PREFIX}${generation}`
}

function parseGenerationOption(option: string): number | null {
  if (!option.startsWith(GENERATION_PREFIX)) return null
  const raw = option.slice(GENERATION_PREFIX.length)
  if (!/^\d+$/.test(raw)) return null
  return Number(raw)
}

/** Generations present in the data, ascending, for the "Generation N" options. */
export function listGenerations(
  persons: Pick<Person, 'generation'>[]
): number[] {
  const found = new Set<number>()
  for (const p of persons) {
    if (typeof p.generation === 'number') found.add(p.generation)
  }
  return [...found].sort((a, b) => a - b)
}

/**
 * Whether a person passes a list filter: `all`, `male`, `female`,
 * `in_law_female`, `in_law_male`, `deceased`, `first_child`, `alive`,
 * `missingBirthYear` or `generation:<n>`. Unknown options keep everyone.
 */
export function matchesPersonFilter(person: Person, option: string): boolean {
  switch (option) {
    case 'male':
      return person.gender === 'male'
    case 'female':
      return person.gender === 'female'
    case 'in_law_female':
      return person.gender === 'female' && !!person.is_in_law
    case 'in_law_male':
      return person.gender === 'male' && !!person.is_in_law
    case 'deceased':
      return !!person.is_deceased
    case 'first_child':
      return person.birth_order === 1 && !person.is_in_law
    case 'alive':
      return !person.is_deceased
    case 'missingBirthYear':
      return person.birth_year == null
    default: {
      const generation = parseGenerationOption(option)
      return generation === null || person.generation === generation
    }
  }
}

export function filterPersons<T extends Person>(
  persons: T[],
  option: string
): T[] {
  return option === 'all'
    ? persons
    : persons.filter((p) => matchesPersonFilter(p, option))
}
