import type { SupabaseClient } from '@supabase/supabase-js'

import { getAvatarStoragePath } from '@/utils/avatar'
import { escapeLike } from '@/utils/supabase/escapeLike'

/**
 * Removes the avatar file of a member that was merged away, once the merge
 * has committed. The merge RPC only moves the row reference: when the kept
 * member had a photo of their own, the dropped member's file is left in the
 * `avatars` bucket with nothing pointing to it.
 *
 * The file is only removed when it lives in the `avatars` bucket (see
 * `getAvatarStoragePath`) and no remaining member still references its path
 * (matched literally: `%` and `_` in the path are escaped), which covers the kept member taking the photo over. Any error is logged and
 * leaves the file in place; the merge itself has already succeeded.
 */
export async function removeMergedAvatar(
  supabase: SupabaseClient,
  droppedAvatarUrl: string | null | undefined
): Promise<{ fileRemoved: boolean }> {
  const storagePath = getAvatarStoragePath(droppedAvatarUrl)
  if (!storagePath) return { fileRemoved: false }

  try {
    const { data: stillUsed, error: lookupError } = await supabase
      .from('persons')
      .select('id')
      .like('avatar_url', `%${escapeLike(storagePath)}%`)
      .limit(1)
    if (lookupError) throw lookupError
    if (stillUsed && stillUsed.length > 0) return { fileRemoved: false }

    const { error: fileError } = await supabase.storage
      .from('avatars')
      .remove([storagePath])
    if (fileError) throw fileError
    return { fileRemoved: true }
  } catch (err) {
    console.error('Merged avatar file was not removed', storagePath, err)
    return { fileRemoved: false }
  }
}
