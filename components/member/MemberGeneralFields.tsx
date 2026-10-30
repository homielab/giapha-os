'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Settings2 } from 'lucide-react'

import { inputClasses } from '@/components/member/memberFormStyles'
import { useI18n } from '@/lib/i18n/useI18n'
import { Gender } from '@/types'
import { MAX_NAME, MAX_NOTE } from '@/utils/limits'

interface MemberGeneralFieldsProps {
  fullName: string
  onFullNameChange: (value: string) => void
  otherNames: string
  onOtherNamesChange: (value: string) => void
  gender: Gender
  onGenderChange: (value: Gender) => void
  isInLaw: boolean
  onIsInLawChange: (value: boolean) => void
  birthOrder: number | ''
  onBirthOrderChange: (value: number | '') => void
  generation: number | ''
  onGenerationChange: (value: number | '') => void
  hasGenerationChanged: boolean
  updateDescendantGenerations: boolean
  onUpdateDescendantGenerationsChange: (value: boolean) => void
  birthDay: number | ''
  onBirthDayChange: (value: number | '') => void
  birthMonth: number | ''
  onBirthMonthChange: (value: number | '') => void
  birthYear: number | ''
  onBirthYearChange: (value: number | '') => void
  note: string
  onNoteChange: (value: string) => void
}

export function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <m.svg
      initial={false}
      animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
      className='pointer-events-none size-3 text-white'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={4}>
      <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
    </m.svg>
  )
}

