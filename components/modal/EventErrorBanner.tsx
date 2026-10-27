'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface EventErrorBannerProps {
  error: string | null
}

export default function EventErrorBanner({ error }: EventErrorBannerProps) {
  return (
    <AnimatePresence>
      {error && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role='alert'
          className='mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700'>
          <AlertCircle className='mt-0.5 size-5 shrink-0' />
          <p>{error}</p>
        </m.div>
      )}
    </AnimatePresence>
  )
}
