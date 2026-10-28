import type { SupabaseClient } from '@supabase/supabase-js'

import type { GalleryItem } from '@/types'
import { getGalleryStoragePath } from '@/utils/supabase/storage-path'
import { GalleryItemNotUpdatedError } from '@/utils/writeErrors'

export const GALLERY_PAGE_SIZE = 24
export const SIGNED_URL_TTL_SECONDS = 60 * 60

export interface GalleryPage {
  items: GalleryItem[]
  page: number
  pageCount: number
  total: number
}

// Reads `?page=` (1-based). Anything that is not a positive integer is page 1.
export function parseGalleryPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function getGalleryPageCount(total: number) {
  return Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE))
}

function pageRange(page: number): [number, number] {
  const from = (page - 1) * GALLERY_PAGE_SIZE
  return [from, from + GALLERY_PAGE_SIZE - 1]
}

function fetchPage(supabase: SupabaseClient, page: number) {
  const [from, to] = pageRange(page)
  return supabase
    .from('gallery_items')
    .select('*', { count: 'exact' })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
}

// Loads one page of the gallery and signs all of its image URLs in a single
// storage request. A page past the end falls back to the last page.
export async function loadGalleryPage(
  supabase: SupabaseClient,
  requestedPage: number
): Promise<GalleryPage> {
  let page = Math.max(1, Math.floor(requestedPage) || 1)
  let { data, count, error } = await fetchPage(supabase, page)

  // PostgREST answers 416 (PGRST103) when the offset is past the last row.
  if (error?.code === 'PGRST103' && page > 1) {
    const { count: total } = await supabase
      .from('gallery_items')
      .select('id', { count: 'exact', head: true })
    page = getGalleryPageCount(total ?? 0)
    ;({ data, count, error } = await fetchPage(supabase, page))
  }

  if (error) throw error

  const rows = (data ?? []) as GalleryItem[]
  const total = count ?? rows.length
  const paths = rows.map((item) => getGalleryStoragePath(item.image_url))
  const signedUrls = new Map<string, string>()

  const toSign = [...new Set(paths.filter(Boolean))]
  if (toSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from('gallery')
      .createSignedUrls(toSign, SIGNED_URL_TTL_SECONDS)
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrls.set(entry.path, entry.signedUrl)
      }
    }
  }

  return {
    items: rows.map((item, index) => ({
      ...item,
      image_url: signedUrls.get(paths[index]) ?? '',
      storage_path: paths[index]
    })),
    page,
    pageCount: getGalleryPageCount(total),
    total
  }
}

/** Thrown when the database accepted the delete but removed no row (RLS). */
export class GalleryItemNotDeletedError extends Error {
  constructor() {
    super('Gallery item not deleted')
    this.name = 'GalleryItemNotDeletedError'
  }
}

/**
 * Deletes a gallery item: the row first, the stored file second. Row-level
 * security hides rows from a delete without an error, so `.select('id')` is
 * used and zero rows throw `GalleryItemNotDeletedError` with the file left
 * untouched. A failed file removal after the row is gone only leaves an
 * orphan file, so it is logged and reported as `fileRemoved: false`.
 */
export async function deleteGalleryItem(
  supabase: SupabaseClient,
  item: Pick<GalleryItem, 'id' | 'image_url' | 'storage_path'>
): Promise<{ fileRemoved: boolean }> {
  const { data, error } = await supabase
    .from('gallery_items')
    .delete()
    .eq('id', item.id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new GalleryItemNotDeletedError()

  const storagePath = item.storage_path || getGalleryStoragePath(item.image_url)
  if (!storagePath) return { fileRemoved: true }

  return { fileRemoved: await removeGalleryFile(supabase, storagePath) }
}

/**
 * Removes one file from the `gallery` bucket. Never throws: a failed removal
 * only leaves an orphan file, so it is logged and reported as `false`.
 */
export async function removeGalleryFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('gallery')
      .remove([storagePath])
    if (error) throw error
    return true
  } catch (err) {
    console.error('Gallery file was not removed', storagePath, err)
    return false
  }
}

export interface GalleryItemFields {
  title: string
  description: string | null
  event_date: string | null
}

/**
 * Saves a gallery item (insert, or update when `initialData` is given) that
 * points at `imagePath`. `uploadedPath` is the file uploaded just now for this
 * save, if any.
 *
 * - The database write fails: the freshly uploaded file is removed so it does
 *   not stay behind, then the error is rethrown.
 * - An update succeeds and replaced the image: the old file is removed, unless
 *   another row still points at it. A failed removal is only logged.
 *
 * Upload names are unique, so two rows normally never share a file; the lookup
 * guards rows that were created or imported by other means.
 */
export async function saveGalleryItem(
  supabase: SupabaseClient,
  options: {
    initialData?: Pick<GalleryItem, 'id' | 'image_url' | 'storage_path'> | null
    fields: GalleryItemFields
    imagePath: string
    uploadedPath?: string | null
    createdBy?: string | null
  }
): Promise<void> {
  const { initialData, fields, imagePath, uploadedPath, createdBy } = options
  const itemData = { ...fields, image_url: imagePath }

  try {
    if (initialData) {
      const { data: updated, error } = await supabase
        .from('gallery_items')
        .update(itemData)
        .eq('id', initialData.id)
        .select('id')
      if (error) throw error
      if (!updated || updated.length === 0) {
        throw new GalleryItemNotUpdatedError()
      }
    } else {
      const { error } = await supabase
        .from('gallery_items')
        .insert([{ ...itemData, created_by: createdBy || null }])
      if (error) throw error
    }
  } catch (err) {
    if (uploadedPath) await removeGalleryFile(supabase, uploadedPath)
    throw err
  }

  if (!initialData) return
  const oldPath =
    initialData.storage_path || getGalleryStoragePath(initialData.image_url)
  if (!oldPath || oldPath === imagePath) return

  try {
    const { data: stillUsed, error } = await supabase
      .from('gallery_items')
      .select('id')
      .like('image_url', `%${oldPath}%`)
      .limit(1)
    if (error) throw error
    if (stillUsed && stillUsed.length > 0) return
  } catch (err) {
    console.error('Old gallery file was not removed', oldPath, err)
    return
  }
  await removeGalleryFile(supabase, oldPath)
}
