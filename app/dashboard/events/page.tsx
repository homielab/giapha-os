import { Suspense } from 'react'

import EventsList from '@/components/EventsList'
import MemberDetailModal from '@/components/modal/MemberDetailModal'
import { MemberListProvider } from '@/context/MemberListContext'
import { getServerTranslations } from '@/lib/i18n/server'
import { EVENT_PERSON_COLUMNS, EVENT_PERSON_FILTER } from '@/utils/eventPersons'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase, getUser } from '@/utils/supabase/queries'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('eventsTitle') }
}

export default async function EventsPage() {
  const [{ t }, supabase, user, isAdmin] = await Promise.all([
    getServerTranslations(),
    getSupabase(),
    getUser(),
    getIsAdmin()
  ])

  const [personsRes, customEventsRes] = await Promise.all([
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('persons')
        .select(EVENT_PERSON_COLUMNS)
        .or(EVENT_PERSON_FILTER)
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('custom_events')
        // '*' includes recurrence once the database has the column.
        .select('*')
        .order('id')
        .range(from, to)
    )
  ])

  const persons = personsRes.data || []
  const customEvents = customEventsRes.data || []

  return (
    <Suspense fallback={null}>
      <MemberListProvider>
        <div className='relative flex w-full flex-1 flex-col pb-12'>
          <div className='relative z-20 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8'>
            <h1 className='title'>{t('eventsTitle')}</h1>
            <p className='mt-1 text-sm text-stone-500'>
              {t('eventsDescription')}
            </p>
          </div>

          <main className='mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 lg:px-8'>
            <EventsList
              persons={persons ?? []}
              customEvents={customEvents ?? []}
              currentUserId={user?.id ?? null}
              isAdmin={Boolean(isAdmin)}
            />
          </main>
        </div>

        {/* Modal for member details when clicking an event card */}
        <MemberDetailModal />
      </MemberListProvider>
    </Suspense>
  )
}
