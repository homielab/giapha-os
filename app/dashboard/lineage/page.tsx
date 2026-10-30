import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import LineageManager from '@/components/LineageManager'
import { getServerTranslations } from '@/lib/i18n/server'
import { Person, Relationship } from '@/types'
import {
  PERSON_LIST_COLUMNS,
  RELATIONSHIP_COLUMNS
} from '@/utils/personColumns'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getProfile, getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('lineagePageTitle') }
}

export default async function LineagePage() {
  const [{ t }, profile] = await Promise.all([
    getServerTranslations(),
    getProfile()
  ])

  if (profile?.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard')
  }

  const supabase = await getSupabase()

  const [{ data: personsData }, { data: relsData }] = await Promise.all([
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('persons')
        .select(PERSON_LIST_COLUMNS)
        .order('birth_year', { ascending: true, nullsFirst: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('relationships')
        .select(RELATIONSHIP_COLUMNS)
        .order('created_at')
        .order('id')
        .range(from, to)
    )
  ])

  // Identify "roots" - people with no parents
  // PERSON_LIST_COLUMNS leaves out note/created_at; no view reads them.
  const persons = (personsData || []) as Person[]
  // RELATIONSHIP_COLUMNS leaves out note/updated_at; no view reads them.
  const relationships = (relsData || []) as Relationship[]

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='title'>{t('lineagePageTitle')}</h1>
          <p className='mt-2 max-w-2xl text-sm text-stone-500 sm:text-sm'>
            {t('lineagePageDescription')}
          </p>
          <p className='mt-3 text-sm print:hidden'>
            <Link
              href='/dashboard/lineage/book'
              className='font-medium text-amber-700 hover:underline'>
              {t('lineageBookOpen')} →
            </Link>
          </p>
        </div>

        {/* Info cards */}
        <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='rounded-2xl border border-stone-200/60 bg-white/80 p-5'>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>🌳</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  {t('lineageGenerationCardTitle')}
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  {t('lineageGenerationCardText')}
                </p>
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-4 rounded-2xl border border-stone-200/60 bg-white/80 p-5'>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>👶</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  {t('lineageBirthOrderCardTitle')}
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  {t('lineageBirthOrderCardText')}
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>💍</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  {t('lineageInLawCardTitle')}
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  {t('lineageInLawCardText')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className='rounded-2xl border border-stone-200/60 bg-white/80 p-5 sm:p-8'>
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  )
}
