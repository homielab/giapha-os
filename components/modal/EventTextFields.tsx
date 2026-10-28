'use client'

import { AlignLeft, MapPin } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'
import { MAX_NOTE } from '@/utils/limits'

const inputClasses =
  'bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300  focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-colors outline-none!'

interface EventTextFieldsProps {
  location: string
  content: string
  onLocationChange: (value: string) => void
  onContentChange: (value: string) => void
}

export default function EventTextFields({
  location,
  content,
  onLocationChange,
  onContentChange
}: EventTextFieldsProps) {
  const { t } = useI18n()
  return (
    <>
      <div>
        <label
          htmlFor='custom-event-location'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('location')}
        </label>
        <div className='relative'>
          <MapPin className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400' />
          <input
            id='custom-event-location'
            type='text'
            className={`${inputClasses} pl-11`}
            placeholder={t('locationPlaceholder')}
            maxLength={MAX_NOTE}
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor='custom-event-details'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('details')}
        </label>
        <div className='relative'>
          <AlignLeft className='absolute top-4 left-4 size-4 text-stone-400' />
          <textarea
            id='custom-event-details'
            rows={3}
            className={`${inputClasses} custom-scrollbar resize-none pl-11`}
            placeholder={t('detailsPlaceholder')}
            maxLength={MAX_NOTE}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
          />
        </div>
      </div>
    </>
  )
}
