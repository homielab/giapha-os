'use server'

import { revalidatePath } from 'next/cache'

import type { TranslationKey } from '@/lib/i18n/messages'
import { getServerTranslations } from '@/lib/i18n/server'
import { remapImportIds } from '@/utils/appendImport'
import {
  BACKUP_VERSION,
  buildRestorePayload,
  isMissingRestoreFunction,
  legacyCustomEventRows,
  legacyPersonRows,
  toCustomEventExport,
  toPersonExport,
  validateImportPayload,
  type BackupPayload,
  type CustomEventExport,
  type ImportPayload,
  type PersonDetailsPrivateExport,
  type PersonExport,
  type RelationshipExport,
  type RestoreCounts,
  type RestorePayload,
  type Translator
} from '@/utils/backupPayload'
import { filterBranch } from '@/utils/branchExport'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(
  exportRootId?: string
): Promise<BackupPayload | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) {
    return { error: t('dataAccessDenied') }
  }

  const supabase = await getSupabase()

  // Fetch ALL rows using pagination to avoid the 1000-row Supabase limit.
  // A unique tie-breaker column keeps the page boundaries stable.
  const fetchAll = async <T>(
    table: string,
    selectCols: string,
    orderBy: string,
    tieBreaker = 'id'
  ): Promise<T[]> => {
    const { data, error } = await fetchAllRows<T>((from, to) => {
      let query = supabase
        .from(table)
        .select(selectCols)
        .order(orderBy, { ascending: true })
      if (tieBreaker !== orderBy) query = query.order(tieBreaker)
      return query.range(from, to) as unknown as PromiseLike<{
        data: T[] | null
        error: { message: string } | null
      }>
    })
    if (error) throw new Error(error.message)
    return data
  }

  let allPersons: PersonExport[] = []
  let allRels: RelationshipExport[] = []
  let allPrivateDetails: PersonDetailsPrivateExport[] = []
  let allCustomEvents: CustomEventExport[] = []

  try {
    // '*' also works on databases without the burial_place column yet.
    allPersons = (
      await fetchAll<PersonExport>('persons', '*', 'created_at')
    ).map(toPersonExport)
    allRels = await fetchAll<RelationshipExport>(
      'relationships',
      'id, type, person_a, person_b, note, created_at, updated_at',
      'created_at'
    )
    // person_details_private might not have created_at, order by person_id
    allPrivateDetails = await fetchAll<PersonDetailsPrivateExport>(
      'person_details_private',
      'person_id, phone_number, occupation, current_residence',
      'person_id',
      'person_id'
    )
    // '*' also works on databases without the recurrence column yet.
    allCustomEvents = (
      await fetchAll<CustomEventExport>('custom_events', '*', 'event_date')
    ).map(toCustomEventExport)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { error: t('loadDataError', { error: message }) }
  }

  // A selected root limits the export to its branch (custom events have no
  // person link, so they are always exported in full).
  const {
    persons: exportPersons,
    relationships: exportRels,
    details: exportPrivateDetails
  } = filterBranch(
    {
      persons: allPersons,
      relationships: allRels,
      details: allPrivateDetails
    },
    exportRootId
  )
  const exportCustomEvents = allCustomEvents

  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    persons: exportPersons,
    relationships: exportRels,
    person_details_private: exportPrivateDetails,
    custom_events: exportCustomEvents
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof getSupabase>>

/**
 * Restores a backup: replaces all members, relationships, private details and
 * custom events. Runs as one database transaction through the
 * `restore_backup` function, so a failure leaves the current data untouched.
 */
export async function importData(importPayload: ImportPayload) {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) {
    return { error: t('dataAccessDenied') }
  }

  const validationError = validateImportPayload(importPayload, t)
  if (validationError) return { error: validationError }

  const supabase = await getSupabase()
  const payload = buildRestorePayload(importPayload)

  const { data, error } = await supabase.rpc('restore_backup', { payload })
  let imported: RestoreCounts
  let warning: string | undefined

  if (!error) {
    imported = data as RestoreCounts
  } else if (isMissingRestoreFunction(error)) {
    // Database not upgraded yet: fall back to the old, non-atomic restore.
    const legacy = await legacyImport(supabase, payload, t)
    if ('error' in legacy) {
      return { error: `${legacy.error} ${t('restoreUpgradeDatabase')}` }
    }
    imported = legacy
    warning = t('restoreUpgradeDatabase')
  } else {
    return { error: t('restoreTransactionError', { error: error.message }) }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/members')
  revalidatePath('/dashboard/data')

  return { success: true, imported, warning }
}

/**
 * Adds an import file (JSON backup, GEDCOM or CSV) to the current tree: every
 * member and event gets a new id, then the `append_import` database function
 * inserts the rows in one transaction. Nothing existing is deleted or
 * changed; people in both the file and the tree end up twice, for the
 * duplicate scan and merge to handle.
 */
export async function appendImportData(importPayload: ImportPayload) {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) {
    return { error: t('dataAccessDenied') }
  }

  const validationError = validateImportPayload(importPayload, t)
  if (validationError) return { error: validationError }

  const supabase = await getSupabase()
  const payload = buildRestorePayload(remapImportIds(importPayload))

  const { data, error } = await supabase.rpc('append_import', { payload })
  if (error) {
    // No non-atomic fallback: half an import would be hard to undo by hand.
    return {
      error: isMissingRestoreFunction(error)
        ? t('appendImportUpgradeDatabase')
        : t('appendImportError', { error: error.message })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/members')
  revalidatePath('/dashboard/data')

  return { success: true, imported: data as RestoreCounts }
}

/**
 * Restore path for databases without the `restore_backup` function: deletes
 * then inserts in chunks, without a transaction.
 */
async function legacyImport(
  supabase: SupabaseClient,
  payload: RestorePayload,
  t: Translator
): Promise<RestoreCounts | { error: string }> {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000'

  // Xoá theo thứ tự ràng buộc khoá ngoại
  const deletions = [
    ['custom_events', 'id', 'deleteEventsError'],
    ['relationships', 'id', 'deleteRelationshipsError'],
    ['person_details_private', 'person_id', 'deletePrivateDetailsError'],
    ['persons', 'id', 'deletePersonsError']
  ] as const
  for (const [table, column, errorKey] of deletions) {
    const { error } = await supabase.from(table).delete().neq(column, NIL_UUID)
    if (error) return { error: t(errorKey, { error: error.message }) }
  }

  const CHUNK = 200
  const insertions: Array<[string, object[], TranslationKey]> = [
    ['persons', legacyPersonRows(payload.persons), 'importPersonsError'],
    ['relationships', payload.relationships, 'importRelationshipsError'],
    [
      'person_details_private',
      payload.person_details_private,
      'importPrivateDetailsError'
    ],
    [
      'custom_events',
      legacyCustomEventRows(payload.custom_events),
      'importEventsError'
    ]
  ]
  for (const [table, rows, errorKey] of insertions) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from(table)
        .insert(rows.slice(i, i + CHUNK))
      if (error)
        return {
          error: t(errorKey, { chunk: i / CHUNK + 1, error: error.message })
        }
    }
  }

  return payload.counts
}
