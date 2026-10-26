import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import DeleteMemberButton from '@/components/DeleteMemberButton'
import MemberDetailContent from '@/context/MemberDetailContent'
import { getServerTranslations } from '@/lib/i18n/server'
import { fetchPrivateDetails } from '@/utils/privateDetails'
import { getProfile, getSupabase } from '@/utils/supabase/queries'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const [{ t }, { id }, supabase] = await Promise.all([
    getServerTranslations(),
    params,
    getSupabase()
  ])
  const { data } = await supabase
    .from('persons')
    .select('full_name')
    .eq('id', id)
    .maybeSingle()

  return { title: data?.full_name || t('familyTree') }
}

export default async function MemberDetailPage({ params }: PageProps) {
  const [{ t }, { id }, profile] = await Promise.all([
    getServerTranslations(),
    params,
    getProfile()
  ])

  const isAdmin = profile?.role === 'admin' && profile.is_active
  const canEdit =
    profile?.is_active === true &&
    (profile.role === 'admin' || profile.role === 'editor')

  const supabase = await getSupabase()

  // Fetch Person Public Data
  // A database error is thrown to the dashboard error page; only a missing
  // row is a 404.
  const { data: person, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!person) notFound()

  // Fetch Private Data if Admin
  let privateData = null
  if (isAdmin) {
    privateData = await fetchPrivateDetails(supabase, id)
  }

  return (
    <div className='relative flex w-full flex-1 flex-col pb-8'>
      {/* Decorative background blurs */}
      {/* <div className="absolute -top-[20%] left-0 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" /> */}
      {/* <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className='relative z-20 mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8'>
        <div className='flex items-center gap-3'>
          <Link
            href='/dashboard/members'
            className='-ml-2 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600'
            title={t('backToMembers')}>
            <ArrowLeft className='size-5' />
          </Link>
          <h1 className='title'>{t('memberDetails')}</h1>
        </div>
        {canEdit && (
          <div className='flex w-full items-center gap-2.5 sm:w-auto'>
            <Link
              href={`/dashboard/members/${id}/edit`}
              className='btn w-full flex-1 sm:w-auto sm:flex-none'>
              {t('editMember')}
            </Link>
            <DeleteMemberButton memberId={id} className='flex-1 sm:flex-none' />
          </div>
        )}
      </div>

      <main className='relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8'>
        <div className='overflow-hidden rounded-2xl border border-stone-200/60 bg-white/60 transition-shadow duration-300'>
          <MemberDetailContent
            person={person}
            privateData={privateData}
            isAdmin={isAdmin}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  )
}
