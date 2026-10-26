'use client'

import { useI18n } from '@/lib/i18n/useI18n'

const TONES = {
  error: 'border-red-100 bg-red-50 text-red-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-800'
}

export default function RelationshipErrorBanner({
  error,
  onDismiss,
  tone = 'error'
}: {
  error: string
  onDismiss: () => void
  tone?: keyof typeof TONES
}) {
  const { t } = useI18n()
  return (
    <div
      role='alert'
      className={`animate-in fade-in slide-in-from-top-2 mt-4 flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${TONES[tone]}`}>
      <div className='flex items-center gap-2'>
        <svg
          className={`h-5 w-5 shrink-0 ${tone === 'warning' ? 'text-amber-500' : 'text-red-500'}`}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          />
        </svg>
        <span>{error}</span>
      </div>
      <button
        onClick={onDismiss}
        aria-label={t('clearError')}
        className={`p-1 transition-colors ${tone === 'warning' ? 'text-amber-500 hover:text-amber-700' : 'text-red-400 hover:text-red-600'}`}>
        <svg
          className='h-4 w-4'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M6 18L18 6M6 6l12 12'
          />
        </svg>
      </button>
    </div>
  )
}
