import type { SupabaseClient } from '@supabase/supabase-js'

import type { ComputedUpdate } from '@/utils/lineageCompute'
import { isMissingDatabaseFunction } from '@/utils/supabase/missingFunction'
import { PersonNotUpdatedError } from '@/utils/writeErrors'

/**
 * One row of the `update_generations(updates jsonb)` database function. A
 * column is only changed when its key is present.
 */
export interface GenerationUpdate {
  id: string
  generation?: number | null
  birth_order?: number | null
  is_in_law?: boolean
}

// Concurrent requests per round in the fallback path.
const LEGACY_BATCH_SIZE = 10

/**
 * Everyone below `rootId` through parent-child links (`person_a` is the
 * parent, `person_b` the child), in breadth-first order, each once. The root
 * itself is never included, even when old data has a parent-child loop back
 * to it.
 */
export function collectDescendants(
  relationships: { person_a: string; person_b: string }[],
  rootId: string
): string[] {
  const childrenMap = new Map<string, string[]>()
  for (const r of relationships) {
    const children = childrenMap.get(r.person_a)
    if (children) children.push(r.person_b)
    else childrenMap.set(r.person_a, [r.person_b])
  }

  const visited = new Set<string>([rootId])
  const order = [rootId]
  for (let i = 0; i < order.length; i++) {
    for (const child of childrenMap.get(order[i]) ?? []) {
      if (!visited.has(child)) {
        visited.add(child)
        order.push(child)
      }
    }
  }
  return order.slice(1)
}

/**
 * Shifts the generation of each descendant by `delta` (never below 1).
 * Members without a generation are left out.
 */
export function buildDescendantGenerationUpdates(
  persons: { id: string; generation: number | null }[],
  delta: number
): GenerationUpdate[] {
  return persons
    .filter((p) => p.generation !== null && p.generation !== undefined)
    .map((p) => ({
      id: p.id,
      generation: Math.max(1, (p.generation as number) + delta)
    }))
}

/** The changed rows of the lineage tool's preview. */
export function buildLineageUpdates(
  updates: ComputedUpdate[]
): GenerationUpdate[] {
  return updates
    .filter((u) => u.changed)
    .map((u) => ({
      id: u.id,
      generation: u.new_generation,
      birth_order: u.new_birth_order,
      is_in_law: u.new_is_in_law
    }))
}

export type ApplyGenerationUpdatesResult =
  | { ok: true; count: number; legacy: boolean }
  | { ok: false; error: string; legacy: boolean; failedIds: string[] }

/**
 * Saves the updates in one call to `update_generations`, which runs in a
 * single transaction: on any error nothing is changed. Databases without the
 * function fall back to one UPDATE per member (`legacy: true`), where a
 * failure can leave part of the rows updated.
 */
export async function applyGenerationUpdates(
  supabase: SupabaseClient,
  updates: GenerationUpdate[]
): Promise<ApplyGenerationUpdatesResult> {
  if (updates.length === 0) return { ok: true, count: 0, legacy: false }

  const { data, error } = await supabase.rpc('update_generations', {
    updates
  })
  if (!error) {
    return {
      ok: true,
      count: typeof data === 'number' ? data : updates.length,
      legacy: false
    }
  }
  if (!isMissingDatabaseFunction(error)) {
    return { ok: false, error: error.message, legacy: false, failedIds: [] }
  }

  return legacyApplyGenerationUpdates(supabase, updates)
}

async function legacyApplyGenerationUpdates(
  supabase: SupabaseClient,
  updates: GenerationUpdate[]
): Promise<ApplyGenerationUpdatesResult> {
  const failedIds: string[] = []
  let firstError: string | null = null

  for (let i = 0; i < updates.length; i += LEGACY_BATCH_SIZE) {
    const batch = updates.slice(i, i + LEGACY_BATCH_SIZE)
    await Promise.all(
      batch.map(async ({ id, ...columns }) => {
        const { data, error } = await supabase
          .from('persons')
          .update(columns)
          .eq('id', id)
          .select('id')
        if (error || !data || data.length === 0) {
          // RLS turns a refused update into "0 rows" without an error.
          const message = error?.message ?? new PersonNotUpdatedError().message
          console.error(`Error updating person ${id}:`, message)
          failedIds.push(id)
          firstError ??= message
        }
      })
    )
  }

  if (firstError !== null) {
    return { ok: false, error: firstError, legacy: true, failedIds }
  }
  return { ok: true, count: updates.length, legacy: true }
}
