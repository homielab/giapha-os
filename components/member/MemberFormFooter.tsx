'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { RefObject } from 'react'

import { formSectionVariants } from '@/components/member/memberFormStyles'
import { useI18n } from '@/lib/i18n/useI18n'

interface MemberFormFooterProps {
  error: string | null
  /** Set when someone else changed the person: shows a reload button. */
  onReload?: () => void
  /** "Saved, but…" message; the user continues with onContinue. */
  warning: string | null
  onContinue: () => void
  /** "Save anyway?" question; the user answers with onConfirm. */
  confirmation: string | null
  onConfirm: () => void
  errorRef: RefObject<HTMLDivElement | null>
  loading: boolean
  processingAvatar: boolean
  isEditing: boolean
  onCancel: () => void
}

export default function MemberFormFooter({
  error,
  onReload,
  warning,
  onContinue,
  confirmation,
  onConfirm,
  errorRef,
  loading,
  processingAvatar,
  isEditing,
  onCancel
}: MemberFormFooterProps) {
  const { t } = useI18n()
  return (
    <>
      <AnimatePresence>
        {error && (
          <m.div
            key='error'
            ref={errorRef}
            role='alert'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700'>
            <AlertCircle className='mt-0.5 size-5 shrink-0' />
            <p className='min-w-0 flex-1'>{error}</p>
            {onReload && (
              <button type='button' onClick={onReload} className='btn'>
                {t('reloadPage')}
              </button>
            )}
          </m.div>
        )}
        {confirmation && (
          <m.div
            key='confirmation'
            ref={error ? undefined : errorRef}
            role='alert'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800'>
            <AlertTriangle className='mt-0.5 size-5 shrink-0' />
            <p className='min-w-0 flex-1 whitespace-pre-line'>{confirmation}</p>
            <button type='button' onClick={onConfirm} className='btn'>
              {t('continueAction')}
            </button>
          </m.div>
        )}
        {warning && (
          <m.div
            key='warning'
            ref={error || confirmation ? undefined : errorRef}
            role='alert'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800'>
            <AlertTriangle className='mt-0.5 size-5 shrink-0' />
            <p className='min-w-0 flex-1'>{warning}</p>
            <button type='button' onClick={onContinue} className='btn'>
              {t('continueAction')}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <m.div
        variants={formSectionVariants}
        initial='hidden'
        animate='show'
        transition={{ delay: 0.2 }}
        className='flex justify-end gap-3 pt-6 sm:gap-4'>
        <button type='button' onClick={onCancel} className='btn'>
          {t('cancel')}
        </button>
        <button
          type='submit'
          disabled={loading || processingAvatar}
          className='btn-primary disabled:pointer-events-none disabled:opacity-60'>
          {loading && <Loader2 className='size-4 animate-spin' />}
          {loading
            ? t('saving')
            : isEditing
              ? t('saveChanges')
              : t('addMember')}
        </button>
      </m.div>
    </>
  )
}
