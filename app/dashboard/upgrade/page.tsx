import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getMigrationStatus } from '@/app/actions/migrations'
import UpgradeManager from '@/components/UpgradeManager'
import { getServerTranslations } from '@/lib/i18n/server'
import { getProfile } from '@/utils/supabase/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('upgrade') }
}

export default async function UpgradePage() {
  const [{ t }, profile] = await Promise.all([
    getServerTranslations(),
    getProfile()
  ])

  if (profile?.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard')
  }

  const migrationStatus = await getMigrationStatus()

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        <div className='mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center'>
          <div>
            <h1 className='title'>{t('upgradeCheckTitle')}</h1>
            <p className='mt-2 max-w-2xl text-sm text-stone-500 sm:text-sm'>
              {t('upgradeCheckDescription')}
            </p>
          </div>
        </div>

        <UpgradeManager initialStatus={migrationStatus} />
      </div>
    </main>
  )
}
