import type { SupabaseClient } from '@supabase/supabase-js'

import { getAvatarStoragePath } from '@/utils/avatar'
import { PersonNotDeletedError } from '@/utils/writeErrors'

/**
 * Deletes a member: the row first, the avatar file second. Row-level security
 * hides rows from a delete without an error, so `.select('id')` is used and
 * zero rows throw `PersonNotDeletedError` with the file left untouched. A
 * failed file removal after the row is gone only leaves an orphan file, so it
 * is logged and reported as `fileRemoved: false`. Only a path inside the
 * `avatars` bucket (see `getAvatarStoragePath`) is ever removed.
 */
export async function deleteMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ fileRemoved: boolean }> {
  const { data: person, error: loadError } = await supabase
    .from('persons')
    .select('avatar_url')
    .eq('id', memberId)
    .maybeSingle()
  if (loadError) throw loadError

  const { data, error } = await supabase
    .from('persons')
    .delete()
    .eq('id', memberId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new PersonNotDeletedError()

  const storagePath = getAvatarStoragePath(
    (person as { avatar_url?: string | null } | null)?.avatar_url
  )
  if (!storagePath) return { fileRemoved: true }

  try {
    const { error: fileError } = await supabase.storage
      .from('avatars')
      .remove([storagePath])
    if (fileError) throw fileError
    return { fileRemoved: true }
  } catch (err) {
    console.error('Avatar file was not removed', storagePath, err)
    return { fileRemoved: false }
  }
}
