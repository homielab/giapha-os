'use client'

import { m } from 'framer-motion'
import { CalendarDays, CalendarPlus, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useSyncExternalStore } from 'react'

import EventCard from '@/components/events/EventCard'
import CustomEventModal from '@/components/modal/CustomEventModal'
import { useI18n } from '@/lib/i18n/useI18n'
import { toggleButtonProps } from '@/utils/a11y'
import { canEditCustomEvent } from '@/utils/customEventMutations'
import { vnToday } from '@/utils/dateHelpers'
import {
  computeEvents,
  CustomEventRecord,
  FamilyEvent,
  filterVisibleEvents,
  isUpcomingEvent
} from '@/utils/eventHelpers'
import {
  buildIcs,
  ICS_REMIND_CHOICES,
  ICS_REMIND_DEFAULT,
  icsLastYear,
  readIcsRemind,
  writeIcsRemind
} from '@/utils/icsExport'
import { solarToLunar } from '@/utils/lunarCalendar'

const noopSubscribe = () => () => {}

interface EventsListProps {
  persons: {
    id: string
    full_name: string
    birth_year: number | null
    birth_month: number | null
    birth_day: number | null
    death_year: number | null
    death_month: number | null
    death_day: number | null
    death_lunar_year: number | null
    death_lunar_month: number | null
    death_lunar_day: number | null
    is_deceased: boolean
  }[]
  customEvents?: CustomEventRecord[]
  currentUserId?: string | null
  isAdmin?: boolean
}

const EMPTY_CUSTOM_EVENTS: CustomEventRecord[] = []

