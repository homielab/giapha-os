'use client'

import { useI18n } from '@/lib/i18n/useI18n'
import { MAX_NAME } from '@/utils/limits'

const inputClasses =
  'bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300  focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition outline-none!'

interface EventNameFieldProps {
  name: string
  onNameChange: (value: string) => void
}

export default function EventNameField({
  name,
  onNameChange
}: EventNameFieldProps) {
  const { t } = useI18n()
  return (
    <div>
      <label
        htmlFor='custom-event-name'
        className='mb-1.5 block text-sm font-medium text-stone-700'>
        {t('eventName')} <span className='text-red-500'>*</span>
      </label>
      <input
        id='custom-event-name'
        required
        type='text'
        className={inputClasses}
        placeholder={t('eventNamePlaceholder')}
        maxLength={MAX_NAME}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
    </div>
  )
}
