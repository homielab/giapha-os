'use client'

import { m } from 'framer-motion'
import { Leaf, MapPin } from 'lucide-react'

import MemberDescendantsCard from '@/context/memberDetail/MemberDescendantsCard'
import {
  itemVariants,
  RelationshipStats
} from '@/context/memberDetail/memberDetailShared'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import {
  calculateAge,
  formatDisplayDate,
  getLunarDateString,
  getSolarDateString,
  getZodiacAnimal,
  getZodiacSign
} from '@/utils/dateHelpers'

interface MemberInfoCardsProps {
  person: Person
  isDeceased: boolean
  relStats: RelationshipStats | null
}

function BirthCard({ person }: { person: Person }) {
  const { t } = useI18n()
  return (
    <m.div
      variants={itemVariants}
      className='rounded-2xl border border-stone-200/60 bg-white/80 p-4 backdrop-blur-sm transition-colors hover:border-amber-200/60'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'></span>
          <h3 className='text-base font-semibold text-stone-400'>
            {t('birth')}
          </h3>
        </div>
        <div className='flex items-center gap-1'>
          {person.birth_year &&
            getZodiacAnimal(
              person.birth_year,
              person.birth_month,
              person.birth_day
            ) && (
              <span className='rounded-md border border-rose-200/60 bg-rose-50 px-1.5 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-rose-700'>
                {t('zodiacAge')}{' '}
                {t(
                  getZodiacAnimal(
                    person.birth_year,
                    person.birth_month,
                    person.birth_day
                  )!
                )}
              </span>
            )}
          {person.birth_day &&
            person.birth_month &&
            getZodiacSign(person.birth_day, person.birth_month) && (
              <span className='rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 font-sans text-sm font-medium whitespace-nowrap text-indigo-700'>
                {t(getZodiacSign(person.birth_day, person.birth_month)!)}
              </span>
            )}
        </div>
      </div>
      <div className='space-y-1.5 border-l-2 border-stone-100 pl-4'>
        <p className='text-sm font-medium text-stone-800 sm:text-sm'>
          {formatDisplayDate(
            person.birth_year,
            person.birth_month,
            person.birth_day,
            t
          )}
        </p>
        {(person.birth_year || person.birth_month || person.birth_day) && (
          <p className='flex items-center gap-1.5 text-sm font-medium text-stone-500'>
            <span className='rounded border border-stone-200/60 bg-stone-50/80 px-1.5 py-0.5 text-sm'>
              {t('lunar')}
            </span>
            {getLunarDateString(
              person.birth_year,
              person.birth_month,
              person.birth_day,
              t
            ) || t('unknownDate')}
          </p>
        )}
      </div>
    </m.div>
  )
}

function DeathCard({ person }: { person: Person }) {
  const { t } = useI18n()
  const burialPlace = person.burial_place?.trim()
  return (
    <m.div
      variants={itemVariants}
      className='rounded-2xl border border-stone-200/60 bg-white/80 p-4 backdrop-blur-sm transition-colors hover:border-amber-200/60'>
      <div className='mb-2 flex items-center gap-2'>
        <span className='size-2 rounded-full bg-stone-400 shadow-[0_0_8px_rgba(156,163,175,0.5)]'></span>
        <h3 className='text-base font-semibold text-stone-400'>{t('death')}</h3>
      </div>
      <div className='space-y-1.5 border-l-2 border-stone-100 pl-4'>
        <p className='text-sm font-medium text-stone-800 sm:text-sm'>
          {person.death_day || person.death_month || person.death_year
            ? formatDisplayDate(
                person.death_year,
                person.death_month,
                person.death_day,
                t
              )
            : getSolarDateString(
                person.death_lunar_year,
                person.death_lunar_month,
                person.death_lunar_day,
                t
              ) || t('unknownDate')}
        </p>
        {(person.death_year ||
          person.death_month ||
          person.death_day ||
          person.death_lunar_year ||
          person.death_lunar_month ||
          person.death_lunar_day) && (
          <p className='flex items-center gap-1.5 text-sm font-medium text-stone-500'>
            <span className='rounded border border-stone-200/60 bg-stone-50/80 px-1.5 py-0.5 text-sm'>
              {t('lunar')}
            </span>
            {person.death_lunar_day ||
            person.death_lunar_month ||
            person.death_lunar_year
              ? formatDisplayDate(
                  person.death_lunar_year,
                  person.death_lunar_month,
                  person.death_lunar_day,
                  t
                )
              : getLunarDateString(
                  person.death_year,
                  person.death_month,
                  person.death_day,
                  t
                ) || t('unknownDate')}
          </p>
        )}
        {burialPlace && (
          <p className='flex items-start gap-1.5 text-sm font-medium text-stone-600'>
            <MapPin
              className='mt-0.5 size-3.5 shrink-0 text-stone-400'
              aria-hidden='true'
            />
            <span>
              <span className='text-stone-500'>{t('burialPlace')}:</span>{' '}
              {burialPlace}
            </span>
          </p>
        )}
      </div>
    </m.div>
  )
}

function AgeCard({
  person,
  isDeceased
}: {
  person: Person
  isDeceased: boolean
}) {
  const { t } = useI18n()
  const ageData = calculateAge(
    person.birth_year,
    person.birth_month,
    person.birth_day,
    person.death_year,
    person.death_month,
    person.death_day,
    isDeceased,
    undefined,
    {
      year: person.death_lunar_year,
      month: person.death_lunar_month,
      day: person.death_lunar_day
    }
  )
  if (!ageData) return null
  return (
    <m.div
      variants={itemVariants}
      className='relative flex flex-col justify-center overflow-hidden rounded-2xl border border-amber-200/50 bg-linear-to-br from-amber-50 to-orange-50/40 p-4 transition-colors'>
      <Leaf className='absolute -right-4 -bottom-4 h-20 w-20 rotate-12 text-amber-500/10' />
      <div className='relative z-10 mb-1.5 flex items-center gap-2'>
        <span
          className={`size-2 rounded-full ${ageData.isDeceased ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`}></span>
        <p className='text-sm font-medium text-amber-800/60'>
          {ageData.isDeceased
            ? ageData.age >= 60
              ? t('longevity')
              : t('livedYears')
            : t('zodiacAge')}
        </p>
      </div>
      <div className='relative z-10 pl-4'>
        <p className='bg-linear-to-br from-amber-700 to-amber-900 bg-clip-text text-sm font-medium text-transparent sm:text-sm'>
          {ageData.age}
          <span className='ml-1.5 text-sm font-medium text-amber-700/60 sm:text-sm'>
            {t('yearsOldLabel')}
          </span>
        </p>
      </div>
    </m.div>
  )
}

export default function MemberInfoCards({
  person,
  isDeceased,
  relStats
}: MemberInfoCardsProps) {
  return (
    <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3'>
      <BirthCard person={person} />
      {isDeceased && <DeathCard person={person} />}
      <AgeCard person={person} isDeceased={isDeceased} />
      {relStats &&
        (relStats.biologicalChildren > 0 ||
          relStats.sonInLaw > 0 ||
          relStats.daughterInLaw > 0 ||
          relStats.paternalGrandchildren > 0 ||
          relStats.maternalGrandchildren > 0) && (
          <MemberDescendantsCard relStats={relStats} />
        )}
    </div>
  )
}