export default function EventsList({
  persons,
  customEvents = EMPTY_CUSTOM_EVENTS,
  currentUserId = null,
  isAdmin = false
}: EventsListProps) {
  const router = useRouter()
  const { t } = useI18n()
  const [filter, setFilter] = useState<
    'all' | 'birthday' | 'death_anniversary' | 'custom_event' | 'past'
  >('all')
  const [showCount, setShowCount] = useState(20)
  const [showDeceasedBirthdays, setShowDeceasedBirthdays] = useState(false)

  // Custom Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomEvent, setEditingCustomEvent] =
    useState<CustomEventRecord | null>(null)

  const handleOpenEditModal = (event: FamilyEvent) => {
    const rawEvent = customEvents.find((ce) => ce.id === event.personId)
    if (rawEvent && canEditCustomEvent(rawEvent, currentUserId, isAdmin)) {
      setEditingCustomEvent(rawEvent)
      setIsModalOpen(true)
    }
  }

  const canEditEvent = (eventId: string | null) => {
    const rawEvent = customEvents.find((ce) => ce.id === eventId)
    return Boolean(
      rawEvent && canEditCustomEvent(rawEvent, currentUserId, isAdmin)
    )
  }

  const handleOpenCreateModal = () => {
    setEditingCustomEvent(null)
    setIsModalOpen(true)
  }

  const savedRemind = useSyncExternalStore(
    noopSubscribe,
    readIcsRemind,
    () => ICS_REMIND_DEFAULT
  )
  const [remindChoice, setRemindChoice] = useState<number | null>(null)
  const remindDays = remindChoice ?? savedRemind

  const handleDownloadIcs = () => {
    const ics = buildIcs({
      persons,
      customEvents,
      t,
      siteUrl: window.location.origin,
      remindDaysBefore: remindDays
    })
    const url = URL.createObjectURL(
      new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `giapha-events-${vnToday().getFullYear()}-${icsLastYear()}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleModalSuccess = () => {
    router.refresh()
  }

  const [todayDate] = useState(() => {
    const today = vnToday()
    const weekdays = [
      t('weekdaySunday'),
      t('weekdayMonday'),
      t('weekdayTuesday'),
      t('weekdayWednesday'),
      t('weekdayThursday'),
      t('weekdayFriday'),
      t('weekdaySaturday')
    ]
    const dayOfWeek = weekdays[today.getDay()]
    const solarStr = t('todaySolarDate', {
      weekday: dayOfWeek,
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear()
    })
    let lunarStr = ''
    const lunar = solarToLunar(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    )
    if (lunar) {
      const lMonth = lunar.month.toString().padStart(2, '0')
      const lDay = lunar.day.toString().padStart(2, '0')
      lunarStr = `${lDay}/${lMonth}${lunar.leap ? t('leapMonth') : ''}${t('lunarSuffix')}`
    }
    return { solar: solarStr, lunar: lunarStr }
  })

  const allEvents = useMemo(
    () => computeEvents(persons, customEvents, vnToday()),
    [persons, customEvents]
  )

  const visibleEvents = useMemo(
    () => filterVisibleEvents(allEvents, { showDeceasedBirthdays }),
    [allEvents, showDeceasedBirthdays]
  )

  const filtered = useMemo(() => {
    let result = visibleEvents
    if (filter === 'past') {
      // Past tab: all event types from the past year
      return result
        .filter((e) => e.daysUntil < 0 && e.daysUntil >= -365)
        .sort((a, b) => b.daysUntil - a.daysUntil) // most recent first
    }
    if (filter !== 'all') {
      result = result.filter((e) => e.type === filter)
    }
    // Only show upcoming events (daysUntil >= 0) for non-past tabs
    return result.filter(isUpcomingEvent)
  }, [visibleEvents, filter])

  const visible = filtered.slice(0, showCount)

  const todayCount = visibleEvents.filter((e) => e.daysUntil === 0).length
  const soonCount = visibleEvents.filter(
    (e) => e.daysUntil > 0 && e.daysUntil <= 7
  ).length

  return (
    <div className='space-y-5'>
      {/* Summary banner */}
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative mb-8 flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-stone-200/60 bg-white p-6 transition-colors duration-300 hover:border-stone-400 sm:flex-row sm:items-center sm:p-8'>
        {/* Subtle background flair */}
        <div className='pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-50/50 opacity-50 blur-3xl'></div>

        <div className='relative flex items-center gap-4 sm:gap-6'>
          <div className='flex size-16 shrink-0 items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 text-stone-600'>
            <CalendarDays className='size-8' />
          </div>
          <div>
            <p className='text-sm font-medium text-stone-800 sm:text-sm'>
              {todayDate.solar}
            </p>
            {todayDate.lunar && (
              <div className='mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-full border border-stone-100 bg-stone-50 px-3.5 py-1'>
                <span className='text-sm font-medium text-stone-500'>
                  {t('lunarCalendar')}
                </span>
                <span className='text-sm font-medium text-stone-700'>
                  {todayDate.lunar}
                </span>
              </div>
            )}
            {(todayCount > 0 || soonCount > 0) && (
              <p className='mt-3 flex items-start gap-2.5 text-sm font-medium text-stone-500 sm:items-center'>
                <span className='relative mt-1 flex size-2.5 shrink-0 sm:mt-0'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
                  <span className='relative inline-flex size-2.5 rounded-full bg-amber-500'></span>
                </span>
                <span className='flex flex-wrap items-center gap-1.5'>
                  {todayCount > 0 && (
                    <span className='font-medium text-stone-700'>
                      {t('eventsToday', { count: todayCount })}
                    </span>
                  )}
                  {todayCount > 0 && soonCount > 0 && (
                    <span className='hidden sm:inline'>·</span>
                  )}
                  {soonCount > 0 && (
                    <span>{t('eventsNext7Days', { count: soonCount })}</span>
                  )}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className='relative z-10 flex w-full flex-col gap-2 sm:w-auto'>
          <button
            onClick={handleOpenCreateModal}
            className='btn-primary w-full sm:w-auto'>
            <Plus className='size-5 text-stone-300' />
            <span>{t('addEvent')}</span>
          </button>
          <button
            onClick={handleDownloadIcs}
            title={t('addToCalendarHint')}
            className='btn w-full sm:w-auto'>
            <CalendarPlus className='size-5' />
            <span>{t('addToCalendar')}</span>
          </button>
          <label className='flex items-center justify-center gap-2 text-xs text-stone-600'>
            <span>{t('icsRemindLabel')}</span>
            <select
              value={remindDays}
              onChange={(e) => {
                const days = Number(e.target.value)
                setRemindChoice(days)
                writeIcsRemind(days)
              }}
              className='rounded-lg border border-stone-200/80 bg-white/90 px-2 py-1 text-xs text-stone-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none'>
              {ICS_REMIND_CHOICES.map((days) => (
                <option key={days} value={days}>
                  {days === 0
                    ? t('icsRemindNone')
                    : t('icsRemindDays', { days })}
                </option>
              ))}
            </select>
          </label>
          <p className='text-center text-xs text-stone-500'>
            {t('addToCalendarUntil', { year: icsLastYear() })}
          </p>
        </div>
      </m.div>

      {/* Controls */}
      <div className='flex flex-col gap-3'>
        {/* Filter tabs */}
        <div className='flex flex-wrap items-center gap-2'>
          {(
            [
              { key: 'all', label: t('eventAll') },
              { key: 'birthday', label: t('eventBirthdays') },
              { key: 'death_anniversary', label: t('eventDeaths') },
              { key: 'custom_event', label: t('eventCustom') },
              { key: 'past', label: t('eventPast') }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type='button'
              {...toggleButtonProps(tab.label, filter === tab.key)}
              onClick={() => {
                setFilter(tab.key)
                setShowCount(20)
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                filter === tab.key
                  ? filter === 'past'
                    ? 'bg-stone-600 text-white'
                    : 'bg-amber-500 text-white'
                  : 'border border-stone-200/60 bg-white/80 text-stone-600 hover:border-amber-200 hover:text-amber-700'
              }`}>
              {tab.label}
            </button>
          ))}
          <span
            role='status'
            aria-live='polite'
            className='ml-auto self-center text-sm text-stone-400'>
            {t('eventCount', { count: filtered.length })}
            {filter === 'past' ? t('eventPastYear') : ''}
          </span>
        </div>

        {/* Toggle options — hide when viewing past events */}
        {filter !== 'past' && (
          <div className='flex px-1'>
            <label className='flex cursor-pointer items-center gap-2.5 text-sm font-medium text-stone-600 transition-colors select-none hover:text-stone-900'>
              <input
                type='checkbox'
                checked={showDeceasedBirthdays}
                onChange={(e) => setShowDeceasedBirthdays(e.target.checked)}
                className='size-4 rounded-md border-stone-300 text-amber-500 transition focus:ring-amber-500'
              />
              {t('showDeceasedBirthdays')}
            </label>
          </div>
        )}
      </div>

      {/* Event list */}
      {visible.length === 0 ? (
        <div className='py-16 text-center text-stone-400'>
          <CalendarDays className='mx-auto mb-3 size-10 opacity-40' />
          <p className='font-medium'>{t('noEvents')}</p>
          <p className='mt-1 text-sm'>{t('noEventsHint')}</p>
        </div>
      ) : (
        <div className='space-y-2.5'>
          {visible.map((event, i) => (
            <EventCard
              key={`${event.personId}-${event.type}-${event.nextOccurrence.getTime()}`}
              event={event}
              index={i}
              canEdit={
                event.type !== 'custom_event' || canEditEvent(event.personId)
              }
              onEditCustomEvent={handleOpenEditModal}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount((n) => n + 20)}
          className='btn w-full'>
          {t('loadMoreEvents', { count: filtered.length - showCount })}
        </button>
      )}

      <CustomEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        eventToEdit={editingCustomEvent}
      />
    </div>
  )
}
