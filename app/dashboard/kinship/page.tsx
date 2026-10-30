import { Suspense } from 'react'

import KinshipFinder from '@/components/KinshipFinder'
import { AvatarUrlProvider } from '@/context/AvatarUrlContext'
import { getServerTranslations } from '@/lib/i18n/server'
import { NO_SIGNED_AVATAR_URLS } from '@/utils/avatar'
import { signAvatarUrls } from '@/utils/avatarSigning'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getProfile, getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('kinshipPageTitle') }
}

export default async function KinshipPage() {
  const [{ t }, supabase, profile] = await Promise.all([
    getServerTranslations(),
    getSupabase(),
    getProfile()
  ])

  const [{ data: persons }, { data: relationships }] = await Promise.all([
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('persons')
        .select(
          'id, full_name, gender, birth_year, birth_month, birth_day, birth_order, generation, is_in_law, avatar_url, updated_at'
        )
        .order('birth_year', { ascending: true, nullsFirst: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('relationships')
        .select('type, person_a, person_b')
        .order('id')
        .range(from, to)
    )
  ])

  const signedAvatarUrls = profile?.is_active
    ? await signAvatarUrls(supabase, persons ?? [])
    : NO_SIGNED_AVATAR_URLS

  return (
    <div className='relative flex w-full flex-1 flex-col pb-12'>
      <div className='relative z-20 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8'>
        <h1 className='title'>{t('kinshipPageTitle')}</h1>
        <p className='mt-1 text-sm text-stone-500'>
          {t('kinshipPageDescription')}
        </p>
      </div>

      <main className='mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 lg:px-8'>
        <Suspense fallback={null}>
          <AvatarUrlProvider signedUrls={signedAvatarUrls}>
            <KinshipFinder
              persons={persons ?? []}
              relationships={relationships ?? []}
            />
          </AvatarUrlProvider>
        </Suspense>
      </main>
    </div>
  )
}
