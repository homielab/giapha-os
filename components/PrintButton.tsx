'use client'

import { Printer } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'

interface PrintButtonProps {
  /** Document title while printing (browsers put it in the page header). */
  title?: string
}

export default function PrintButton({ title }: PrintButtonProps) {
  const { t } = useI18n()

  const handlePrint = () => {
    const previous = document.title
    if (title) document.title = title
    window.addEventListener(
      'afterprint',
      () => {
        document.title = previous
      },
      { once: true }
    )
    window.print()
  }

  return (
    <button
      type='button'
      onClick={handlePrint}
      className='btn flex flex-1 items-center justify-center gap-2 sm:flex-none print:hidden'>
      <Printer className='size-4' aria-hidden='true' />
      {t('printProfile')}
    </button>
  )
}
