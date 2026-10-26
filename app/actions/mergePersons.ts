'use server'

import { revalidatePath } from 'next/cache'

import { getServerTranslations } from '@/lib/i18n/server'
import {
  MERGE_PERSON_COLUMNS,
  previewMerge,
  type MergePerson,
  type MergePreview,
  type MergePrivateDetails,
  type MergeRelationshipRow
} from '@/utils/mergePersons'
import { isMissingDatabaseFunction } from '@/utils/supabase/missingFunction'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

/** Row counts the merge RPC reports. */
export interface MergeSummary {
  relationships_moved: number
  relationships_dropped: number
  details_fields_filled: number
  person_fields_filled: number
}

type MergeResult = { summary: MergeSummary } | { error: string }

/**
 * Everything the preview shows, fetched read-only for two members. Admins
 * only, like the duplicate scan itself.
 */
export async function loadMergePreview(
  keepId: string,
  dropId: string
): Promise<MergePreview | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  if (!keepId || !dropId || keepId === dropId)
    return { error: t('mergeSameMember') }

  const supabase = await getSupabase()
  const [persons, relationships, privates] = await Promise.all([
    supabase
      .from('persons')
      .select(MERGE_PERSON_COLUMNS)
      .in('id', [keepId, dropId]),
    supabase
      .from('relationships')
      .select('id, type, person_a, person_b')
      .or(
        `person_a.in.(${keepId},${dropId}),person_b.in.(${keepId},${dropId})`
      ),
    supabase
      .from('person_details_private')
      .select('person_id, phone_number, occupation, current_residence')
      .in('person_id', [keepId, dropId])
  ])
  if (persons.error) return { error: persons.error.message }
  if (relationships.error) return { error: relationships.error.message }
  if (privates.error) return { error: privates.error.message }

  const personRows = (persons.data ?? []) as unknown as MergePerson[]
  const keep = personRows.find((p) => p.id === keepId)
  const drop = personRows.find((p) => p.id === dropId)
  if (!keep || !drop) return { error: t('mergeMemberMissing') }

  const privateRows = (privates.data ?? []) as unknown as Array<
    MergePrivateDetails & { person_id: string }
  >
  const privateKeep = privateRows.find((d) => d.person_id === keepId) ?? null
  const privateDrop = privateRows.find((d) => d.person_id === dropId) ?? null

  const preview = previewMerge({
    keep,
    drop,
    relationships: relationships.data as MergeRelationshipRow[],
    privateKeep,
    privateDrop
  })

  // Names of everyone on the other end of the affected relationships.
  const otherIds = [
    ...preview.moved,
    ...preview.droppedPair,
    ...preview.droppedDuplicates
  ].map((r) => r.otherId)
  const names = new Map<string, string>()
  if (otherIds.length > 0) {
    const { data, error } = await supabase
      .from('persons')
      .select('id, full_name')
      .in('id', otherIds)
    if (error) return { error: error.message }
    for (const row of data) names.set(row.id, row.full_name)
  }
  const withNames = (rows: MergePreview['moved']): MergePreview['moved'] =>
    rows.map((r) => ({ ...r, otherName: names.get(r.otherId) ?? '' }))

  return {
    ...preview,
    moved: withNames(preview.moved),
    droppedPair: withNames(preview.droppedPair),
    droppedDuplicates: withNames(preview.droppedDuplicates)
  }
}

/**
 * Merges the dropped member into the kept one in one database transaction.
 * There is no undo; the UI asks for a backup and a typed confirmation first.
 */
export async function mergePersons(
  keepId: string,
  dropId: string
): Promise<MergeResult> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }
  if (!keepId || !dropId || keepId === dropId)
    return { error: t('mergeSameMember') }

  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('merge_persons', {
    keep_id: keepId,
    drop_id: dropId
  })
  if (error) {
    if (isMissingDatabaseFunction(error))
      return { error: t('mergeUpgradeDatabase') }
    return { error: t('mergeFailed', { error: error.message }) }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/members')
  revalidatePath('/dashboard/data')

  return { summary: data as MergeSummary }
}
