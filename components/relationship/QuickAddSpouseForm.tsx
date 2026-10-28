'use client'

import { useI18n } from '@/lib/i18n/useI18n'
import { MAX_NAME, MAX_NOTE } from '@/utils/limits'

interface QuickAddSpouseFormProps {
  personGender: 'male' | 'female' | 'other'
  newSpouseName: string
  onNameChange: (value: string) => void
  newSpouseBirthYear: string
  onBirthYearChange: (value: string) => void
  newSpouseNote: string
  onNoteChange: (value: string) => void
  processing: boolean
  error: string | null
  onSave: () => void
  onCancel: () => void
}

export default function QuickAddSpouseForm({
  personGender,
  newSpouseName,
  onNameChange,
  newSpouseBirthYear,
  onBirthYearChange,
  newSpouseNote,
  onNoteChange,
  processing,
  error,
  onSave,
  onCancel
}: QuickAddSpouseFormProps) {
  const { t } = useI18n()
  return (
    <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4 sm:p-5'>
      <h4 className='mb-3 text-base font-semibold text-rose-800'>
        {t('addQuickSpouse')}
      </h4>

      <div className='space-y-3'>
        <div>
          <label
            htmlFor='spouse-name'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('fullName')} <span className='text-red-500'>*</span>
          </label>
          <input
            id='spouse-name'
            name='spouse-name'
            type='text'
            placeholder={t('fullNamePlaceholder')}
            maxLength={MAX_NAME}
            value={newSpouseName}
            onChange={(e) => onNameChange(e.target.value)}
            className='block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-rose-500 focus:ring-rose-500 sm:p-2.5'
          />
        </div>

        <div>
          <label
            htmlFor='spouse-birth-year'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('optionalBirthYear')}
          </label>
          <input
            id='spouse-birth-year'
            name='spouse-birth-year'
            type='number'
            placeholder={t('birthYearExample')}
            value={newSpouseBirthYear}
            onChange={(e) => onBirthYearChange(e.target.value)}
            className='block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-rose-500 focus:ring-rose-500 sm:p-2.5'
          />
        </div>

        <div>
          <label
            htmlFor='spouse-note'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('relationshipNoteExample')}
          </label>
          <input
            id='spouse-note'
            name='spouse-note'
            type='text'
            placeholder={t('optional')}
            maxLength={MAX_NOTE}
            value={newSpouseNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className='block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-rose-500 focus:ring-rose-500 sm:p-2.5'
          />
        </div>

        <p className='mt-1 text-sm text-stone-500 italic'>
          {t('autoGenderNote', {
            gender:
              personGender === 'male'
                ? t('female')
                : personGender === 'female'
                  ? t('male')
                  : t('female')
          })}
        </p>

        <div className='flex gap-2 pt-2'>
          <button
            onClick={onSave}
            disabled={!newSpouseName.trim() || processing}
            className='flex-1 rounded-md bg-rose-600 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50 sm:rounded-lg sm:py-2.5'>
            {processing ? t('saving') : t('save')}
          </button>
          <button
            onClick={onCancel}
            className='rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 sm:rounded-lg sm:py-2.5'>
            {t('cancel')}
          </button>
        </div>
        {error && (
          <div
            role='alert'
            className='animate-in fade-in slide-in-from-top-1 mt-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600'>
            <svg
              className='h-4 w-4 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
