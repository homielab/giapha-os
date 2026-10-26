import GalleryClient from '@/components/GalleryClient'
import { getServerTranslations } from '@/lib/i18n/server'
import { loadGalleryPage, parseGalleryPage } from '@/utils/gallery'
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
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const [supabase, isAdmin, params] = await Promise.all([
    getSupabase(),
    getIsAdmin(),
    searchParams
  ])

  const { items, page, pageCount, total } = await loadGalleryPage(
    supabase,
    parseGalleryPage(params.page)
  )

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      <GalleryClient
        items={items}
        page={page}
        pageCount={pageCount}
        total={total}
        isAdmin={isAdmin}
      />
    </main>
  )
}
