import type { SupabaseClient } from '@supabase/supabase-js'

import type { GalleryItem } from '@/types'
import { getGalleryStoragePath } from '@/utils/supabase/storage-path'

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
