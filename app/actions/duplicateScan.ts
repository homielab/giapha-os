'use server'

import { getServerTranslations } from '@/lib/i18n/server'
import {
  DUPLICATE_SCAN_PERSON_COLUMNS,
  groupPossibleDuplicates,
  type DuplicateGroup,
  type DuplicateScanPerson,
  type DuplicateScanRelationship
} from '@/utils/duplicatePeople'
import { RELATIONSHIP_COLUMNS } from '@/utils/personColumns'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

/** Groups returned to the page; the rest are only counted. */
const MAX_DUPLICATE_GROUPS = 200

export interface DuplicateScanResult {
  groups: DuplicateGroup[]
  /** Groups found beyond `MAX_DUPLICATE_GROUPS`. */
  remaining: number
}

/**
 * Scans the whole tree for members that may be the same person. Read-only
 * (two selects, nothing is written); admins only.
 */
export async function scanPossibleDuplicates(): Promise<
  DuplicateScanResult | { error: string }
> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }

  const supabase = await getSupabase()
  const [persons, relationships] = await Promise.all([
    fetchAllRows<DuplicateScanPerson>(
      (from, to) =>
        supabase
          .from('persons')
          .select(DUPLICATE_SCAN_PERSON_COLUMNS)
          .order('id')
          .range(from, to) as unknown as PromiseLike<{
          data: DuplicateScanPerson[] | null
          error: { message: string } | null
        }>
    ),
    fetchAllRows<DuplicateScanRelationship>(
      (from, to) =>
        supabase
          .from('relationships')
          .select(RELATIONSHIP_COLUMNS)
          .order('id')
          .range(from, to) as unknown as PromiseLike<{
          data: DuplicateScanRelationship[] | null
          error: { message: string } | null
        }>
    )
  ])
  if (persons.error) return { error: persons.error.message }
  if (relationships.error) return { error: relationships.error.message }

  const groups = groupPossibleDuplicates(persons.data, relationships.data)
  return {
    groups: groups.slice(0, MAX_DUPLICATE_GROUPS),
    remaining: Math.max(0, groups.length - MAX_DUPLICATE_GROUPS)
  }
}
