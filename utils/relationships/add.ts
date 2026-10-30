import { SupabaseClient } from '@supabase/supabase-js'

import { Person, RelationshipType } from '@/types'
import {
  DatedPerson,
  RelationshipLink,
  RelationshipValidationError,
  relationshipWarning,
  RelationshipWarningError,
  validateRelationship
} from '@/utils/relationshipValidation'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import {
  PersonNotUpdatedError,
  RelationshipNotDeletedError
} from '@/utils/writeErrors'

import {
  AddRelationshipResult,
  errorMessage,
  NewRelationshipInput,
  RelationshipDirection
} from './shared'

// Deletes a relationship. RLS turns a refused delete into "0 rows" without an
// error, so zero removed rows throws RelationshipNotDeletedError.
export async function deleteRelationship(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', relationshipId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new RelationshipNotDeletedError()
}

// Inserts a relationship between the current person and a target, then
// auto-fills the target's generation/is_in_law when still unset. Throws when
// the relationship itself is not saved.
export async function addRelationshipWithTargetSync(
  supabase: SupabaseClient,
  input: NewRelationshipInput
): Promise<AddRelationshipResult> {
  const { personId, selectedTargetId, direction, relType, note } = input

  let personA = personId
  let personB = selectedTargetId

  if (direction === 'parent') {
    personA = selectedTargetId
    personB = personId
  } else if (direction === 'child') {
    personA = personId
    personB = selectedTargetId
  }

  let type: RelationshipType = 'biological_child'
  if (direction === 'spouse') type = 'marriage'
  else if (relType === 'adopted_child') type = 'adopted_child'

  const candidate = { person_a: personA, person_b: personB, type }
  const context = await loadRelationshipContext(supabase, candidate)
  const invalid = validateRelationship(
    context.persons,
    context.relationships,
    candidate
  )
  if (invalid) throw new RelationshipValidationError(invalid)
  const warning = relationshipWarning(
    context.persons,
    candidate,
    context.relationships
  )
  if (warning && !input.acceptWarnings)
    throw new RelationshipWarningError(warning)

  const { error } = await supabase.from('relationships').insert({
    ...candidate,
    note: note ? note : null
  })

  if (error) throw error

  const targetUpdateError = await autoUpdateTargetProperties(
    supabase,
    selectedTargetId,
    direction,
    input.person
  )
  return { targetUpdateError }
}

const LOOKUP_CHUNK = 200

// Loads birth dates, direct links, and (for parent links) descendant links.
async function loadRelationshipContext(
  supabase: SupabaseClient,
  candidate: RelationshipLink
): Promise<{ persons: DatedPerson[]; relationships: RelationshipLink[] }> {
  const pair = [candidate.person_a, candidate.person_b]

  const isParentLink = candidate.type !== 'marriage'
  const [personsResult, betweenResult, parentsResult] = await Promise.all([
    supabase
      .from('persons')
      .select(
        'id, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day'
      )
      .in('id', pair),
    supabase
      .from('relationships')
      .select('person_a, person_b, type')
      .in('person_a', pair)
      .in('person_b', pair),
    // Existing biological parents of the child, for the two-parent check;
    // of both spouses for a marriage, for the sibling check.
    isParentLink
      ? supabase
          .from('relationships')
          .select('person_a, person_b, type')
          .eq('person_b', candidate.person_b)
          .eq('type', 'biological_child')
      : supabase
          .from('relationships')
          .select('person_a, person_b, type')
          .in('person_b', pair)
          .eq('type', 'biological_child')
  ])
  if (personsResult.error) throw personsResult.error
  if (betweenResult.error) throw betweenResult.error
  if (parentsResult.error) throw parentsResult.error

  const relationships: RelationshipLink[] = [...(betweenResult.data ?? [])]
  const persons: DatedPerson[] = [...(personsResult.data ?? [])]

  // Other parents of the child: their gender decides a second same-gender one.
  const otherParents: string[] = []
  for (const row of parentsResult.data ?? []) {
    // A link between the pair is already in betweenResult.
    if (pair.includes(row.person_a) && pair.includes(row.person_b)) continue
    relationships.push(row)
    if (!pair.includes(row.person_a)) otherParents.push(row.person_a)
  }
  if (candidate.type === 'biological_child' && otherParents.length === 1) {
    const { data, error } = await supabase
      .from('persons')
      .select('id, gender, birth_year')
      .in('id', otherParents)
    if (error) throw error
    persons.push(...(data ?? []))
  }

  if (candidate.type !== 'marriage') {
    const seen = new Set<string>([candidate.person_b])
    let frontier = [candidate.person_b]
    while (frontier.length > 0 && !seen.has(candidate.person_a)) {
      const next: string[] = []
      for (let i = 0; i < frontier.length; i += LOOKUP_CHUNK) {
        const parents = frontier.slice(i, i + LOOKUP_CHUNK)
        // 200 parents can have more than one response page of children.
        const { data, error } = await fetchAllRows<RelationshipLink>(
          (from, to) =>
            supabase
              .from('relationships')
              .select('person_a, person_b, type')
              .in('person_a', parents)
              .in('type', ['biological_child', 'adopted_child'])
              .order('id')
              .range(from, to)
        )
        if (error) throw error
        for (const row of data) {
          relationships.push(row)
          if (!seen.has(row.person_b)) {
            seen.add(row.person_b)
            next.push(row.person_b)
          }
        }
      }
      frontier = next
    }
  }

  return { persons, relationships }
}

// Auto-update target person generation and is_in_law if currently missing.
// Returns the error message when reading or updating the target failed.
async function autoUpdateTargetProperties(
  supabase: SupabaseClient,
  selectedTargetId: string,
  direction: RelationshipDirection,
  person: Person
): Promise<string | PersonNotUpdatedError | null> {
  try {
    const { data: targetPerson, error: selectError } = await supabase
      .from('persons')
      .select('generation, is_in_law')
      .eq('id', selectedTargetId)
      .single()
    if (selectError) return errorMessage(selectError)

    if (
      targetPerson &&
      (targetPerson.generation == null || targetPerson.is_in_law == null)
    ) {
      const updates: { generation?: number; is_in_law?: boolean } = {}

      if (targetPerson.generation == null && person.generation != null) {
        if (direction === 'child') updates.generation = person.generation + 1
        else if (direction === 'parent')
          updates.generation = person.generation - 1
        else if (direction === 'spouse') updates.generation = person.generation
      }

      if (targetPerson.is_in_law == null) {
        if (direction === 'child' || direction === 'parent')
          updates.is_in_law = false
        else if (direction === 'spouse')
          updates.is_in_law = person.is_in_law !== true
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from('persons')
          .update(updates)
          .eq('id', selectedTargetId)
          .select('id')
        if (updateError) return errorMessage(updateError)
        if (!updated || updated.length === 0) {
          return new PersonNotUpdatedError()
        }
      }
    }
    return null
  } catch (err) {
    return errorMessage(err)
  }
}
