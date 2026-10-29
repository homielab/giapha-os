'use client'

import { useI18n } from '@/lib/i18n/useI18n'

export interface FooterProps {
  className?: string
  showDisclaimer?: boolean
}

export default function Footer({
  className = '',
  showDisclaimer = false
}: FooterProps) {
  const { t } = useI18n()

  return (
    <footer
      className={`py-8 text-center text-sm text-stone-500 ${className} backdrop-blur-sm print:hidden`}>
      <div className='mx-auto max-w-7xl px-4'>
        {showDisclaimer && (
          <p className='mb-4 inline-block rounded-full border border-amber-200/50 bg-amber-50 px-3 py-1 text-sm text-amber-800/80'>
            {t('footerDisclaimer')}
          </p>
        )}
        <p className='flex items-center justify-center gap-2 opacity-80 transition-opacity hover:opacity-100'>
          <a
            href='https://github.com/homielab/giapha-os'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 font-medium text-stone-600 transition-colors hover:text-amber-700'>
            <svg
              viewBox='0 0 24 24'
              width='16'
              height='16'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22'></path>
            </svg>
            Gia Phả OS
          </a>
          {t('footerBy')}
          <a
            href='https://homielab.com'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 font-medium text-green-600 transition-colors hover:text-amber-700'>
            HomieLab
          </a>
        </p>
      </div>
    </footer>
  )
}
