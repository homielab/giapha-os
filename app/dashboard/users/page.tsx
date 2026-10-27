import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import AdminUserList from '@/components/AdminUserList'
import { getServerTranslations } from '@/lib/i18n/server'
import { AdminUserData } from '@/types'
import { getProfile, getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('manageUsers') }
}

export default async function AdminUsersPage() {
  const [{ t }, profile] = await Promise.all([
    getServerTranslations(),
    getProfile()
  ])
  const isAdmin = profile?.role === 'admin' && profile.is_active

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const supabase = await getSupabase()

  // Fetch users via RPC
  const { data: users, error } = await supabase.rpc('get_admin_users')

  // An empty list would look like "no users" (e.g. migration not applied yet),
  // so show the error with a retry instead.
  if (error) {
    console.error('Error fetching users:', error)
  }

  const typedUsers = (users ?? []) as AdminUserData[]

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        <div className='mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center'>
          <div>
            <h1 className='title'>{t('manageUsers')}</h1>
            <p className='mt-2 text-sm text-stone-500 sm:text-sm'>
              {t('manageUsersDescription')}
            </p>
          </div>
        </div>
        {error ? (
          <div
            role='alert'
            className='flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 sm:flex-row sm:items-center sm:justify-between'>
            <span>{t('manageUsersLoadError')}</span>
            <Link href='/dashboard/users' className='btn shrink-0'>
              {t('tryAgain')}
            </Link>
          </div>
        ) : (
          <AdminUserList initialUsers={typedUsers} currentUserId={profile.id} />
        )}
      </div>
    </main>
  )
}
