'use client'

import { m } from 'framer-motion'

import { itemVariants } from '@/context/memberDetail/memberDetailShared'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

interface MemberNameHeaderProps {
  person: Person
  fullName: string
  isDeceased: boolean
}

export default function MemberNameHeader({
  person,
  fullName,
  isDeceased
}: MemberNameHeaderProps) {
  const { t } = useI18n()
  return (
    <m.div
      variants={itemVariants}
      className='flex flex-col items-start justify-between sm:flex-row sm:items-center'>
      <div>
        <h1 className='flex flex-wrap items-center gap-2 font-serif text-2xl font-semibold text-stone-900 sm:gap-3 sm:text-3xl'>
          {fullName}
          {isDeceased && (
            <span className='rounded-md border border-stone-200/80 bg-stone-100/50 px-2 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-stone-500 sm:text-sm'>
              {t('deceased')}
            </span>
          )}
          {person.is_in_law && (
            <span
              className={`rounded-md border px-2 py-0.5 font-sans text-sm font-medium whitespace-nowrap sm:text-sm ${
                person.gender === 'female'
                  ? 'border-rose-200/60 bg-rose-50/50 text-rose-700'
                  : person.gender === 'male'
                    ? 'border-sky-200/60 bg-sky-50/50 text-sky-700'
                    : 'border-stone-200/60 bg-stone-50/50 text-stone-700'
              }`}>
              {person.gender === 'female'
                ? t('daughterInLaw')
                : person.gender === 'male'
                  ? t('sonInLaw')
                  : t('inLawOther')}
            </span>
          )}
          {person.birth_order != null && !person.is_in_law && (
            <span className='rounded-md border border-amber-200/60 bg-amber-50/60 px-2 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-amber-700 sm:text-sm'>
              {person.birth_order === 1
                ? t('firstChild')
                : t('nthChild', { count: person.birth_order })}
            </span>
          )}
          {person.generation != null && (
            <span className='rounded-md border border-emerald-200/60 bg-emerald-50/60 px-2 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-emerald-700 sm:text-sm'>
              {t('generationLabel', { generation: person.generation })}
            </span>
          )}
        </h1>
        {person.other_names && (
          <p className='mt-1.5 text-sm font-medium text-stone-600 italic sm:text-sm'>
            {t('otherNames')}:{' '}
            <span className='font-medium text-stone-700 not-italic'>
              {person.other_names}
            </span>
          </p>
        )}
      </div>
    </m.div>
  )
}
