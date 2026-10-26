'use server'

import { revalidatePath } from 'next/cache'

import { getServerTranslations } from '@/lib/i18n/server'
import {
  findLunarMismatches,
  LUNAR_RECOMPUTE_COLUMNS,
  parseRecomputeIds,
  type LunarRecomputeRow,
  type LunarRecomputeSource
} from '@/utils/lunarRecompute'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

// Ids per `.in()` filter, kept short enough for the request URL.
const ID_CHUNK = 200
// Row updates sent at the same time.
const UPDATE_CONCURRENCY = 20

export interface LunarRecomputeApplyResult {
  /** Rows whose lunar death date was replaced. */
  updated: number
  /** Rows left alone: deleted, already correct, or edited since the preview. */
  skipped: number
  /** Rows the database refused to update. */
  failed: number
}

/**
 * Lists the members whose saved lunar death date differs from the one
 * computed from their solar death date with the Vietnamese calendar.
 * Read-only; admins only.
 */
export async function previewLunarRecompute(): Promise<
  { rows: LunarRecomputeRow[] } | { error: string }
> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }

  const supabase = await getSupabase()
  const { data, error } = await fetchAllRows<LunarRecomputeSource>(
    (from, to) =>
      supabase
        .from('persons')
        .select(LUNAR_RECOMPUTE_COLUMNS)
        .not('death_year', 'is', null)
        .not('death_month', 'is', null)
        .not('death_day', 'is', null)
        .not('death_lunar_year', 'is', null)
        .not('death_lunar_month', 'is', null)
        .not('death_lunar_day', 'is', null)
        .order('id')
        .range(from, to) as unknown as PromiseLike<{
        data: LunarRecomputeSource[] | null
        error: { message: string } | null
      }>
  )
  if (error) return { error: error.message }

  return {
    rows: findLunarMismatches(data).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'vi')
    )
  }
}

/**
 * Replaces the lunar death date of the given members with the recomputed one.
 *
 * The new value is computed again on the server from the current row, and
 * each update only matches while the solar and lunar dates are still the ones
 * it was computed from, so a member edited since the preview is skipped
 * instead of overwritten. Rows are updated one by one (PostgREST has no
 * multi-row update with different values); every row update is atomic and
 * running the tool again picks up any row that failed. Admins only.
 */
export async function applyLunarRecompute(
  ids: string[]
): Promise<LunarRecomputeApplyResult | { error: string }> {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { error: t('dataAccessDenied') }

  const validIds = parseRecomputeIds(ids)
  if (!validIds) return { error: t('lunarRecomputeInvalidSelection') }

  const supabase = await getSupabase()

  const sources: LunarRecomputeSource[] = []
  for (let i = 0; i < validIds.length; i += ID_CHUNK) {
    const { data, error } = await supabase
      .from('persons')
      .select(LUNAR_RECOMPUTE_COLUMNS)
      .in('id', validIds.slice(i, i + ID_CHUNK))
    if (error) return { error: error.message }
    sources.push(...((data ?? []) as LunarRecomputeSource[]))
  }

  const rows = findLunarMismatches(sources)
  let updated = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += UPDATE_CONCURRENCY) {
    const results = await Promise.all(
      rows.slice(i, i + UPDATE_CONCURRENCY).map((row) =>
        supabase
          .from('persons')
          .update({
            death_lunar_year: row.recomputed.year,
            death_lunar_month: row.recomputed.month,
            death_lunar_day: row.recomputed.day
          })
          .eq('id', row.id)
          .eq('death_year', row.solar.year)
          .eq('death_month', row.solar.month)
          .eq('death_day', row.solar.day)
          .eq('death_lunar_year', row.stored.year)
          .eq('death_lunar_month', row.stored.month)
          .eq('death_lunar_day', row.stored.day)
          .select('id')
      )
    )
    for (const { data, error } of results) {
      if (error) failed++
      else updated += data?.length ?? 0
    }
  }

  if (updated > 0) {
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/members')
    revalidatePath('/dashboard/events')
  }

  return { updated, failed, skipped: validIds.length - updated - failed }
}
