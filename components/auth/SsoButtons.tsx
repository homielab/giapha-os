'use client'

import { useI18n } from '@/lib/i18n/useI18n'

export default function SsoButtons({
  loading,
  onOAuth
}: {
  loading: boolean
  onOAuth: (provider: 'google' | 'facebook') => void
}) {
  const { t } = useI18n()
  return (
    <>
      <div className='relative flex items-center py-2'>
        <div className='grow border-t border-stone-200'></div>
        <span className='mx-4 shrink-0 text-sm font-medium text-stone-500'>
          {t('or')}
        </span>
        <div className='grow border-t border-stone-200'></div>
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <button
          type='button'
          disabled={loading}
          onClick={() => onOAuth('google')}
          className='flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200/80 bg-white py-3.5 text-sm font-medium text-stone-700 transition duration-200 hover:bg-stone-50 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-60'>
          <svg aria-hidden='true' className='size-4' viewBox='0 0 24 24'>
            <path
              fill='#4285F4'
              d='M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z'
            />
            <path
              fill='#34A853'
              d='M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.5Z'
            />
            <path
              fill='#FBBC05'
              d='M6.53 13.58A5.86 5.86 0 0 1 6.22 12c0-.55.1-1.08.31-1.58V7.89H3.28A9.5 9.5 0 0 0 2.25 12c0 1.48.36 2.88 1.03 4.11l3.25-2.53Z'
            />
            <path
              fill='#EA4335'
              d='M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.48 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.72 5.39l3.25 2.53C7.3 8.11 9.46 6.39 12 6.39Z'
            />
          </svg>
          Google
        </button>

        <button
          type='button'
          disabled={loading}
          onClick={() => onOAuth('facebook')}
          className='flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200/80 bg-white py-3.5 text-sm font-medium text-stone-700 transition duration-200 hover:bg-stone-50 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-60'>
          <svg aria-hidden='true' className='size-4' viewBox='0 0 24 24'>
            <path
              fill='#1877F2'
              d='M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.04 1.8-4.72 4.57-4.72 1.32 0 2.7.24 2.7.24v2.98h-1.52c-1.5 0-1.98.94-1.98 1.9v2.26h3.37l-.54 3.49H13.9V24C19.61 23.1 24 18.1 24 12.07Z'
            />
          </svg>
          Facebook
        </button>
      </div>
    </>
  )
}
