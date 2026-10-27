'use client'

import { Repeat } from 'lucide-react'

import type { TranslationKey } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n/useI18n'
import {
  CUSTOM_EVENT_RECURRENCES,
  toRecurrence,
  type CustomEventRecurrence
} from '@/utils/eventHelpers'

const inputClasses =
  'bg-white text-stone-900 block w-full rounded-xl border border-stone-300  focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-colors outline-none!'

const LABELS: Record<CustomEventRecurrence, TranslationKey> = {
  none: 'recurrenceNone',
  yearly_solar: 'recurrenceYearlySolar',
  yearly_lunar: 'recurrenceYearlyLunar'
}

interface EventRecurrenceFieldProps {
  recurrence: CustomEventRecurrence
  onRecurrenceChange: (value: CustomEventRecurrence) => void
}

export default function EventRecurrenceField({
  recurrence,
  onRecurrenceChange
}: EventRecurrenceFieldProps) {
  const { t } = useI18n()
  return (
    <div>
      <label
        htmlFor='custom-event-recurrence'
        className='mb-1.5 block text-sm font-medium text-stone-700'>
        {t('eventRecurrence')}
      </label>
      <div className='relative'>
        <Repeat className='pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400' />
        <select
          id='custom-event-recurrence'
          value={recurrence}
          aria-describedby={
            recurrence === 'yearly_lunar'
              ? 'custom-event-recurrence-hint'
              : undefined
          }
          onChange={(e) => onRecurrenceChange(toRecurrence(e.target.value))}
          className={`${inputClasses} appearance-none pl-11`}>
          {CUSTOM_EVENT_RECURRENCES.map((value) => (
            <option key={value} value={value}>
              {t(LABELS[value])}
            </option>
          ))}
        </select>
      </div>
      {recurrence === 'yearly_lunar' && (
        <p
          id='custom-event-recurrence-hint'
          className='mt-1.5 text-xs text-stone-500'>
          {t('recurrenceLunarHint')}
        </p>
      )}
    </div>
  )
}
