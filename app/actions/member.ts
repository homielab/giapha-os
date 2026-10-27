'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getServerTranslations } from '@/lib/i18n/server'
import { deleteMember } from '@/utils/deleteMember'
import {
  applyGenerationUpdates,
  buildDescendantGenerationUpdates
} from '@/utils/generationUpdates'
import { fetchAllRows, fetchInChunks } from '@/utils/supabase/fetchAll'
import { getProfile, getSupabase, getUser } from '@/utils/supabase/queries'
import { isUuid } from '@/utils/uuid'
import { PersonNotDeletedError } from '@/utils/writeErrors'

export async function deleteMemberProfile(memberId: string) {
  const [user, { t }] = await Promise.all([getUser(), getServerTranslations()])

  if (!user) {
    return { error: t('memberDeleteAccessDenied') }
  }

  if (!isUuid(memberId)) {
    return { error: t('invalidProfile') }
  }

  const [profile, supabase] = await Promise.all([getProfile(), getSupabase()])

  if (
    !profile?.is_active ||
    (profile.role !== 'admin' && profile.role !== 'editor')
  ) {
    return {
      error: t('memberDeleteAccessDenied')
    }
  }

  // 2. Check for existing relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from('relationships')
    .select('id')
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1)

  if (relationshipError) {
    console.error('Error checking relationships:', relationshipError)
    return { error: t('relationshipCheckError') }
  }

  if (relationships && relationships.length > 0) {
    return {
      error: t('memberHasRelationships')
    }
  }

  // 3. Delete the member row, then its avatar file
  try {
    await deleteMember(supabase, memberId)
  } catch (err) {
    if (err instanceof PersonNotDeletedError) {
      return { error: t('memberDeleteAccessDenied') }
    }
    console.error('Error deleting person:', err)
    return { error: t('memberDeleteError') }
  }

  // 4. Revalidate and redirect
  revalidatePath('/dashboard/members')
  redirect('/dashboard/members')
}

export async function updateDescendantGenerationsAction(
  personId: string,
  generationDelta: number
) {
  const [user, { t }] = await Promise.all([getUser(), getServerTranslations()])

  if (!user) {
    return { error: t('memberEditAccessDenied') }
  }

  if (!isUuid(personId)) {
    return { error: t('invalidProfile') }
  }

  if (
    generationDelta === 0 ||
    !Number.isInteger(generationDelta) ||
    Math.abs(generationDelta) > 100
  ) {
    return generationDelta === 0
      ? { success: true }
      : { error: t('invalidGenerationDelta') }
  }

  const [profile, supabase] = await Promise.all([getProfile(), getSupabase()])

  if (
    !profile?.is_active ||
    (profile.role !== 'admin' && profile.role !== 'editor')
  ) {
    return {
      error: t('memberEditAccessDenied')
    }
  }

  // 1. Fetch all parent-child relationships
  const { data: relationships, error: relError } = await fetchAllRows<{
    person_a: string
    person_b: string
    type: string
  }>((from, to) =>
    supabase
      .from('relationships')
      .select('person_a, person_b, type')
      .in('type', ['biological_child', 'adopted_child'])
      .order('id')
      .range(from, to)
  )

  if (relError) {
    console.error('Error fetching relationships:', relError)
    return { error: t('relationshipsFetchError') }
  }

  // Build children map (person_a is parent, person_b is child)
  const childrenMap = new Map<string, string[]>()
  relationships.forEach((r) => {
    const children = childrenMap.get(r.person_a) ?? []
    children.push(r.person_b)
    childrenMap.set(r.person_a, children)
  })

  // 2. Find all descendants using BFS
  const descendants = new Set<string>()
  const queue = [personId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current) || []
    for (const child of children) {
      if (!descendants.has(child)) {
        descendants.add(child)
        queue.push(child)
      }
    }
  }

  if (descendants.size === 0) return { success: true }
  const descendantIds = Array.from(descendants)

  // 3. Fetch current generations of descendants
  const { data: persons, error: personsError } = await fetchInChunks<
    string,
    { id: string; generation: number | null }
  >(descendantIds, (ids) =>
    supabase.from('persons').select('id, generation').in('id', ids)
  )

  if (personsError) {
    console.error('Error fetching persons:', personsError)
    return { error: t('generationsFetchError') }
  }

  // 4. Save all new generations at once, in one transaction.
  const result = await applyGenerationUpdates(
    supabase,
    buildDescendantGenerationUpdates(persons, generationDelta)
  )

  if (!result.ok) {
    console.error('Error updating descendant generations:', result.error)
    return {
      error: result.legacy
        ? `${t('descendantGenerationUpdateError')} ${t('generationUpgradeDatabase')}`
        : t('generationTransactionError', { error: result.error })
    }
  }

  if (result.legacy) {
    return { success: true, warning: t('generationUpgradeDatabase') }
  }

  return { success: true }
}
