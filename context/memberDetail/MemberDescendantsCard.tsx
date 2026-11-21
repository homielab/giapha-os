'use client'

import { m } from 'framer-motion'
import { Baby, UserPlus, Users } from 'lucide-react'

import { FemaleIcon, MaleIcon } from '@/components/GenderIcons'
import {
  itemVariants,
  RelationshipStats
} from '@/context/memberDetail/memberDetailShared'
import { useI18n } from '@/lib/i18n/useI18n'

export default function MemberDescendantsCard({
  relStats
}: {
  relStats: RelationshipStats
}) {
  const { t } = useI18n()
  return (
    <m.div
      variants={itemVariants}
      className='rounded-2xl border border-stone-200/60 bg-white p-4 transition-colors hover:border-amber-200/60 sm:col-span-2 md:col-span-3'>
      <div className='mb-3 flex items-center gap-2'>
        <span className='size-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'></span>
        <h3 className='text-base font-semibold text-stone-400'>
          {t('descendants')}
        </h3>
      </div>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {/* Biological Children */}
        {relStats.biologicalChildren > 0 && (
          <div className='group flex flex-col justify-between rounded-xl border border-stone-100 bg-stone-50/80 p-3 transition-colors hover:bg-stone-100/80'>
            <div className='mb-2 flex items-center gap-3'>
              <div className='rounded-lg bg-blue-100/50 p-2 text-blue-600 transition-colors group-hover:bg-blue-100'>
                <Users className='size-4' />
              </div>
              <div className='flex-1'>
                <p className='text-sm leading-tight font-medium text-stone-500'>
                  {t('biologicalChildren')}
                </p>
                <p className='mt-0.5 text-sm leading-none font-medium text-stone-700'>
                  {relStats.biologicalChildren}
                </p>
              </div>
            </div>

            <div className='mt-auto flex flex-wrap gap-1.5 border-t border-stone-200/50 pt-1'>
              {relStats.maleBiologicalChildren > 0 && (
                <span className='flex items-center gap-1 rounded bg-sky-100/50 px-1.5 py-0.5 text-sm font-medium text-sky-700'>
                  <MaleIcon className='size-3 shrink-0' />{' '}
                  {relStats.maleBiologicalChildren}
                </span>
              )}
              {relStats.femaleBiologicalChildren > 0 && (
                <span className='flex items-center gap-1 rounded bg-rose-100/50 px-1.5 py-0.5 text-sm font-medium text-rose-700'>
                  <FemaleIcon className='size-3 shrink-0' />{' '}
                  {relStats.femaleBiologicalChildren}
                </span>
              )}
            </div>
          </div>
        )}

        {/* In-Laws */}
        {(relStats.sonInLaw > 0 || relStats.daughterInLaw > 0) && (
          <div className='group flex flex-col rounded-xl border border-stone-100 bg-stone-50/80 p-3 transition-colors hover:bg-stone-100/80'>
            <div className='mb-2 flex items-center gap-3'>
              <div className='rounded-lg bg-stone-200/50 p-2 text-stone-600 transition-colors group-hover:bg-stone-200'>
                <UserPlus className='size-4' />
              </div>
              <p className='text-sm font-medium text-stone-500'>
                {t('inLaws')}
              </p>
            </div>

            <div className='mt-auto w-full space-y-1 border-t border-stone-200/50 pt-1'>
              {relStats.daughterInLaw > 0 && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-stone-500'>
                    {t('daughterInLawChild')}
                  </span>
                  <span className='font-medium text-stone-700'>
                    {relStats.daughterInLaw}
                  </span>
                </div>
              )}
              {relStats.sonInLaw > 0 && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-stone-500'>
                    {t('sonInLawChild')}
                  </span>
                  <span className='font-medium text-stone-700'>
                    {relStats.sonInLaw}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grandchildren */}
        {(relStats.paternalGrandchildren > 0 ||
          relStats.maternalGrandchildren > 0) && (
          <div className='group flex flex-col rounded-xl border border-stone-100 bg-stone-50/80 p-3 transition-colors hover:bg-stone-100/80'>
            <div className='mb-2 flex items-center gap-3'>
              <div className='rounded-lg bg-emerald-100/50 p-2 text-emerald-600 transition-colors group-hover:bg-emerald-100'>
                <Baby className='size-4' />
              </div>
              <p className='text-sm font-medium text-stone-500'>
                {t('grandchildren')}
              </p>
            </div>

            <div className='mt-auto w-full space-y-1 border-t border-stone-200/50 pt-1'>
              {relStats.paternalGrandchildren > 0 && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-stone-500'>
                    {t('paternalGrandchildren')}
                  </span>
                  <span className='font-medium text-stone-700'>
                    {relStats.paternalGrandchildren}
                  </span>
                </div>
              )}
              {relStats.maternalGrandchildren > 0 && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-stone-500'>
                    {t('maternalGrandchildren')}
                  </span>
                  <span className='font-medium text-stone-700'>
                    {relStats.maternalGrandchildren}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </m.div>
  )
}
