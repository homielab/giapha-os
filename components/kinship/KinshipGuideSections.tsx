'use client'

import { AnimatePresence, m } from 'framer-motion'
import { ArrowLeftRight, BookOpen, Info } from 'lucide-react'
import { useState } from 'react'

import type { TranslationKey } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n/useI18n'

// ── Kinship reference table data ──────────────────────────────────────────────
const KINSHIP_TERMS: [TranslationKey, TranslationKey, TranslationKey][] = [
  ['kinshipTerm1Relation', 'kinshipTerm1Desc', 'kinshipTerm1Example'],
  ['kinshipTerm2Relation', 'kinshipTerm2Desc', 'kinshipTerm2Example'],
  ['kinshipTerm3Relation', 'kinshipTerm3Desc', 'kinshipTerm3Example'],
  ['kinshipTerm4Relation', 'kinshipTerm4Desc', 'kinshipTerm4Example'],
  ['kinshipTerm5Relation', 'kinshipTerm5Desc', 'kinshipTerm5Example'],
  ['kinshipTerm6Relation', 'kinshipTerm6Desc', 'kinshipTerm6Example'],
  ['kinshipTerm7Relation', 'kinshipTerm7Desc', 'kinshipTerm7Example'],
  ['kinshipTerm8Relation', 'kinshipTerm8Desc', 'kinshipTerm8Example']
]

// ── Regional kinship terms ────────────────────────────────────────────────────
const REGIONAL_TERMS: [TranslationKey, TranslationKey][] = [
  ['regionalTerm1Reference', 'regionalTerm1Other'],
  ['regionalTerm2Reference', 'regionalTerm2Other'],
  ['regionalTerm3Reference', 'regionalTerm3Other'],
  ['regionalTerm4Reference', 'regionalTerm4Other'],
  ['regionalTerm5Reference', 'regionalTerm5Other'],
  ['regionalTerm6Reference', 'regionalTerm6Other'],
  ['regionalTerm7Reference', 'regionalTerm7Other'],
  ['regionalTerm8Reference', 'regionalTerm8Other'],
  ['regionalTerm9Reference', 'regionalTerm9Other'],
  ['regionalTerm10Reference', 'regionalTerm10Other'],
  ['regionalTerm11Reference', 'regionalTerm11Other'],
  ['regionalTerm12Reference', 'regionalTerm12Other'],
  ['regionalTerm13Reference', 'regionalTerm13Other']
]

