'use server'

import { getServerTranslations } from '@/lib/i18n/server'
import {
  DATA_CHECK_KINDS,
  DATA_CHECK_PERSON_COLUMNS,
  runDataChecks,
  type DataCheckFinding,
  type DataCheckKind,
  type DataCheckPerson,
  type DataCheckRelationship
} from '@/utils/dataChecks'
import { RELATIONSHIP_COLUMNS } from '@/utils/personColumns'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

/** Findings of one kind returned to the page; the rest are only counted. */
const MAX_FINDINGS_PER_KIND = 200

export interface DataCheckResult {
  /** At most `MAX_FINDINGS_PER_KIND` of each kind. */
  findings: DataCheckFinding[]
  /** Every finding of each kind, shown or not. */
  counts: Record<DataCheckKind, number>
}

/**
 * Checks the whole tree for impossible dates, repeated relationships and missing basics.
 * Read-only (two selects, nothing is written); admins only.
 */
export async function checkTreeData(): Promise<
  DataCheckResult | { error: string }
> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }

  const supabase = await getSupabase()
  const [persons, relationships] = await Promise.all([
    fetchAllRows<DataCheckPerson>(
      (from, to) =>
        supabase
          .from('persons')
          .select(DATA_CHECK_PERSON_COLUMNS)
          .order('id')
          .range(from, to) as unknown as PromiseLike<{
          data: DataCheckPerson[] | null
          error: { message: string } | null
        }>
    ),
    fetchAllRows<DataCheckRelationship>(
      (from, to) =>
        supabase
          .from('relationships')
          .select(RELATIONSHIP_COLUMNS)
          .order('id')
          .range(from, to) as unknown as PromiseLike<{
          data: DataCheckRelationship[] | null
          error: { message: string } | null
        }>
    )
  ])
  if (persons.error) return { error: persons.error.message }
  if (relationships.error) return { error: relationships.error.message }

  const all = runDataChecks(persons.data, relationships.data)
  const counts = Object.fromEntries(
    DATA_CHECK_KINDS.map((kind) => [kind, 0])
  ) as Record<DataCheckKind, number>
  const findings = all.filter((f) => ++counts[f.kind] <= MAX_FINDINGS_PER_KIND)
  return { findings, counts }
}
