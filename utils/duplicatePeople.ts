import { SupabaseClient } from '@supabase/supabase-js'

import { normalizeSearchText } from '@/utils/search'
import { fetchAllRows } from '@/utils/supabase/fetchAll'

export interface PossibleDuplicate {
  id: string
  full_name: string
  birth_year: number | null
}

/**
 * Finds members with the same name (ignoring accents, case and extra spaces)
 * and the same birth year; two members without a birth year match on the name
 * alone. The database has no unaccent, so the rows of that birth year are
 * read and compared here. Throws when a query fails.
 */
export async function findPossibleDuplicates(
  supabase: SupabaseClient,
  fullName: string,
  birthYear: number | null
): Promise<PossibleDuplicate[]> {
  const name = normalizeSearchText(fullName)
  if (name === '') return []

  const { data, error } = await fetchAllRows<PossibleDuplicate>((from, to) => {
    const query = supabase.from('persons').select('id, full_name, birth_year')
    return (
      birthYear == null
        ? query.is('birth_year', null)
        : query.eq('birth_year', birthYear)
    )
      .order('id')
      .range(from, to)
  })
  if (error) throw error

  return data.filter((p) => normalizeSearchText(p.full_name) === name)
}
