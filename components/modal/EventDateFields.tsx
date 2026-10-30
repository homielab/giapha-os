'use client'

import { AlertCircle, CalendarIcon, Moon, Sun } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'
import { hasLeapMonth } from '@/utils/memberFormHelpers'

const inputClasses =
  'bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300  focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-colors outline-none!'

export type EventDateMode = 'solar' | 'lunar'

interface EventDateFieldsProps {
  dateMode: EventDateMode
  onToggleMode: () => void
  eventDate: string
  onEventDateChange: (value: string) => void
  lunarDay: number | ''
  lunarMonth: number | ''
  lunarYear: number | ''
  lunarLeap: boolean
  onLunarDayChange: (value: number | '') => void
  onLunarMonthChange: (value: number | '') => void
  onLunarYearChange: (value: number | '') => void
  onLunarLeapChange: (value: boolean) => void
  /** Solar date (YYYY-MM-DD) of the lunar date, null while it has none. */
  lunarSolarDate: string | null
  lunarConvertError: string | null
}

export default function EventDateFields({
  dateMode,
  onToggleMode,
  eventDate,
  onEventDateChange,
  lunarDay,
  lunarMonth,
  lunarYear,
  lunarLeap,
  onLunarDayChange,
  onLunarMonthChange,
  onLunarYearChange,
  onLunarLeapChange,
  lunarSolarDate,
  lunarConvertError
}: EventDateFieldsProps) {
  const { t } = useI18n()
  return (
    <div>
      <div className='mb-1.5 flex items-center justify-between'>
        <label
          id='custom-event-date-label'
          htmlFor={
            dateMode === 'solar'
              ? 'custom-event-date'
              : 'custom-event-lunar-day'
          }
          className='block text-sm font-medium text-stone-700'>
          {t('eventDate')} <span className='text-red-500'>*</span>
        </label>
        <button
          type='button'
          onClick={onToggleMode}
          className='flex items-center gap-1.5 rounded-lg border border-stone-200/60 bg-stone-50 px-2.5 py-1 text-sm font-medium text-stone-500 transition-colors hover:bg-amber-50 hover:text-amber-700'>
          {dateMode === 'solar' ? (
            <>
              <Moon className='size-3' />
              {t('enterLunar')}
            </>
          ) : (
            <>
              <Sun className='size-3' />
              {t('enterSolar')}
            </>
          )}
        </button>
      </div>

      {dateMode === 'solar' ? (
        <div className='relative'>
          <CalendarIcon className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400' />
          <input
            id='custom-event-date'
            required
            type='date'
            className={`${inputClasses} pl-11`}
            value={eventDate}
            onChange={(e) => onEventDateChange(e.target.value)}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          <div
            role='group'
            aria-labelledby='custom-event-date-label'
            className='grid grid-cols-3 gap-3'>
            <input
              id='custom-event-lunar-day'
              type='number'
              aria-label={t('day')}
              placeholder={t('day')}
              min='1'
              max='30'
              value={lunarDay}
              onChange={(e) =>
                onLunarDayChange(e.target.value ? Number(e.target.value) : '')
              }
              className={inputClasses}
            />
            <input
              type='number'
              aria-label={t('month')}
              placeholder={t('month')}
              min='1'
              max='12'
              value={lunarMonth}
              onChange={(e) =>
                onLunarMonthChange(e.target.value ? Number(e.target.value) : '')
              }
              className={inputClasses}
            />
            <input
              type='number'
              aria-label={t('year')}
              placeholder={t('year')}
              value={lunarYear}
              onChange={(e) =>
                onLunarYearChange(e.target.value ? Number(e.target.value) : '')
              }
              className={inputClasses}
            />
          </div>
          {hasLeapMonth(lunarMonth, lunarYear) && (
            <label className='flex items-center gap-2 text-sm text-stone-600'>
              <input
                type='checkbox'
                checked={lunarLeap}
                onChange={(e) => onLunarLeapChange(e.target.checked)}
                className='size-4 rounded border-stone-300'
              />
              {t('lunarLeapMonth')}
            </label>
          )}
          {lunarConvertError && (
            <p
              role='alert'
              className='flex items-center gap-1 text-sm font-medium text-rose-500'>
              <AlertCircle className='size-3' />
              {lunarConvertError}
            </p>
          )}
          {lunarSolarDate && (
            <p className='flex items-center gap-1.5 text-sm text-stone-500'>
              <Sun className='size-3 text-amber-500' />
              {t('solarDate')}:{' '}
              <span className='font-medium text-stone-700'>
                {lunarSolarDate.split('-').reverse().join('/')}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
