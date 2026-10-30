'use client'

import Image from 'next/image'
import { memo } from 'react'

import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { lifeYearsLabel } from '@/utils/memberSearch'
import { getAvatarBg } from '@/utils/styleHelpers'

import DefaultAvatar from './DefaultAvatar'
import { FemaleIcon, MaleIcon } from './GenderIcons'

interface PersonCardProps {
  person: Person
}

function getGenderStyle(gender: string) {
  if (gender === 'male') return 'bg-sky-100 text-sky-600'
  if (gender === 'female') return 'bg-rose-100 text-rose-600'
  return 'bg-stone-100 text-stone-600'
}

function PersonAvatar({ person }: { person: Person }) {
  const { t } = useI18n()
  const avatarUrl = useAvatarUrl()
  return (
    <div className='relative'>
      <div
        className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium text-white shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105 sm:size-16 ${getAvatarBg(person.gender)}`}>
        {avatarUrl(person.avatar_url) ? (
          <Image
            unoptimized
            src={avatarUrl(person.avatar_url)!}
            alt=''
            width={32}
            height={32}
            className='h-full w-full object-cover'
          />
        ) : (
          <DefaultAvatar gender={person.gender} size={32} />
        )}
      </div>
      <div
        className={`absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full shadow-sm ring-2 ring-white ${getGenderStyle(person.gender)}`}>
        {person.gender === 'male' ? (
          <MaleIcon className='size-5' label={t('male')} />
        ) : person.gender === 'female' ? (
          <FemaleIcon className='size-5' label={t('female')} />
        ) : null}
      </div>
    </div>
  )
}

export function PersonBadges({
  person,
  isDeceased
}: {
  person: Person
  isDeceased: boolean
}) {
  const { t } = useI18n()

  if (!(
    isDeceased ||
    person.is_in_law ||
    (person.birth_order != null && !person.is_in_law) ||
    person.generation != null
  )) {
    return null
  }

  return (
    <div className='mt-2 flex shrink-0 flex-wrap items-center gap-1.5'>
      {person.is_in_law && (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-medium sm:text-sm ${
            person.gender === 'male'
              ? 'border-sky-200/60 bg-sky-50 text-sky-700'
              : person.gender === 'female'
                ? 'border-rose-200/60 bg-rose-50 text-rose-700'
                : 'border-stone-200/60 bg-stone-50 text-stone-700'
          }`}>
          {person.gender === 'male'
            ? t('inLawMale')
            : person.gender === 'female'
              ? t('inLawFemale')
              : t('inLawOther')}
        </span>
      )}
      {person.birth_order != null && !person.is_in_law && (
        <span className='inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-sm font-medium text-amber-700 sm:text-sm'>
          {person.birth_order === 1
            ? t('firstChild')
            : t('nthChild', { count: person.birth_order })}
        </span>
      )}
      {person.generation != null && (
        <span className='inline-flex items-center rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700 sm:text-sm'>
          {t('generationLabel', { generation: person.generation })}
        </span>
      )}
      {isDeceased && (
        <span className='inline-flex items-center rounded-md border border-stone-200/60 bg-stone-100 px-2 py-0.5 text-sm font-medium text-stone-500 sm:text-sm'>
          {t('deceased')}
        </span>
      )}
    </div>
  )
}

function PersonCard({ person }: PersonCardProps) {
  const { setMemberModalId } = useMemberListView()

  const isDeceased = person.is_deceased

  return (
    <button
      type='button'
      onClick={() => setMemberModalId(person.id)}
      className={`group relative block overflow-hidden rounded-3xl border border-border bg-white/60 p-2 transition duration-300 hover:-translate-y-1 hover:border-tertiary hover:bg-surface/90 sm:p-4 ${isDeceased ? 'opacity-80 grayscale-[0.3]' : ''}`}>
      {/* Decorative gradient blob */}
      {/* <div
        className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[50px] opacity-20 transition duration-500 group-hover:opacity-40 group-hover:scale-125 ${person.gender === "male" ? "bg-sky-400" : person.gender === "female" ? "bg-rose-400" : "bg-stone-400"}`}
      /> */}

      <div className='relative z-10 flex items-center space-x-4'>
        <PersonAvatar person={person} />

        <div className='min-w-0 flex-1'>
          <h3 className='mb-1.5 truncate text-left text-base font-semibold text-stone-900 transition-colors group-hover:text-amber-700 sm:text-lg'>
            {person.full_name}
          </h3>
          <p className='flex items-center gap-1.5 truncate text-sm font-medium text-stone-500'>
            <svg
              className='size-4 shrink-0 text-stone-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
              />
            </svg>
            <span className='truncate'>
              {lifeYearsLabel({ ...person, is_deceased: isDeceased }, '...')}
            </span>
          </p>
          <PersonBadges person={person} isDeceased={isDeceased} />
        </div>
      </div>
    </button>
  )
}

export default memo(PersonCard)
