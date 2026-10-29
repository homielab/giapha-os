'use client'

import { ReactNode, useMemo, useState } from 'react'

import { translateWith } from './interpolate'
import type { Locale } from './locales'
import type { Messages } from './messages'
import { I18nContext, I18nContextValue } from './useI18n'

// Receives the dictionary of the current locale from the server layout, so the
// client bundle does not ship both languages.
export function I18nProvider({
  children,
  initialLocale,
  messages
}: {
  children: ReactNode
  initialLocale: Locale
  messages: Messages
}) {
  const [locale, setLocaleState] = useState(initialLocale)

  const setLocale = (nextLocale: Locale) => {
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    setLocaleState(nextLocale)
    document.documentElement.lang = nextLocale
    window.location.reload()
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      setLocale,
      t: (key, values) => translateWith(messages, locale, key, values)
    }),
    [locale, messages]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
