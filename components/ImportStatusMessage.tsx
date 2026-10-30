'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { noticeAria } from '@/utils/a11y'

interface ImportStatus {
  type: 'success' | 'error'
  message: string | undefined
}

export default function ImportStatusMessage({
  status,
  action
}: {
  status: ImportStatus | null
  /** A follow-up button shown after the message. */
  action?: ReactNode
}) {
  return (
    <AnimatePresence>
      {status && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          {...noticeAria(status.type)}
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
          {status.type === 'success' ? (
            <CheckCircle2 className='size-5 shrink-0' />
          ) : (
            <AlertTriangle className='size-5 shrink-0' />
          )}
          <p className='text-sm font-medium whitespace-pre-line'>
            {status.message}
          </p>
          {action ? <div className='ml-auto shrink-0'>{action}</div> : null}
        </m.div>
      )}
    </AnimatePresence>
  )
}
