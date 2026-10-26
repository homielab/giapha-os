import { SupabaseClient } from '@supabase/supabase-js'

import { BulkChildRow } from '@/components/relationship/relationshipTypes'
import { Person, RelationshipType } from '@/types'
import {
  DatedPerson,
  RelationshipLink,
  RelationshipValidationError,
  validateNewChildren,
  validateRelationship
} from '@/utils/relationshipValidation'

export interface NewRelationshipInput {
  personId: string
  selectedTargetId: string
  direction: 'parent' | 'child' | 'spouse'
  relType: RelationshipType
  note: string
  person: Person
}

// Inserts a relationship between the current person and a target, then
// auto-fills the target's generation/is_in_law when still unset.
export async function addRelationshipWithTargetSync(
  supabase: SupabaseClient,
  input: NewRelationshipInput
) {
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

  const { error } = await supabase.from('relationships').insert({
    ...candidate,
    note: note ? note : null
  })

  if (error) throw error

  await autoUpdateTargetProperties(
    supabase,
    selectedTargetId,
    direction,
    input.person
  )
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
      .select('id, birth_year, birth_month, birth_day')
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

// Auto-update target person generation and is_in_law if currently missing
async function autoUpdateTargetProperties(
  supabase: SupabaseClient,
  selectedTargetId: string,
  direction: 'parent' | 'child' | 'spouse',
  person: Person
) {
  try {
    const { data: targetPerson } = await supabase
      .from('persons')
      .select('generation, is_in_law')
      .eq('id', selectedTargetId)
      .single()

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
        await supabase
          .from('persons')
          .update(updates)
          .eq('id', selectedTargetId)
      }
    }
  } catch (err) {
    console.error('Failed to auto-update target person properties', err)
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

// Creates one child person plus the parent relationship(s). Returns true on
// success; failures are logged and reported per row.
async function createChildWithParents(
  supabase: SupabaseClient,
  { child, parentId, otherParentId, parentGeneration }: BulkChildInput
): Promise<boolean> {
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

  const { data: newPersonData, error: insertError } = await supabase
    .from('persons')
    .insert(personPayload)
    .select('id')
    .single()

  if (insertError || !newPersonData) {
    console.error('Error inserting child:', child.name, insertError)
    return false // Skip setting relationships for this if person insert failed
  }

  const newChildId = newPersonData.id

  // Insert Relationship to Main Person (parent)
  await supabase.from('relationships').insert({
    person_a: parentId,
    person_b: newChildId,
    type: 'biological_child'
  })

  // Insert Relationship to Second Parent (spouse), if selected
  if (otherParentId && otherParentId !== 'unknown') {
    await supabase.from('relationships').insert({
      person_a: otherParentId,
      person_b: newChildId,
      type: 'biological_child'
    })
  }

  return true
}

// Bulk-inserts children in bounded batches of 5 (rows are independent but we
// avoid firing every insert at once from the browser). Returns how many
// children were created successfully.
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
): Promise<number> {
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

  let successCount = 0

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
    successCount += results.filter(Boolean).length
  }

  return successCount
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
