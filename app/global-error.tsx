'use client'

import { useEffect } from 'react'

import { globalErrorMessages } from '@/lib/i18n/globalErrorMessages'
import { getLocale } from '@/lib/i18n/locales'

// Replaces the root layout when it fails, so it brings its own <html>, reads
// the locale from the cookie itself and uses plain styles (no provider, no
// global CSS guarantees).
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const cookie = /(?:^|; )locale=([^;]*)/.exec(
    typeof document === 'undefined' ? '' : document.cookie
  )
  const locale = getLocale(cookie ? decodeURIComponent(cookie[1]) : undefined)
  const messages = globalErrorMessages[locale]

  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          fontFamily: 'system-ui, sans-serif',
          background: '#fafaf9',
          color: '#292524'
        }}>
        <main style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            {messages.globalErrorTitle}
          </h1>
          <p style={{ fontSize: 14, color: '#78716c' }}>
            {messages.globalErrorDescription}
          </p>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 12,
              justifyContent: 'center'
            }}>
            <button
              type='button'
              onClick={reset}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: 0,
                background: '#d97706',
                color: '#fff',
                cursor: 'pointer'
              }}>
              {messages.tryAgain}
            </button>
            {/* A plain link: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href='/'
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                background: '#e7e5e4',
                color: '#44403c',
                textDecoration: 'none'
              }}>
              {messages.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
