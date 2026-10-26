import FamilyStats from '@/components/FamilyStats'
import { getServerTranslations } from '@/lib/i18n/server'
import {
  computeFamilyStats,
  STATS_PERSON_COLUMNS,
  STATS_RELATIONSHIP_COLUMNS,
  type StatsPerson,
  type StatsRelationship
} from '@/utils/familyStats'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata() {
  const { t } = await getServerTranslations()

  return { title: t('statsPageTitle') }
}

export default async function StatsPage() {
  const [{ t }, supabase] = await Promise.all([
    getServerTranslations(),
    getSupabase()
  ])

  // Only the columns the counts need, and only marriages; the totals are
  // computed here so the browser receives the numbers, not the whole family.
  const [{ data: persons }, { data: relationships }] = await Promise.all([
    fetchAllRowsOrThrow<StatsPerson>((from, to) =>
      supabase
        .from('persons')
        .select(STATS_PERSON_COLUMNS)
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow<StatsRelationship>((from, to) =>
      supabase
        .from('relationships')
        .select(STATS_RELATIONSHIP_COLUMNS)
        .eq('type', 'marriage')
        .order('id')
        .range(from, to)
    )
  ])

  const stats = computeFamilyStats(persons ?? [], relationships ?? [])

  return (
    <div className='relative flex w-full flex-1 flex-col pb-12'>
      <div className='relative z-20 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
        <h1 className='title'>{t('statsPageTitle')}</h1>
        <p className='mt-1 text-sm text-stone-500'>
          {t('statsPageDescription')}
        </p>
      </div>

      <main className='mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8'>
        <FamilyStats stats={stats} />
      </main>
    </div>
  )
}