export default function MemberGeneralFields({
  fullName,
  onFullNameChange,
  otherNames,
  onOtherNamesChange,
  gender,
  onGenderChange,
  isInLaw,
  onIsInLawChange,
  birthOrder,
  onBirthOrderChange,
  generation,
  onGenerationChange,
  hasGenerationChanged,
  updateDescendantGenerations,
  onUpdateDescendantGenerationsChange,
  birthDay,
  onBirthDayChange,
  birthMonth,
  onBirthMonthChange,
  birthYear,
  onBirthYearChange,
  note,
  onNoteChange
}: MemberGeneralFieldsProps) {
  const { t } = useI18n()
  return (
    <>
      <div className='md:col-span-1'>
        <label
          htmlFor='member-full-name'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('fullName')} <span className='text-red-500'>*</span>
        </label>
        <input
          id='member-full-name'
          type='text'
          required
          maxLength={MAX_NAME}
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          className={inputClasses}
          placeholder={t('fullNamePlaceholder')}
        />
      </div>

      <div className='md:col-span-1'>
        <label
          htmlFor='member-other-names'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('otherNames')}
        </label>
        <input
          id='member-other-names'
          type='text'
          maxLength={MAX_NOTE}
          value={otherNames}
          onChange={(e) => onOtherNamesChange(e.target.value)}
          className={inputClasses}
          placeholder={t('otherNamesPlaceholder')}
        />
      </div>

      <div>
        <label
          htmlFor='member-gender'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('gender')} <span className='text-red-500'>*</span>
        </label>
        <div className='relative'>
          <select
            id='member-gender'
            value={gender}
            onChange={(e) => onGenderChange(e.target.value as Gender)}
            className={`${inputClasses} appearance-none`}>
            <option value='male'>{t('male')}</option>
            <option value='female'>{t('female')}</option>
            <option value='other'>{t('otherGender')}</option>
          </select>
          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500'>
            <Settings2 className='size-4' />
          </div>
        </div>
      </div>

      <div className='mt-2 flex items-center sm:mt-7'>
        <label className='group flex items-center gap-3'>
          <div className='relative flex items-center'>
            <input
              type='checkbox'
              checked={isInLaw}
              onChange={(e) => onIsInLawChange(e.target.checked)}
              className='peer sr-only'
            />
            <div className='flex size-5 items-center justify-center rounded border-2 border-stone-300 transition-colors peer-checked:border-amber-500 peer-checked:bg-amber-500'>
              <CheckboxIcon checked={isInLaw} />
            </div>
          </div>
          <span className='text-sm font-medium text-stone-700 transition-colors group-hover:text-amber-700'>
            {t('inLaw')}
          </span>
        </label>
      </div>

      <div>
        <label
          htmlFor='member-birth-order'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('birthOrder')}
        </label>
        <input
          id='member-birth-order'
          type='number'
          step='1'
          min='1'
          placeholder={t('birthOrderPlaceholder')}
          value={birthOrder}
          onChange={(e) =>
            onBirthOrderChange(e.target.value ? Number(e.target.value) : '')
          }
          className={inputClasses}
        />
        <p className='mt-1.5 flex items-center gap-1 text-sm text-stone-400'>
          <span>💡</span> {t('leaveBlank')}
        </p>
      </div>

      <div>
        <label
          htmlFor='member-generation'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('generation')}
        </label>
        <input
          id='member-generation'
          type='number'
          step='1'
          min='1'
          placeholder={t('generationPlaceholder')}
          value={generation}
          onChange={(e) =>
            onGenerationChange(e.target.value ? Number(e.target.value) : '')
          }
          className={inputClasses}
        />
        <p className='mt-1.5 flex items-center gap-1 text-sm text-stone-400'>
          <span>💡</span> {t('leaveBlank')}
        </p>

        <AnimatePresence>
          {hasGenerationChanged && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className='mt-3 overflow-hidden'>
              <label className='group flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3'>
                <div className='relative mt-0.5 flex items-center'>
                  <input
                    type='checkbox'
                    checked={updateDescendantGenerations}
                    onChange={(e) =>
                      onUpdateDescendantGenerationsChange(e.target.checked)
                    }
                    className='peer sr-only'
                  />
                  <div className='flex size-4 items-center justify-center rounded border-2 border-stone-300 transition-colors peer-checked:border-amber-500 peer-checked:bg-amber-500 sm:size-5'>
                    <CheckboxIcon checked={updateDescendantGenerations} />
                  </div>
                </div>
                <div className='flex-1'>
                  <span className='block text-sm font-medium text-stone-700 transition-colors group-hover:text-amber-700'>
                    {t('updateDescendant')}
                  </span>
                  <p className='mt-1 text-sm text-stone-500'>
                    {t('updateDescendantDescription')}
                  </p>
                </div>
              </label>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className='md:col-span-2'>
        <label
          id='member-birth-date-label'
          htmlFor='member-birth-day'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('solarBirthDate')}
        </label>
        <div
          role='group'
          aria-labelledby='member-birth-date-label'
          className='grid grid-cols-3 gap-3'>
          <input
            id='member-birth-day'
            type='number'
            step='1'
            aria-label={t('day')}
            placeholder={t('day')}
            min='1'
            max='31'
            value={birthDay}
            onChange={(e) =>
              onBirthDayChange(e.target.value ? Number(e.target.value) : '')
            }
            className={inputClasses}
          />
          <input
            type='number'
            step='1'
            aria-label={t('month')}
            placeholder={t('month')}
            min='1'
            max='12'
            value={birthMonth}
            onChange={(e) =>
              onBirthMonthChange(e.target.value ? Number(e.target.value) : '')
            }
            className={inputClasses}
          />
          <input
            type='number'
            step='1'
            aria-label={t('year')}
            min='1000'
            max='9999'
            placeholder={t('year')}
            value={birthYear}
            onChange={(e) =>
              onBirthYearChange(e.target.value ? Number(e.target.value) : '')
            }
            className={inputClasses}
          />
        </div>
      </div>

      <div className='md:col-span-2'>
        <label
          htmlFor='member-note'
          className='mb-1.5 block text-sm font-medium text-stone-700'>
          {t('note')}
        </label>
        <textarea
          id='member-note'
          rows={3}
          maxLength={MAX_NOTE}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t('notePlaceholder')}
          className={`${inputClasses} resize-none`}
        />
        <p className='mt-1 text-right text-xs text-stone-500' aria-live='off'>
          {note.length}/{MAX_NOTE}
        </p>
      </div>
    </>
  )
}
