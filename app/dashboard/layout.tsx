import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import config from '@/app/config'
import DashboardHeader from '@/components/DashboardHeader'
import Footer from '@/components/Footer'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import LogoutButton from '@/components/LogoutButton'
import { UserProvider } from '@/components/UserProvider'
import { getServerTranslations } from '@/lib/i18n/server'
import { getProfile, getUser } from '@/utils/supabase/queries'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [{ t }, user] = await Promise.all([getServerTranslations(), getUser()])

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfile()

  if (!profile?.is_active) {
    return (
      <div className='flex min-h-screen flex-col bg-neutral font-sans text-primary'>
        <header className='sticky top-0 z-30 border-b border-stone-200 bg-white/80 transition-colors duration-200'>
          <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center gap-4'>
              <Link href='/' className='group flex items-center gap-2'>
                <h1 className='font-serif text-xl font-semibold text-stone-800 transition-colors group-hover:text-amber-700 sm:text-2xl'>
                  {config.siteName}
                </h1>
              </Link>
            </div>
            <div className='flex items-center gap-3'>
              <LanguageSwitcher />
              <div className='w-32'>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        <main className='flex flex-1 flex-col items-center justify-center p-4'>
          <div className='card-feature w-full max-w-md text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600'>
              <svg
                className='size-8'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </div>
            <h2 className='mb-2 font-serif text-2xl font-semibold text-stone-800'>
              {t('pendingTitle')}
            </h2>
            <p className='text-stone-600'>{t('pendingDescription')}</p>
            <p className='mt-4 text-sm text-stone-500 italic'>
              {t('pendingNote')}
            </p>
          </div>
        </main>
        <Footer className='mt-auto border-t border-stone-200 bg-white' />
      </div>
    )
  }

  return (
    <UserProvider user={user} profile={profile}>
      <div className='flex min-h-screen flex-col bg-neutral font-sans text-primary print:bg-white'>
        <DashboardHeader />
        {children}
        <Footer
          className='mt-auto border-t border-stone-200 bg-white'
          showDisclaimer={true}
        />
      </div>
    </UserProvider>
  )
}
