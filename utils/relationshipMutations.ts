import { SupabaseClient } from '@supabase/supabase-js'

import { BulkChildRow } from '@/components/relationship/relationshipTypes'
import { Person, RelationshipType } from '@/types'
import {
  DatedPerson,
  RelationshipLink,
  RelationshipValidationError,
  relationshipWarning,
  RelationshipWarningError,
  validateNewChildren,
  validateRelationship
} from '@/utils/relationshipValidation'
import {
  PersonNotUpdatedError,
  RelationshipNotDeletedError
} from '@/utils/writeErrors'

export interface NewRelationshipInput {
  personId: string
  selectedTargetId: string
  direction: 'parent' | 'child' | 'spouse'
  relType: RelationshipType
  note: string
  person: Person
  /** Save even when the link only looks wrong (RelationshipWarningError). */
  acceptWarnings?: boolean
}

export interface AddRelationshipResult {
  // Set when the relationship was saved but filling in the target's
  // generation / in-law flag failed; the caller shows it as a warning.
  targetUpdateError: string | null
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message !== '') return message
  }
  return String(err)
}

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
  // Default: I am A, Target is B.

  // Setup payload based on logic
  // Marriage: Order doesn't strictly matter logically, but consistency is good.
  // Parent/Child:
  //    Relationship Type: biological_child
  //    Column A: Parent
  //    Column B: Child

  if (direction === 'parent') {
    // Target is Parent (A), I am Child (B)
    personA = selectedTargetId
    personB = personId
  } else if (direction === 'child') {
    // I am Parent (A), Target is Child (B)
    personA = personId
    personB = selectedTargetId
  }

  // Determine Type
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
  const warning = relationshipWarning(context.persons, candidate)
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

