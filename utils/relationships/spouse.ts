import { SupabaseClient } from '@supabase/supabase-js'

import { Person } from '@/types'
import { checkTextLength, MAX_NAME, MAX_NOTE } from '@/utils/limits'
import { RelationshipValidationError } from '@/utils/relationshipValidation'
import { PersonNotCreatedError } from '@/utils/writeErrors'

import { parseBirthYear, validateChildRow } from './bulkChildren'

export interface SpouseInput {
  person: Person
  name: string
  birthYear: string
  note: string
}

// Creates a spouse person (default gender opposite to `person`) and links the
// marriage. Returns the new spouse's ID; throws on failure. Nothing is saved
// when the name or note is over the backup limits (TextTooLongError) or the
// birth year is not a whole number from 1 to the current year
// (RelationshipValidationError, same rules as adding children).
export async function createSpouseWithMarriage(
  supabase: SupabaseClient,
  { person, name, birthYear, note }: SpouseInput
): Promise<string> {
  // Determine default gender based on current person
  // Default to opposite. If original is other, default to female (arbitrary choice, or let user pick, but standard says opposite)
  const fullName = name.trim()
  const relationshipNote = note.trim()
  checkTextLength('fullName', fullName, MAX_NAME)
  checkTextLength('note', relationshipNote, MAX_NOTE)
  const yearError = validateChildRow({ birthYear, birthOrder: '' })
  if (yearError) throw new RelationshipValidationError(yearError)
  const year = parseBirthYear(birthYear)

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
    full_name: fullName,
    gender: newSpouseGender,
    is_in_law: person.is_in_law === true ? false : true
  }

  if (person.generation != null) {
    personPayload.generation = person.generation
  }

  if (year != null) personPayload.birth_year = year

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
    note: relationshipNote || null
  })

  if (relError) throw relError

  return newSpouseId
}
