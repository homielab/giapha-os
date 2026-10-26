import { SupabaseClient } from '@supabase/supabase-js'

import { Person } from '@/types'
import { PersonNotCreatedError } from '@/utils/writeErrors'

export interface SpouseInput {
  person: Person
  name: string
  birthYear: string
  note: string
}

// Creates a spouse person (default gender opposite to `person`) and links the
// marriage. Returns the new spouse's ID; throws on failure.
export async function createSpouseWithMarriage(
  supabase: SupabaseClient,
  { person, name, birthYear, note }: SpouseInput
): Promise<string> {
  // Determine default gender based on current person
  // Default to opposite. If original is other, default to female (arbitrary choice, or let user pick, but standard says opposite)
  const newSpouseGender =
    person.gender === 'male'
      ? 'female'
      : person.gender === 'female'
        ? 'male'
        : 'female'

  const personPayload: {
    full_name: string
    gender: 'male' | 'female' | 'other'
    birth_year?: number
    is_in_law?: boolean
    generation?: number
  } = {
    full_name: name.trim(),
    gender: newSpouseGender,
    is_in_law: person.is_in_law === true ? false : true
  }

  if (person.generation != null) {
    personPayload.generation = person.generation
  }

  if (birthYear.trim() !== '') {
    const year = parseInt(birthYear)
    if (!isNaN(year)) personPayload.birth_year = year
  }

  // 1. Insert Person
  const { data: newPersonData, error: insertError } = await supabase
    .from('persons')
    .insert(personPayload)
    .select('id')
    .single()

  if (insertError) throw insertError
  if (!newPersonData) throw new PersonNotCreatedError()

  const newSpouseId = newPersonData.id

  // 2. Insert Marriage Relationship
  const { error: relError } = await supabase.from('relationships').insert({
    person_a: person.id,
    person_b: newSpouseId,
    type: 'marriage',
    note: note.trim() || null
  })

  if (relError) throw relError

  return newSpouseId
}
