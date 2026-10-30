import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import DataCheck from '@/components/DataCheck'
import DataImportExport from '@/components/DataImportExport'
import DuplicateScan from '@/components/DuplicateScan'
import LunarRecompute from '@/components/LunarRecompute'
import { getServerTranslations } from '@/lib/i18n/server'
import { restoreMaxBytes } from '@/utils/restoreLimit'
import { getProfile } from '@/utils/supabase/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('backupTitle') }
}

export default async function DataManagementPage() {
  const [{ t }, profile] = await Promise.all([
    getServerTranslations(),
    getProfile()
  ])

  if (profile?.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard')
  }

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        <div className='mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center'>
          <div>
            <h1 className='title'>{t('backupTitle')}</h1>
            <p className='mt-2 max-w-2xl text-sm text-stone-500 sm:text-sm'>
              {t('backupDescription')}
            </p>
          </div>
        </div>

        <div className='space-y-6'>
          <DataImportExport restoreMaxBytes={restoreMaxBytes()} />
          <LunarRecompute />
          <DuplicateScan />
          <DataCheck />
        </div>
      </div>
    </main>
  )
}
