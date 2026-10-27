import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import MemberForm from '@/components/MemberForm'
import { getServerTranslations } from '@/lib/i18n/server'
import { fetchPrivateDetails } from '@/utils/privateDetails'
import { getProfile, getSupabase } from '@/utils/supabase/queries'
import { isUuid } from '@/utils/uuid'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('editMember') }
}

export default async function EditMemberPage({ params }: PageProps) {
  const [{ t }, { id }, profile] = await Promise.all([
    getServerTranslations(),
    params,
    getProfile()
  ])
  // A shortened or mistyped link is a 404, not a database error.
  if (!isUuid(id)) notFound()

  const isAdmin = profile?.role === 'admin' && profile.is_active
  const isEditor = profile?.role === 'editor' && profile.is_active
  if (!isAdmin && !isEditor) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-stone-50'>
        <div className='text-center'>
          <h1 className='text-2xl font-semibold text-stone-800'>
            {t('accessDenied')}
          </h1>
          <p className='mt-2 text-stone-600'>{t('noEditMemberPermission')}</p>
        </div>
      </div>
    )
  }

  const supabase = await getSupabase()

  // Fetch Public Data
  // A database error is thrown to the dashboard error page; only a missing
  // row is a 404.
  const { data: person, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!person) notFound()

  // Fetch Private Data
  let privateData = null
  if (isAdmin) {
    privateData = await fetchPrivateDetails(supabase, id)
  }

  const initialData = isAdmin ? { ...person, ...privateData } : { ...person }

  return (
    <div className='relative flex w-full flex-1 flex-col pb-8'>
      {/* Decorative background blurs */}
      {/* <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" /> */}
      {/* <div className="absolute top-[40%] -right-[10%] w-[400px] h-[400px] bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className='relative z-20 mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-3'>
          <Link
            href={`/dashboard/members/${id}`}
            className='-ml-2 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600'
            title={t('backToMembers')}>
            <ArrowLeft className='size-5' />
          </Link>
          <h1 className='title'>{t('editMember')}</h1>
        </div>
      </div>

      <main className='relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8'>
        <MemberForm
          initialData={initialData}
          isEditing={true}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  )
}
