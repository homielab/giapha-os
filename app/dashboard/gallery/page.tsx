import GalleryClient from '@/components/GalleryClient'
import { getServerTranslations } from '@/lib/i18n/server'
import type { Person } from '@/types'
import {
  GallerySigningError,
  loadGalleryPage,
  parseGalleryPage
} from '@/utils/gallery'
import {
  attachGalleryTags,
  parseGalleryMember,
  parseGalleryPhoto
} from '@/utils/galleryTags'
import { PERSON_PICKER_COLUMNS } from '@/utils/personColumns'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return {
    title: t('galleryTitle'),
    description: t('galleryDescription')
  }
}

export default async function GalleryPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string | string[]
    member?: string | string[]
    photo?: string | string[]
  }>
}) {
  const [supabase, isAdmin, params] = await Promise.all([
    getSupabase(),
    getIsAdmin(),
    searchParams
  ])

  const memberId = parseGalleryMember(params.member)
  const photoId = parseGalleryPhoto(params.photo)

  let gallery
  try {
    gallery = await loadGalleryPage(
      supabase,
      parseGalleryPage(params.page),
      memberId
    )
  } catch (error) {
    if (!(error instanceof GallerySigningError)) throw error
    const { t } = await getServerTranslations()
    return (
      <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
        <div
          role='alert'
          className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800'>
          <h1 className='mb-2 font-serif text-xl font-semibold'>
            {t('galleryLoadErrorTitle')}
          </h1>
          <p className='text-sm'>{t('galleryLoadErrorDescription')}</p>
        </div>
      </main>
    )
  }
  const { page, pageCount, total } = gallery
  const [items, { data: persons }] = await Promise.all([
    attachGalleryTags(supabase, gallery.items),
    // Names for the member filter, the tags and the tag picker.
    fetchAllRowsOrThrow<Person>(
      (from, to) =>
        supabase
          .from('persons')
          .select(PERSON_PICKER_COLUMNS)
          .order('full_name')
          .order('id')
          .range(from, to) as unknown as PromiseLike<{
          data: Person[] | null
          error: { message: string } | null
        }>
    )
  ])

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      <GalleryClient
        items={items}
        page={page}
        pageCount={pageCount}
        total={total}
        isAdmin={isAdmin}
        persons={persons}
        memberId={memberId}
        photoId={photoId}
      />
    </main>
  )
}