export default function KinshipGuideSections() {
  const { t } = useI18n()
  const [showGuide, setShowGuide] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [showRegional, setShowRegional] = useState(false)

  return (
    <div className='space-y-4 border-t border-stone-200/60 pt-6'>
      <div className='flex flex-wrap items-center gap-6'>
        <button
          onClick={() => {
            setShowGuide((v) => !v)
            if (!showGuide) {
              setShowReference(false)
              setShowRegional(false)
            }
          }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${showGuide ? 'text-amber-600' : 'text-stone-500 hover:text-amber-600'}`}>
          <Info className='size-4' />
          {t('usageGuide')}
        </button>
        <button
          onClick={() => {
            setShowReference((v) => !v)
            if (!showReference) {
              setShowGuide(false)
              setShowRegional(false)
            }
          }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${showReference ? 'text-amber-600' : 'text-stone-500 hover:text-amber-600'}`}>
          <BookOpen className='size-4' />
          {t('kinshipReference')}
        </button>
        <button
          onClick={() => {
            setShowRegional((v) => !v)
            if (!showRegional) {
              setShowGuide(false)
              setShowReference(false)
            }
          }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${showRegional ? 'text-amber-600' : 'text-stone-500 hover:text-amber-600'}`}>
          <ArrowLeftRight className='size-4' />
          {t('regionalTerms')}
        </button>
      </div>

      <AnimatePresence mode='wait'>
        {showGuide && (
          <m.div
            key='guide'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'>
            <div className='space-y-5 pb-2'>
              {/* How it works */}
              <div className='rounded-2xl border border-blue-100 bg-blue-50/60 p-5'>
                <p className='mb-3 flex items-center gap-2 text-sm font-medium text-blue-700'>
                  <Info className='size-4' />
                  {t('howItWorks')}
                </p>
                <ol className='space-y-2 text-sm text-blue-800'>
                  <li className='flex gap-2'>
                    <span className='shrink-0 font-medium'>1.</span>
                    {t('guideStep1')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 font-medium'>2.</span>
                    {t('guideStep2')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 font-medium'>3.</span>
                    {t('guideStep3')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 font-medium'>4.</span>
                    {t('guideStep4')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 font-medium'>5.</span>
                    {t('guideStep5')}
                  </li>
                </ol>
              </div>

              {/* Data requirements */}
              <div className='rounded-2xl border border-amber-100 bg-amber-50/60 p-5'>
                <p className='mb-2 flex items-center gap-2 text-sm font-medium text-amber-700'>
                  <Info className='size-4' />
                  {t('dataRequirements')}
                </p>
                <ul className='space-y-1.5 text-sm text-amber-800'>
                  <li className='flex gap-2'>
                    <span className='shrink-0 text-amber-400'>•</span>
                    {t('dataRequirement1')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 text-amber-400'>•</span>
                    {t('dataRequirement2')}
                  </li>
                  <li className='flex gap-2'>
                    <span className='shrink-0 text-amber-400'>•</span>
                    {t('dataRequirement3')}
                  </li>
                </ul>
              </div>
            </div>
          </m.div>
        )}

        {showReference && (
          <m.div
            key='reference'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'>
            <div className='space-y-5 pb-2'>
              {/* Reference table */}
              <div className='overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80'>
                <div className='border-b border-stone-100 bg-stone-50/50 px-5 py-3'>
                  <p className='text-sm font-medium text-stone-600'>
                    {t('referenceTableTitle')}
                  </p>
                </div>
                <div className='divide-y divide-stone-100'>
                  {KINSHIP_TERMS.map((row) => (
                    <div
                      key={row[0]}
                      className='flex items-start gap-4 px-5 py-3'>
                      <span className='w-48 shrink-0 text-sm font-medium text-amber-700'>
                        {t(row[0])}
                      </span>
                      <div className='min-w-0'>
                        <p className='text-sm text-stone-600'>{t(row[1])}</p>
                        <p className='mt-0.5 text-sm text-stone-500'>
                          {t(row[2])}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </m.div>
        )}

        {showRegional && (
          <m.div
            key='regional'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'>
            <div className='space-y-5 pb-2'>
              {/* Regional Reference table */}
              <div className='overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80'>
                <div className='border-b border-stone-100 bg-stone-50/50 px-5 py-3'>
                  <p className='text-sm font-medium text-stone-600'>
                    {t('regionalDescription')}
                  </p>
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-sm'>
                    <thead className='border-b border-stone-100 bg-stone-50/30 text-sm text-stone-500'>
                      <tr>
                        <th className='w-1/2 border-r border-stone-100 px-5 py-3 font-medium text-emerald-700'>
                          {t('referenceColumn')}
                        </th>
                        <th className='w-1/2 px-5 py-3 font-medium text-amber-700'>
                          {t('alternateNames')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-stone-100'>
                      {REGIONAL_TERMS.map((row) => (
                        <tr
                          key={row[0]}
                          className='transition-colors hover:bg-stone-50/50'>
                          <td className='border-r border-stone-100/50 px-5 py-3 font-medium text-stone-700'>
                            {t(row[0])}
                          </td>
                          <td className='px-5 py-3 text-stone-600'>
                            {t(row[1])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fun facts */}
              <div className='rounded-2xl border border-blue-100 bg-blue-50/60 p-5'>
                <p className='mb-4 flex items-center gap-2 text-sm font-medium text-blue-700'>
                  <Info className='size-4' />
                  {t('regionalFactsTitle')}
                </p>
                <div className='mt-5 border-t border-blue-200/50 pt-4'>
                  <p className='font-medium text-blue-900'>
                    {t('regionalFactsHeading')}
                  </p>
                  <p className='mt-2 leading-relaxed'>
                    {t('regionalFactsDescription')}
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
