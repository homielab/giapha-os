import type { SupabaseClient } from '@supabase/supabase-js'

import type { GalleryItem } from '@/types'
import { fetchAllRows } from '@/utils/supabase/fetchAll'
import { isUuid } from '@/utils/uuid'

export const GALLERY_TAGS_TABLE = 'gallery_item_persons'

/** Thrown when the photo is saved but its member tags could not be. */
export class GalleryTagsNotSavedError extends Error {
  constructor(detail: string) {
    super(`Gallery tags not saved: ${detail}`)
    this.name = 'GalleryTagsNotSavedError'
  }
}

/** Reads `?member=`: a member id, or null for "all photos". */
export function parseGalleryMember(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && isUuid(raw) ? raw : null
}

/** Reads `?photo=`: the photo to open in the lightbox, or null. */
export function parseGalleryPhoto(
  value: string | string[] | undefined
): string | null {
  return parseGalleryMember(value)
}

/** Gallery URL for a page, member filter and (optionally) an open photo. */
export function galleryHref({
  page = 1,
  member,
  photo
}: {
  page?: number
  member?: string | null
  photo?: string | null
}) {
  const params = new URLSearchParams()
  if (member) params.set('member', member)
  if (page > 1) params.set('page', String(page))
  if (photo) params.set('photo', photo)
  const query = params.toString()
  return query ? `/dashboard/gallery?${query}` : '/dashboard/gallery'
}

/** True when both lists hold the same ids (order and repeats ignored). */
export function sameIds(a: readonly string[], b: readonly string[]) {
  const left = new Set(a)
  const right = new Set(b)
  return left.size === right.size && [...left].every((id) => right.has(id))
}

/**
 * Adds `person_ids` (the tagged members) to each photo with one query for the
 * whole page. A failed read is logged and leaves the photos untagged: the
 * gallery still works, e.g. on a database that has not been upgraded yet.
 */
export async function attachGalleryTags(
  supabase: SupabaseClient,
  items: GalleryItem[]
): Promise<GalleryItem[]> {
  if (items.length === 0) return items
  const ids = items.map((item) => item.id)
  const { data, error } = await fetchAllRows<{
    gallery_item_id: string
    person_id: string
  }>((from, to) =>
    supabase
      .from(GALLERY_TAGS_TABLE)
      .select('gallery_item_id, person_id')
      .in('gallery_item_id', ids)
      .order('gallery_item_id')
      .order('person_id')
      .range(from, to)
  )
  if (error) console.error('Cannot load gallery tags:', error.message)

  const byItem = new Map<string, string[]>()
  for (const row of error ? [] : data) {
    const list = byItem.get(row.gallery_item_id)
    if (list) list.push(row.person_id)
    else byItem.set(row.gallery_item_id, [row.person_id])
  }
  return items.map((item) => ({
    ...item,
    person_ids: byItem.get(item.id) ?? []
  }))
}

/**
 * Makes `personIds` the members tagged in a photo: reads the current tags,
 * deletes the ones that went and inserts the new ones. Row-level security
 * hides rows from a delete without an error, so a delete that removed nothing
 * throws too. Throws `GalleryTagsNotSavedError`; the photo itself is already
 * saved by then.
 */
export async function saveGalleryTags(
  supabase: SupabaseClient,
  itemId: string,
  personIds: readonly string[]
): Promise<void> {
  const wanted = [...new Set(personIds)]
  const { data: current, error: readError } = await supabase
    .from(GALLERY_TAGS_TABLE)
    .select('person_id')
    .eq('gallery_item_id', itemId)
  if (readError) throw new GalleryTagsNotSavedError(readError.message)

  const have = new Set((current ?? []).map((row) => row.person_id as string))
  const toRemove = [...have].filter((id) => !wanted.includes(id))
  const toAdd = wanted.filter((id) => !have.has(id))

  if (toRemove.length > 0) {
    const { data, error } = await supabase
      .from(GALLERY_TAGS_TABLE)
      .delete()
      .eq('gallery_item_id', itemId)
      .in('person_id', toRemove)
      .select('person_id')
    if (error) throw new GalleryTagsNotSavedError(error.message)
    if (!data || data.length === 0)
      throw new GalleryTagsNotSavedError('no tag removed')
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from(GALLERY_TAGS_TABLE)
      .insert(
        toAdd.map((person_id) => ({ gallery_item_id: itemId, person_id }))
      )
    if (error) throw new GalleryTagsNotSavedError(error.message)
  }
}
