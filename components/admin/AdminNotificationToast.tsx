'use client'

import { AnimatePresence, m } from 'framer-motion'

import { noticeAria } from '@/utils/a11y'

export interface AdminNotification {
  message: string
  type: 'success' | 'error' | 'info'
}

interface AdminNotificationToastProps {
  notification: AdminNotification | null
}

export default function AdminNotificationToast({
  notification
}: AdminNotificationToastProps) {
  return (
    <AnimatePresence>
      {notification && (
        <m.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          {...noticeAria(notification.type)}
          className={`fixed top-1/2 left-1/2 z-100 flex max-w-[90vw] min-w-[320px] items-center gap-3 rounded-xl border px-6 py-3 ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800'
              : notification.type === 'error'
                ? 'border-red-200 bg-red-50/90 text-red-800'
                : 'border-amber-200 bg-amber-50/90 text-amber-800'
          }`}>
          {notification.type === 'success' && (
            <svg
              className='size-5 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          )}
          {notification.type === 'error' && (
            <svg
              className='size-5 shrink-0'
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
          )}
          {notification.type === 'info' && (
            <svg
              className='size-5 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          )}
          <p className='text-sm font-medium'>{notification.message}</p>
        </m.div>
      )}
    </AnimatePresence>
  )
}
