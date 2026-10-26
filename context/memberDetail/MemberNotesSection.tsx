'use client'

import { m } from 'framer-motion'
import { ChevronDown, Info } from 'lucide-react'
import { useState } from 'react'

import { itemVariants } from '@/context/memberDetail/memberDetailShared'
import { useI18n } from '@/lib/i18n/useI18n'

export default function MemberNotesSection({ note }: { note: string }) {
  const { t } = useI18n()
  const [isNoteExpanded, setIsNoteExpanded] = useState(false)
  const isNoteLong = note.length > 300

  return (
    <m.section layout variants={itemVariants}>
      <h2 className='mb-4 flex items-center gap-2 text-base font-semibold text-stone-800 sm:text-lg'>
        <Info className='size-5 text-amber-600' />
        {t('notes')}
      </h2>
      <div className='relative overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 p-5 backdrop-blur-sm sm:p-6'>
        {note ? (
          <div className='flex flex-col'>
            <div
              className='relative overflow-hidden print:max-h-none!'
              style={{
                maxHeight: !isNoteExpanded && isNoteLong ? '120px' : 'none'
              }}>
              <p className='text-sm leading-relaxed whitespace-pre-wrap text-stone-600 sm:text-sm'>
                {note}
              </p>
              {/* Gradient fade overlay when collapsed */}
              {!isNoteExpanded && isNoteLong && (
                <div className='pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-linear-to-t from-white/95 via-white/40 to-transparent print:hidden' />
              )}
            </div>

            {isNoteLong && (
              <button
                onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                className='group relative z-10 mt-4 flex w-fit items-center gap-1.5 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 print:hidden'>
                <span className='underline decoration-amber-600/30 underline-offset-4 group-hover:decoration-amber-700'>
                  {isNoteExpanded ? t('collapse') : t('showMore')}
                </span>
                <m.div
                  animate={{ rotate: isNoteExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}>
                  <ChevronDown className='size-3.5' />
                </m.div>
              </button>
            )}
          </div>
        ) : (
          <p className='text-sm text-stone-400 italic sm:text-sm'>
            {t('noNotes')}
          </p>
        )}
      </div>
    </m.section>
  )
}
