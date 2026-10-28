'use client'

import { m } from 'framer-motion'
import {
  AlignLeft,
  Cake,
  CalendarDays,
  Clock,
  Flower,
  MapPin,
  Star
} from 'lucide-react'

import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { clickableProps } from '@/utils/a11y'
import { getZodiacSign } from '@/utils/dateHelpers'
import {
  daysUntilLabel,
  formatEventDateLabel,
  getEventYearsInfo
} from '@/utils/eventCardLabels'
import { FamilyEvent } from '@/utils/eventHelpers'

const CARD_TONE_CLASSES: Record<string, string> = {
  today: 'border-amber-300 bg-amber-50',
  past: 'border-stone-200/50 bg-stone-50/60',
  birthday: 'border-stone-200/60 bg-white/80 hover:border-blue-200',
  custom: 'border-stone-200/60 bg-white/80 hover:border-purple-200',
  death: 'border-stone-200/60 bg-white/80 hover:border-rose-200'
}

function getCardTone(
  isToday: boolean,
  isPast: boolean,
  isBirthday: boolean,
  isCustom: boolean
) {
  if (isToday) return CARD_TONE_CLASSES.today
  if (isPast) return CARD_TONE_CLASSES.past
  if (isBirthday) return CARD_TONE_CLASSES.birthday
  if (isCustom) return CARD_TONE_CLASSES.custom
  return CARD_TONE_CLASSES.death
}

const ICON_TONE_CLASSES: Record<string, string> = {
  today: 'bg-amber-100 text-amber-600',
  past: 'bg-stone-100 text-stone-400',
  birthday: 'bg-blue-50 text-blue-500',
  custom: 'bg-purple-50 text-purple-500',
  death: 'bg-rose-50 text-rose-500'
}

function getIconTone(
  isToday: boolean,
  isPast: boolean,
  isBirthday: boolean,
  isCustom: boolean
) {
  if (isToday) return ICON_TONE_CLASSES.today
  if (isPast) return ICON_TONE_CLASSES.past
  if (isBirthday) return ICON_TONE_CLASSES.birthday
  if (isCustom) return ICON_TONE_CLASSES.custom
  return ICON_TONE_CLASSES.death
}

function getDaysBadgeClasses(
  isToday: boolean,
  isPast: boolean,
  isSoon: boolean
) {
  if (isToday) return 'bg-amber-400 text-white'
  if (isPast) return 'bg-stone-200/80 text-stone-500'
  if (isSoon) return 'bg-red-100 text-red-600'
  return 'bg-stone-100 text-stone-500'
}

function EventIcon({
  isBirthday,
  isCustom
}: {
  isBirthday: boolean
  isCustom: boolean
}) {
  if (isBirthday) return <Cake className='size-4.5 sm:size-5' />
  if (isCustom) return <Star className='size-4.5 sm:size-5' />
  return <Flower className='size-4.5 sm:size-5' />
}

export default function EventCard({
  event,
  index,
  canEdit = true,
  onEditCustomEvent
}: {
  event: FamilyEvent
  index: number
  /** Custom events open the edit form only for their creator or an admin. */
  canEdit?: boolean
  onEditCustomEvent: (e: FamilyEvent) => void
}) {
  const { t } = useI18n()
  const isBirthday = event.type === 'birthday'
  const isCustom = event.type === 'custom_event'
  const isToday = event.daysUntil === 0
  const isPast = event.daysUntil < 0
  const isSoon = event.daysUntil > 0 && event.daysUntil <= 7

  const { setMemberModalId } = useMemberListView()

  const isClickable = isCustom ? canEdit : Boolean(event.personId)

  const handleClick = () => {
    if (isCustom) {
      if (canEdit) onEditCustomEvent(event)
    } else if (event.personId) {
      setMemberModalId(event.personId)
    }
  }

  const yearsInfo = getEventYearsInfo(event, isBirthday, t)
  const dateLabel = formatEventDateLabel(event, t)

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      {...clickableProps(isClickable ? handleClick : null)}
      className={`group flex w-full ${isClickable ? 'cursor-pointer active:scale-[0.98]' : ''} items-start gap-3 rounded-2xl border p-3.5 text-left transition sm:gap-4 sm:p-4 ${getCardTone(isToday, isPast, isBirthday, isCustom)}`}>
      {/* Icon */}
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11 ${getIconTone(isToday, isPast, isBirthday, isCustom)}`}>
        <EventIcon isBirthday={isBirthday} isCustom={isCustom} />
      </div>

      {/* Info */}
      <div className='min-w-0 flex-1'>
        {/* Top row: name + badge */}
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          <p
            className={`truncate text-sm font-medium transition-colors sm:text-sm ${
              isPast
                ? 'text-stone-500'
                : `text-stone-800 ${isClickable ? 'group-hover:text-amber-700' : ''}`
            }`}>
            {event.personName}
          </p>
          {isBirthday &&
            event.originDay &&
            event.originMonth &&
            getZodiacSign(event.originDay, event.originMonth) && (
              <span className='shrink-0 rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-indigo-700'>
                {t(getZodiacSign(event.originDay, event.originMonth)!)}
              </span>
            )}
          {/* Days badge — inline with name */}
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-sm leading-tight font-medium whitespace-nowrap ${getDaysBadgeClasses(isToday, isPast, isSoon)}`}>
            {isToday && (
              <span className='relative flex size-1.5'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-200 opacity-75' />
                <span className='relative inline-flex size-1.5 rounded-full bg-white' />
              </span>
            )}
            {!isToday && <Clock className='size-2.5' />}
            {daysUntilLabel(event.daysUntil, t)}
          </span>
        </div>

        {/* Details */}
        <div className='mt-1 flex flex-col gap-0.5'>
          <p className='flex items-center gap-1.5 text-sm leading-snug text-stone-500 sm:text-sm'>
            <CalendarDays className='size-3.5 shrink-0' />
            <span className='font-medium text-stone-600'>{dateLabel}</span>
            {yearsInfo && <span className='text-stone-400'>· {yearsInfo}</span>}
          </p>

          {event.location && (
            <p className='flex items-center gap-1.5 text-sm leading-snug text-stone-500 sm:text-sm'>
              <MapPin className='size-3.5 shrink-0' />
              <span className='truncate'>{event.location}</span>
            </p>
          )}
          {event.content && (
            <p className='mt-0.5 flex items-start gap-1.5 text-sm leading-snug text-stone-400 sm:text-sm'>
              <AlignLeft className='mt-0.5 size-3.5 shrink-0' />
              <span className='line-clamp-2'>{event.content}</span>
            </p>
          )}
        </div>
      </div>
    </m.div>
  )
}
