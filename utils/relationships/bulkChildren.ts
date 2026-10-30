import { SupabaseClient } from '@supabase/supabase-js'

import { BulkChildRow } from '@/components/relationship/relationshipTypes'
import { vnToday } from '@/utils/dateHelpers'
import { checkTextLength, MAX_NAME } from '@/utils/limits'
import { memberSearchCache } from '@/utils/memberSearchCache'
import {
  DatedPerson,
  RelationshipValidationCode,
  RelationshipValidationError,
  validateNewChildren
} from '@/utils/relationshipValidation'

import { errorMessage } from './shared'

export interface BulkChildInput {
  child: BulkChildRow
  parentId: string
  otherParentId: string
  parentGeneration: number | null
}

const MAX_INT = 2147483647

// A whole number written with digits only: "12abc", "-5" and "1990.5" are not.
function parseWholeNumber(value: string): number | null {
  const text = value.trim()
  if (!/^\d+$/.test(text)) return null
  const number = Number(text)
  return number <= MAX_INT ? number : null
}

// Empty means unknown (null); anything that is not a whole number gives NaN,
// which validateChildRow rejects.
export function parseBirthYear(value: string): number | null {
  if (value.trim() === '') return null
  return parseWholeNumber(value) ?? NaN
}

function parseBirthOrder(value: string): number | null {
  if (value.trim() === '') return null
  return parseWholeNumber(value) ?? NaN
}

/**
 * Checks the birth year and birth order a row would save, like the member
 * form does for a single member: whole numbers only, a year from 1 up to the
 * current year (Vietnam time), a birth order from 1.
 */
export function validateChildRow(
  row: Pick<BulkChildRow, 'birthYear' | 'birthOrder'>,
  today: Date = vnToday()
): RelationshipValidationCode | null {
  const year = parseBirthYear(row.birthYear)
  if (year != null) {
    if (Number.isNaN(year) || year < 1) return 'invalidBirthYear'
    if (year > today.getFullYear()) return 'birthYearInFuture'
  }
  const order = parseBirthOrder(row.birthOrder)
  if (order != null && (Number.isNaN(order) || order < 1))
    return 'invalidBirthOrder'
  return null
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
  const birthOrder = parseBirthOrder(child.birthOrder)
  if (birthOrder != null) personPayload.birth_order = birthOrder

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
    // The ⌘K search must find the new child now, not after its cache expires.
    memberSearchCache.clear()
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

  // Every row is checked before anything is saved.
  for (const child of children) {
    checkTextLength('fullName', child.name.trim(), MAX_NAME)
    const code = validateChildRow(child)
    if (code) throw new RelationshipValidationError(code, child.name.trim())
  }

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
