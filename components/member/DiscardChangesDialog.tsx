'use client'

import { AlertTriangle } from 'lucide-react'
import { useId } from 'react'

import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'

interface DiscardChangesDialogProps {
  onKeepEditing: () => void
  onDiscard: () => void
}

export default function DiscardChangesDialog({
  onKeepEditing,
  onDiscard
}: DiscardChangesDialogProps) {
  const { t } = useI18n()
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useModalA11y(onKeepEditing)
  return (
    <div
      ref={dialogRef}
      role='alertdialog'
      aria-modal='true'
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      className='fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none'>
      <div
        className='absolute inset-0 cursor-pointer bg-stone-900/40 backdrop-blur-sm'
        onClick={onKeepEditing}
      />
      <div className='relative z-10 w-full max-w-md rounded-2xl border border-stone-200/60 bg-white p-6'>
        <div className='flex items-start gap-4'>
          <div className='mt-1 shrink-0 rounded-full bg-amber-100/60 p-3 text-amber-600'>
            <AlertTriangle className='size-6' aria-hidden='true' />
          </div>
          <div>
            <h3 id={titleId} className='text-lg font-semibold text-stone-800'>
              {t('discardChangesTitle')}
            </h3>
            <p id={bodyId} className='mt-2 text-sm text-stone-600'>
              {t('discardChangesBody')}
            </p>
          </div>
        </div>
        <div className='mt-6 flex justify-end gap-3'>
          <button type='button' onClick={onDiscard} className='btn'>
            {t('discardChanges')}
          </button>
          <button type='button' onClick={onKeepEditing} className='btn-primary'>
            {t('keepEditing')}
          </button>
        </div>
      </div>
    </div>
  )
}