// Loads what validateRelationship needs for one candidate: both people's
// birth dates, the rows already linking them, and (for a parent link) every
// parent link below the child, walked one generation per query.
async function loadRelationshipContext(
  supabase: SupabaseClient,
  candidate: RelationshipLink
): Promise<{ persons: DatedPerson[]; relationships: RelationshipLink[] }> {
  const pair = [candidate.person_a, candidate.person_b]

  const [personsResult, betweenResult] = await Promise.all([
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
      .in('person_b', pair)
  ])
  if (personsResult.error) throw personsResult.error
  if (betweenResult.error) throw betweenResult.error

  const relationships: RelationshipLink[] = [...(betweenResult.data ?? [])]

  if (candidate.type !== 'marriage') {
    const seen = new Set<string>([candidate.person_b])
    let frontier = [candidate.person_b]
    while (frontier.length > 0 && !seen.has(candidate.person_a)) {
      const next: string[] = []
      for (let i = 0; i < frontier.length; i += LOOKUP_CHUNK) {
        const { data, error } = await supabase
          .from('relationships')
          .select('person_a, person_b, type')
          .in('person_a', frontier.slice(i, i + LOOKUP_CHUNK))
          .in('type', ['biological_child', 'adopted_child'])
        if (error) throw error
        for (const row of data ?? []) {
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

  return { persons: personsResult.data ?? [], relationships }
}

// Auto-update target person generation and is_in_law if currently missing.
// Returns the error message when reading or updating the target failed.
async function autoUpdateTargetProperties(
  supabase: SupabaseClient,
  selectedTargetId: string,
  direction: 'parent' | 'child' | 'spouse',
  person: Person
): Promise<string | null> {
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
          updates.is_in_law = person.is_in_law === true ? false : true
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from('persons')
          .update(updates)
          .eq('id', selectedTargetId)
          .select('id')
        if (updateError) return errorMessage(updateError)
        if (!updated || updated.length === 0) {
          return new PersonNotUpdatedError().message
        }
      }
    }
    return null
  } catch (err) {
    return errorMessage(err)
  }
}

export interface BulkChildInput {
  child: BulkChildRow
  parentId: string
  otherParentId: string
  parentGeneration: number | null
}

function parseBirthYear(value: string): number | null {
  if (value.trim() === '') return null
  const year = parseInt(value)
  return isNaN(year) ? null : year
}

export interface BulkChildFailure {
  child: BulkChildRow
  error: string
  // The person row exists but has no parent link (the link failed and so did
  // removing the person again); adding the row again would duplicate it.
  orphaned: boolean
}

export interface BulkCreateResult {
  created: number
  failures: BulkChildFailure[]
}

type ChildOutcome =
  { ok: true } | { ok: false; error: string; orphaned: boolean }

// Creates one child person plus the parent relationship(s). A child only
// counts as created when every parent link is saved; when a link fails the
// new person is removed again (its links go with it, ON DELETE CASCADE).
async function createChildWithParents(
  supabase: SupabaseClient,
  { child, parentId, otherParentId, parentGeneration }: BulkChildInput
): Promise<ChildOutcome> {
  const personPayload: {
    full_name: string
    gender: 'male' | 'female' | 'other'
    birth_year?: number
    birth_order?: number
    is_in_law?: boolean
    generation?: number
  } = {
    full_name: child.name.trim(),
    gender: child.gender,
    is_in_law: false
  }

  if (parentGeneration != null) {
    personPayload.generation = parentGeneration + 1
  }
  const birthYear = parseBirthYear(child.birthYear)
  if (birthYear != null) personPayload.birth_year = birthYear
  if (child.birthOrder.trim() !== '') {
    const order = parseInt(child.birthOrder)
    if (!isNaN(order)) personPayload.birth_order = order
  }

  try {
    const { data: newPersonData, error: insertError } = await supabase
      .from('persons')
      .insert(personPayload)
      .select('id')
      .single()

    if (insertError || !newPersonData) {
      return {
        ok: false,
        error: insertError ? errorMessage(insertError) : 'no id returned',
        orphaned: false
      }
    }

    const newChildId: string = newPersonData.id
    const parentIds = [parentId]
    if (otherParentId && otherParentId !== 'unknown') {
      parentIds.push(otherParentId)
    }

    const { error: linkError } = await supabase.from('relationships').insert(
      parentIds.map((id) => ({
        person_a: id,
        person_b: newChildId,
        type: 'biological_child'
      }))
    )
    if (!linkError) return { ok: true }

    // RLS turns a refused delete into "0 rows", so check what was removed.
    const { data: removed, error: removeError } = await supabase
      .from('persons')
      .delete()
      .eq('id', newChildId)
      .select('id')
    return {
      ok: false,
      error: errorMessage(linkError),
      orphaned: removeError != null || !removed || removed.length === 0
    }
  } catch (err) {
    return { ok: false, error: errorMessage(err), orphaned: false }
  }
}

// Bulk-inserts children in bounded batches of 5 (rows are independent but we
// avoid firing every insert at once from the browser). Returns how many
// children were created with their parent links, and the rows that failed.
export async function bulkCreateChildren(
  supabase: SupabaseClient,
  input: {
    children: BulkChildRow[]
    parentId: string
    otherParentId: string
    parentGeneration: number | null
    // Birth dates of the parent(s), checked against each child's birth year.
    parents: DatedPerson[]
  }
): Promise<BulkCreateResult> {
  const { children, parentId, otherParentId, parentGeneration } = input

  const invalid = validateNewChildren(
    input.parents,
    children.map((child) => ({ birthYear: parseBirthYear(child.birthYear) }))
  )
  if (invalid) {
    throw new RelationshipValidationError(
      invalid.code,
      children[invalid.index].name.trim()
    )
  }

  let created = 0
  const failures: BulkChildFailure[] = []

  const BATCH_SIZE = 5
  for (let i = 0; i < children.length; i += BATCH_SIZE) {
    const batch = children.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map((child) =>
        createChildWithParents(supabase, {
          child,
          parentId,
          otherParentId,
          parentGeneration
        })
      )
    )
    results.forEach((result, index) => {
      if (result.ok) created++
      else
        failures.push({
          child: batch[index],
          error: result.error,
          orphaned: result.orphaned
        })
    })
  }

  return { created, failures }
}

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

  if (insertError || !newPersonData) throw insertError

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
