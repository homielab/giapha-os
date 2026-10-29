import {
  ArrowRight,
  ArrowUpCircle,
  BarChart2,
  Cake,
  CalendarDays,
  Database,
  Flower2,
  GitMerge,
  Image as ImageIcon,
  Info,
  Network,
  Star,
  Users
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { getServerTranslations } from '@/lib/i18n/server'
import { getTodayLunar, vnToday } from '@/utils/dateHelpers'
import {
  computeEvents,
  eventHref,
  filterVisibleEvents,
  formatLunarDateLabel
} from '@/utils/eventHelpers'
import { EVENT_PERSON_COLUMNS, EVENT_PERSON_FILTER } from '@/utils/eventPersons'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries'

/* ── Event type helpers ───────────────────────────────────────────── */
const eventTypeConfig = {
  birthday: {
    icon: Cake,
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
  death_anniversary: {
    icon: Flower2,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  custom_event: {
    icon: Star,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('dashboard') }
}

export default async function DashboardLaunchpad() {
  const [{ t }, isAdmin, supabase] = await Promise.all([
    getServerTranslations(),
    getIsAdmin(),
    getSupabase()
  ])

  /* ── Fetch events data ────────────────────────────────────────── */
  const [{ data: persons }, { data: customEvents }] = await Promise.all([
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

  const allEvents = computeEvents(persons ?? [], customEvents ?? [], vnToday())
  const upcomingEvents = filterVisibleEvents(allEvents).filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= 30
  )

  const lunar = getTodayLunar(t)

  /* ── Feature lists ────────────────────────────────────────────── */
  const publicFeatures = [
    {
      title: t('familyTree'),
      description: t('familyTreeDescription'),
      icon: <Network className='size-8 text-amber-600' />,
      href: '/dashboard/members',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/60',
      hoverColor: 'hover:border-amber-400 '
    },
    {
      title: t('kinship'),
      description: t('kinshipDescription'),
      icon: <GitMerge className='size-8 text-blue-600' />,
      href: '/dashboard/kinship',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200/60',
      hoverColor: 'hover:border-blue-400 '
    },
    {
      title: t('statsPageTitle'),
      description: t('statisticsDescription'),
      icon: <BarChart2 className='size-8 text-purple-600' />,
      href: '/dashboard/stats',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200/60',
      hoverColor: 'hover:border-purple-400 '
    },
    {
      title: t('galleryTitle'),
      description: t('galleryDescriptionShort'),
      icon: <ImageIcon className='size-8 text-pink-600' />,
      href: '/dashboard/gallery',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200/60',
      hoverColor: 'hover:border-pink-400 '
    },
    {
      title: t('about'),
      description: t('aboutDescriptionShort'),
      icon: <Info className='size-8 text-stone-600' />,
      href: '/about',
      bgColor: 'bg-stone-50',
      borderColor: 'border-stone-200/60',
      hoverColor: 'hover:border-stone-400 '
    }
  ]

  const adminFeatures = [
    {
      title: t('manageUsers'),
      description: t('manageUsersDescription'),
      icon: <Users className='size-8 text-rose-600' />,
      href: '/dashboard/users',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200/60',
      hoverColor: 'hover:border-rose-400 '
    },
    {
      title: t('lineageOrder'),
      description: t('lineageDescription'),
      icon: <Network className='size-8 text-indigo-600' />,
      href: '/dashboard/lineage',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200/60',
      hoverColor: 'hover:border-indigo-400 '
    },
    {
      title: t('backupRestore'),
      description: t('backupDescriptionShort'),
      icon: <Database className='size-8 text-teal-600' />,
      href: '/dashboard/data',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/60',
      hoverColor: 'hover:border-teal-400 '
    },
    {
      title: t('upgrade'),
      description: t('upgradeDescriptionShort'),
      icon: <ArrowUpCircle className='size-8 text-amber-600' />,
      href: '/dashboard/upgrade',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/60',
      hoverColor: 'hover:border-amber-400 '
    }
  ]

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      {/* ── Today's Date & Upcoming Events ─────────────────── */}
      <section className='group relative mb-10 block overflow-hidden rounded-3xl border border-stone-200/60 bg-white transition-colors duration-300 focus-within:border-stone-400 hover:-translate-y-1 hover:border-stone-400'>
        {/* Subtle background flair */}
        <div className='pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-50/50 opacity-50 blur-3xl'></div>

        <div className='relative flex flex-col items-center gap-6 p-6 sm:gap-8 sm:p-8 md:flex-row'>
          {/* Date section */}
          <div className='flex w-full flex-col items-center gap-4 border-stone-100 text-center md:w-[35%] md:items-start md:border-r md:pr-8 md:text-left'>
            <div className='flex size-16 shrink-0 items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 text-stone-600 transition-transform duration-500 group-hover:scale-105 group-hover:border-stone-200'>
              <CalendarDays className='size-7' />
            </div>
            <div className='mt-1'>
              <p className='text-sm font-medium text-stone-800 sm:text-sm'>
                {lunar.solarStr}
              </p>
              <div className='mt-3 inline-flex items-center gap-2 rounded-full border border-stone-100 bg-stone-50 px-3.5 py-1.5'>
                <span className='text-sm font-medium text-stone-500'>
                  {t('dashboardTodayLunar')}
                </span>
                <span className='text-sm font-medium text-stone-700'>
                  {lunar.lunarDayStr}
                </span>
              </div>
              <p className='mt-2 flex items-center justify-center gap-1 pl-1 text-sm font-medium text-stone-500 md:justify-start'>
                {t('lunarYear', { year: lunar.lunarYear })}
              </p>
            </div>
          </div>

          {/* Events summary */}
          <div className='w-full flex-1 md:w-[65%]'>
            {upcomingEvents.length > 0 ? (
              <div className='space-y-4'>
                <Link
                  href='/dashboard/events'
                  className='flex items-center justify-between after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-amber-500'>
                  <span className='flex items-center gap-2.5 text-sm font-medium text-stone-500'>
                    <span className='relative flex size-2'>
                      <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
                      <span className='relative inline-flex size-2 rounded-full bg-amber-500'></span>
                    </span>
                    {t('upcomingEvents', { count: upcomingEvents.length })}
                  </span>
                  <ArrowRight
                    aria-hidden='true'
                    className='size-5 text-stone-300 transition duration-300 group-hover:translate-x-1 group-hover:text-stone-500'
                  />
                </Link>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {upcomingEvents.slice(0, 4).map((evt) => {
                    const cfg = eventTypeConfig[evt.type]
                    const Icon = cfg.icon
                    return (
                      <Link
                        key={`${evt.type}-${evt.personId}-${evt.nextOccurrence.getTime()}`}
                        href={eventHref(evt)}
                        className='relative z-10 flex items-center gap-3.5 rounded-2xl border border-transparent bg-stone-50/50 p-3 transition-colors duration-300 hover:border-stone-100 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none'>
                        <div
                          className={`size-10 rounded-xl ${cfg.bg} flex shrink-0 items-center justify-center border border-white`}>
                          <Icon className={`size-4 ${cfg.color}`} />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <span className='block truncate text-sm font-medium text-stone-700'>
                            {evt.personName}
                          </span>
                          <span className='block pt-0.5 text-sm font-medium text-stone-500'>
                            {evt.daysUntil === 0
                              ? t('today')
                              : evt.daysUntil === 1
                                ? t('tomorrow')
                                : t('daysFromNow', {
                                    count: evt.daysUntil
                                  })}{' '}
                            · {formatLunarDateLabel(evt, t)}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                {upcomingEvents.length > 4 && (
                  <p className='mt-2 text-center text-sm font-medium text-stone-400 sm:text-left'>
                    {t('moreEvents', {
                      count: upcomingEvents.length - 4
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className='flex h-full flex-col items-center justify-center gap-3 py-6 opacity-80'>
                <div className='rounded-2xl border border-stone-100 bg-stone-50 p-4 text-stone-400 transition-transform duration-500 group-hover:scale-105 group-hover:text-stone-500'>
                  <CalendarDays className='size-6' />
                </div>
                <Link
                  href='/dashboard/events'
                  className='px-4 text-center font-medium text-stone-500 after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-amber-500'>
                  {t('noUpcomingEvents')}
                </Link>
                <div className='mt-1 flex items-center gap-2 text-sm font-medium text-stone-400 transition-colors group-hover:text-stone-600'>
                  <span>{t('viewYearEvents')}</span>
                  <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Feature Grid ──────────────────────────────────── */}
      <div className='space-y-12'>
        <section>
          <div className='grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {publicFeatures.map((feat) => (
              <Link
                key={feat.href}
                href={feat.href}
                className={`group flex flex-col rounded-2xl border bg-white p-6 ${feat.borderColor} ${feat.hoverColor} transition duration-300 hover:-translate-y-1`}>
                <div
                  className={`mb-5 flex size-14 items-center justify-center rounded-xl ${feat.bgColor} border border-transparent transition-colors duration-300 group-hover:bg-white group-hover:${feat.borderColor}`}>
                  {feat.icon}
                </div>
                <h4 className='mb-2 text-lg font-semibold text-stone-800 transition-colors group-hover:text-amber-700'>
                  {feat.title}
                </h4>
                <p className='line-clamp-2 text-sm text-stone-500'>
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <h3 className='mb-6 flex items-center gap-2 font-serif text-xl font-semibold text-rose-800'>
              <span className='h-px w-8 rounded-full bg-rose-200'></span>
              {t('adminSection')}
            </h3>
            <div className='grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {adminFeatures.map((feat) => (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className={`group flex flex-col rounded-2xl border bg-white p-6 ${feat.borderColor} ${feat.hoverColor} transition duration-300 hover:-translate-y-1`}>
                  <div
                    className={`mb-5 flex size-14 items-center justify-center rounded-xl ${feat.bgColor} border border-transparent transition-colors duration-300 group-hover:bg-white group-hover:${feat.borderColor}`}>
                    {feat.icon}
                  </div>
                  <h4 className='mb-2 text-lg font-semibold text-stone-800 transition-colors group-hover:text-rose-700'>
                    {feat.title}
                  </h4>
                  <p className='line-clamp-2 text-sm text-stone-500'>
                    {feat.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
