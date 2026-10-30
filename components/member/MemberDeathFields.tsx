'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

import { inputClasses } from '@/components/member/memberFormStyles'
import { CheckboxIcon } from '@/components/member/MemberGeneralFields'
import { useI18n } from '@/lib/i18n/useI18n'
import { MAX_NOTE } from '@/utils/limits'
import { hasLeapMonth } from '@/utils/memberFormHelpers'

interface MemberDeathFieldsProps {
  isDeceased: boolean
  onDeceasedChange: (checked: boolean) => void
  deathDay: number | ''
  deathMonth: number | ''
  deathYear: number | ''
  deathLunarDay: number | ''
  deathLunarMonth: number | ''
  deathLunarYear: number | ''
  deathLunarLeap: boolean
  onLunarLeapChange: (leap: boolean) => void
  onSolarChange: (field: 'day' | 'month' | 'year', value: string) => void
  onLunarChange: (field: 'day' | 'month' | 'year', value: string) => void
  burialPlace: string
  onBurialPlaceChange: (value: string) => void
}

export default function MemberDeathFields({
  isDeceased,
  onDeceasedChange,
  deathDay,
  deathMonth,
  deathYear,
  deathLunarDay,
  deathLunarMonth,
  deathLunarYear,
  deathLunarLeap,
  onLunarLeapChange,
  onSolarChange,
  onLunarChange,
  burialPlace,
  onBurialPlaceChange
}: MemberDeathFieldsProps) {
  const { t } = useI18n()
  return (
    <div className='rounded-2xl border border-stone-200/60 bg-stone-50/50 p-5 md:col-span-2'>
      <div className='flex flex-col gap-4'>
        <label className='group flex items-center gap-3'>
          <div className='relative flex items-center'>
            <input
              type='checkbox'
              checked={isDeceased}
              onChange={(e) => onDeceasedChange(e.target.checked)}
              className='peer sr-only'
            />
            <div className='flex size-5 items-center justify-center rounded border-2 border-stone-300 transition-colors peer-checked:border-stone-600 peer-checked:bg-stone-600'>
              <CheckboxIcon checked={isDeceased} />
            </div>
          </div>
          <span className='text-sm font-medium text-stone-700 transition-colors group-hover:text-stone-900'>
            {t('deceasedStatus')}
          </span>
        </label>
      </div>

      <AnimatePresence>
        {isDeceased && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='mt-5 overflow-hidden'>
            <p className='mb-4 text-sm text-stone-500 italic'>
              {t('dateHint')}
            </p>

            <div className='flex flex-col gap-5'>
              {/* Lunar Date */}
              <div>
                <label
                  id='member-lunar-death-date-label'
                  htmlFor='member-lunar-death-day'
                  className='mb-2 block text-sm font-medium text-stone-700'>
                  {t('lunarDeathDate')}
                </label>
                <div
                  role='group'
                  aria-labelledby='member-lunar-death-date-label'
                  className='grid grid-cols-3 gap-3'>
                  <input
                    id='member-lunar-death-day'
                    type='number'
                    step='1'
                    aria-label={t('day')}
                    placeholder={t('day')}
                    min='1'
                    max='30'
                    value={deathLunarDay}
                    onChange={(e) => onLunarChange('day', e.target.value)}
                    className={inputClasses}
                  />
                  <input
                    type='number'
                    step='1'
                    aria-label={t('month')}
                    placeholder={t('month')}
                    min='1'
                    max='12'
                    value={deathLunarMonth}
                    onChange={(e) => onLunarChange('month', e.target.value)}
                    className={inputClasses}
                  />
                  <input
                    type='number'
                    step='1'
                    aria-label={t('year')}
                    min='1000'
                    max='9999'
                    placeholder={t('year')}
                    value={deathLunarYear}
                    onChange={(e) => onLunarChange('year', e.target.value)}
                    className={inputClasses}
                  />
                </div>
                {hasLeapMonth(deathLunarMonth, deathLunarYear) && (
                  <label className='mt-2 flex items-center gap-2 text-sm text-stone-600'>
                    <input
                      type='checkbox'
                      checked={deathLunarLeap}
                      onChange={(e) => onLunarLeapChange(e.target.checked)}
                      className='size-4 rounded border-stone-300'
                    />
                    {t('lunarLeapMonth')}
                  </label>
                )}
              </div>

              {/* Solar Date */}
              <div>
                <label
                  id='member-death-date-label'
                  htmlFor='member-death-day'
                  className='mb-2 block text-sm font-medium text-stone-700'>
                  {t('solarDeathDate')}
                </label>
                <div
                  role='group'
                  aria-labelledby='member-death-date-label'
                  className='grid grid-cols-3 gap-3'>
                  <input
                    id='member-death-day'
                    type='number'
                    step='1'
                    aria-label={t('day')}
                    placeholder={t('day')}
                    min='1'
                    max='31'
                    value={deathDay}
                    onChange={(e) => onSolarChange('day', e.target.value)}
                    className={inputClasses}
                  />
                  <input
                    type='number'
                    step='1'
                    aria-label={t('month')}
                    placeholder={t('month')}
                    min='1'
                    max='12'
                    value={deathMonth}
                    onChange={(e) => onSolarChange('month', e.target.value)}
                    className={inputClasses}
                  />
                  <input
                    type='number'
                    step='1'
                    aria-label={t('year')}
                    min='1000'
                    max='9999'
                    placeholder={t('year')}
                    value={deathYear}
                    onChange={(e) => onSolarChange('year', e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Burial place */}
              <div>
                <label
                  htmlFor='member-burial-place'
                  className='mb-2 block text-sm font-medium text-stone-700'>
                  {t('burialPlace')}
                </label>
                <input
                  id='member-burial-place'
                  type='text'
                  placeholder={t('burialPlacePlaceholder')}
                  maxLength={MAX_NOTE}
                  value={burialPlace}
                  onChange={(e) => onBurialPlaceChange(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DeceasedPhoneWarning() {
  const { t } = useI18n()
  return (
    <p className='mt-1.5 flex items-center gap-1 text-sm font-medium text-rose-500'>
      <AlertCircle className='size-3' />
      {t('deceasedPhone')}
    </p>
  )
}
