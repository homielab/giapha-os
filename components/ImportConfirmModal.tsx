'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useId } from 'react'

import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'

interface ImportConfirmModalProps {
  fileName: string
  isImporting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ImportConfirmModal({
  fileName,
  isImporting,
  onCancel,
  onConfirm
}: ImportConfirmModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const dialogRef = useModalA11y(() => {
    if (!isImporting) onCancel()
  })
  return (
    <AnimatePresence>
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className='fixed inset-0 z-50 flex items-center justify-center p-4 outline-none'>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='absolute inset-0 cursor-pointer bg-stone-900/40 backdrop-blur-sm'
          onClick={onCancel}
        />
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className='relative z-10 w-full max-w-md rounded-2xl border border-stone-200/60 bg-white p-6'>
          <div className='mb-5 flex items-start gap-4'>
            <div className='mt-1 shrink-0 rounded-full bg-rose-100/50 p-3 text-rose-600'>
              <AlertTriangle className='size-6' />
            </div>
            <div>
              <h3 id={titleId} className='text-lg font-semibold text-stone-800'>
                {t('restoreConfirmTitle')}
              </h3>
              <p className='mt-2 text-sm leading-relaxed text-stone-600'>
                {t('restoreConfirmText', { file: fileName })}
              </p>
              <p className='mt-2 text-sm font-medium text-rose-600'>
                {t('restoreIrreversible')}
              </p>
            </div>
          </div>

          <div className='mt-6 flex justify-end gap-3'>
            <button
              onClick={onCancel}
              disabled={isImporting}
              className='rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900'>
              {t('restoreCancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isImporting}
              className='rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50'>
              {isImporting ? t('restoring') : t('restoreContinue')}
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  )
}
