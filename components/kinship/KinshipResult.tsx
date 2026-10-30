'use client'

import { AnimatePresence, m } from 'framer-motion'
import { GitMerge, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { PersonNode } from '@/components/kinship/kinshipTypes'
import { useI18n } from '@/lib/i18n/useI18n'
import type {
  KinshipDescription,
  KinshipPathStep
} from '@/utils/kinshipHelpers'
import { describeKinship, describePathStep } from '@/utils/kinshipText'

interface KinshipResultProps {
  personA: PersonNode
  personB: PersonNode
  result: {
    description: KinshipDescription
    aCallsB: string
    bCallsA: string
    pathLabels: KinshipPathStep[]
    hasAmbiguousTerm: boolean
    hasNeutralGender?: boolean
  } | null
}

export default function KinshipResult({
  personA,
  personB,
  result
}: KinshipResultProps) {
  const { t } = useI18n()
  const unknown = result?.description.kind === 'none'
  return (
    <AnimatePresence mode='wait'>
      {result === null ? (
        <m.div key='same' className='py-8 text-center text-stone-400'>
          {t('chooseDifferentMembers')}
        </m.div>
      ) : (
        <m.div
          key={`${personA.id}-${personB.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className='space-y-4'>
          {/* Description badge */}
          <div className='flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4'>
            <Sparkles className='size-5 shrink-0 text-amber-500' />
            <p className='font-medium text-amber-800'>
              {describeKinship(result.description, t)}
            </p>
          </div>

          {/* Main kinship cards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <m.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className='rounded-2xl border border-stone-200/60 bg-white/90 p-5'>
              <p className='mb-3 text-sm font-medium text-stone-400'>
                {t('callsAs', {
                  name: personA.full_name,
                  other: personB.full_name
                })}
              </p>
              <p className='font-serif text-sm font-medium text-amber-600'>
                {unknown
                  ? t('kinshipUnknownTerm')
                  : result.aCallsB || t('kinshipNoTerm')}
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className='rounded-2xl border border-stone-200/60 bg-white/90 p-5'>
              <p className='mb-3 text-sm font-medium text-stone-400'>
                {t('callsAs', {
                  name: personB.full_name,
                  other: personA.full_name
                })}
              </p>
              <p className='font-serif text-sm font-medium text-amber-600'>
                {unknown
                  ? t('kinshipUnknownTerm')
                  : result.bCallsA || t('kinshipNoTerm')}
              </p>
            </m.div>
          </div>

          {/* Path info */}
          {result.pathLabels.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className='rounded-2xl border border-stone-200/60 bg-stone-50 px-6 py-5'>
              <div className='mb-4 flex items-center gap-2'>
                <GitMerge className='size-4 text-stone-400' />
                <p className='text-sm font-medium text-stone-400'>
                  {t('relationPathAnalysis')}
                </p>
              </div>
              <div className='space-y-4'>
                {result.pathLabels.map((step, i) => (
                  <div
                    key={describePathStep(step, t)}
                    className='flex items-start gap-4'>
                    <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white'>
                      <span className='text-sm font-medium text-stone-400'>
                        {i + 1}
                      </span>
                    </div>
                    <p className='pt-1 text-sm leading-relaxed text-stone-600'>
                      {describePathStep(step, t)}
                    </p>
                  </div>
                ))}
              </div>
            </m.div>
          )}

          {/* Who is older is unknown: say whose data would settle it */}
          {result.description.uncertain &&
            result.description.uncertainPeople && (
              <p className='px-1 text-sm text-amber-700'>
                {t('kinshipUncertainHint')}{' '}
                {result.description.uncertainPeople.map((person, i) => (
                  <span key={person.id}>
                    {i > 0 && ` ${t('kinshipUncertainOr')} `}
                    <Link
                      href={`/dashboard/members/${person.id}/edit`}
                      className='font-medium underline'>
                      {person.name}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}

          {/* Spouse of an ancestor, not linked as parent: where to fix it */}
          {result.description.kind === 'spouseOfAncestor' && (
            <p className='px-1 text-sm text-amber-700'>
              {t('kinshipSpouseOfAncestorHint')}{' '}
              <Link
                href={`/dashboard/members/${result.description.child.id}`}
                className='font-medium underline'>
                {result.description.child.name}
              </Link>
              .
            </p>
          )}

          {/* Gender 'other': why the term lists both forms */}
          {result.hasNeutralGender && (
            <p className='px-1 text-sm text-stone-600'>
              {t('kinshipNeutralGenderHint')}
            </p>
          )}

          {/* Disclaimer for ambiguous terms */}
          {result.hasAmbiguousTerm && (
            <p className='px-1 text-sm text-stone-400 italic'>
              {t('kinshipDisclaimer')}
            </p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
