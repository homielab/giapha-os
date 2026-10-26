'use server'

import { revalidatePath } from 'next/cache'

import type { TranslationKey } from '@/lib/i18n/messages'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  BACKUP_VERSION,
  buildRestorePayload,
  isMissingRestoreFunction,
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
    allPersons = await fetchAll<PersonExport>(
      'persons',
      'id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note, created_at, updated_at',
      'created_at'
    )
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
    allCustomEvents = await fetchAll<CustomEventExport>(
      'custom_events',
      'id, name, content, event_date, location, created_by',
      'event_date'
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { error: t('loadDataError', { error: message }) }
  }

  let exportPersons = allPersons
  let exportRels = allRels
  let exportPrivateDetails = allPrivateDetails
  const exportCustomEvents = allCustomEvents

  // If a root person is selected, filter the export to only their subtree
  if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
    const includedPersonIds = new Set<string>([exportRootId])

    // Pre-calculate adjacency lists for O(1) lookup to improve performance with large datasets
    const childrenMap = new Map<string, string[]>()
    const spouseMap = new Map<string, string[]>()

    exportRels.forEach((r) => {
      if (r.type === 'biological_child' || r.type === 'adopted_child') {
        const children = childrenMap.get(r.person_a) ?? []
        children.push(r.person_b)
        childrenMap.set(r.person_a, children)
      } else if (r.type === 'marriage') {
        const spousesA = spouseMap.get(r.person_a) ?? []
        spousesA.push(r.person_b)
        spouseMap.set(r.person_a, spousesA)

        const spousesB = spouseMap.get(r.person_b) ?? []
        spousesB.push(r.person_a)
        spouseMap.set(r.person_b, spousesB)
      }
    })

    // 1. Traverse biological and adopted children recursively
    const findDescendants = (parentId: string) => {
      const children = childrenMap.get(parentId) || []
      children.forEach((childId) => {
        if (!includedPersonIds.has(childId)) {
          includedPersonIds.add(childId)
          findDescendants(childId)
        }
      })
    }
    findDescendants(exportRootId)

    // 2. Add spouses for everyone in the tree so far
    const descendantsArray = Array.from(includedPersonIds) // snapshot current members
    descendantsArray.forEach((personId) => {
      const spouses = spouseMap.get(personId) || []
      spouses.forEach((spouseId) => {
        includedPersonIds.add(spouseId)
      })
    })

    // 3. Filter the payload
    exportPersons = exportPersons.filter((p) => includedPersonIds.has(p.id))
    exportRels = exportRels.filter(
      (r) =>
        includedPersonIds.has(r.person_a) && includedPersonIds.has(r.person_b)
    )
    exportPrivateDetails = exportPrivateDetails.filter((d) =>
      includedPersonIds.has(d.person_id)
    )
    // custom_events are not person-scoped, so export all when subtree is selected
  }

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
    ['persons', payload.persons, 'importPersonsError'],
    ['relationships', payload.relationships, 'importRelationshipsError'],
    [
      'person_details_private',
      payload.person_details_private,
      'importPrivateDetailsError'
    ],
    ['custom_events', payload.custom_events, 'importEventsError']
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
