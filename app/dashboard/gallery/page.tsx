import GalleryClient from '@/components/GalleryClient'
import { getServerTranslations } from '@/lib/i18n/server'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'
import { getGalleryStoragePath } from '@/utils/supabase/storage-path'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return {
    title: t('galleryTitle'),
    description: t('galleryDescription')
  }
}

export default async function GalleryPage() {
  const [supabase, isAdmin] = await Promise.all([getSupabase(), getIsAdmin()])

  const { data: items } = await supabase
    .from('gallery_items')
    .select('*')
    .order('event_date', { ascending: false, nullsFirst: false })

  const signedItems = await Promise.all(
    (items || []).map(async (item) => {
      const storagePath = getGalleryStoragePath(item.image_url)
      const { data } = await supabase.storage
        .from('gallery')
        .createSignedUrl(storagePath, 60 * 60)

      return {
        ...item,
        image_url: data?.signedUrl || '',
        storage_path: storagePath
      }
    })
  )

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      <GalleryClient
        key={signedItems.length}
        initialItems={signedItems}
        isAdmin={isAdmin}
      />
    </main>
  )
}
