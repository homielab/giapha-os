'use client'

import { Check, ClipboardCopy } from 'lucide-react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'

export default function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      setError(t('copyError'))
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <div className='w-full'>
      <button
        onClick={handleCopy}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium shadow-sm transition duration-300 ${
          copied
            ? 'bg-teal-500 text-white hover:bg-teal-600'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
        }`}>
        {copied ? (
          <>
            <Check className='size-5' />
            {t('copySuccess')}
          </>
        ) : (
          <>
            <ClipboardCopy className='size-5' />
            {t('copyAllSql')}
          </>
        )}
      </button>
      {error && (
        <div
          role='alert'
          className='animate-in fade-in slide-in-from-top-1 mt-2 flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-600'>
          {error}
        </div>
      )}
    </div>
  )
}
