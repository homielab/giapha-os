import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reads a member's admin-only contact details. A person without any returns
 * `null`; a failed read throws, so callers never mistake "could not read" for
 * "nothing stored" (saving a form built from that would delete the row).
 */
export async function fetchPrivateDetails(
  supabase: SupabaseClient,
  personId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('person_details_private')
    .select('*')
    .eq('person_id', personId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
