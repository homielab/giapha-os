'use client'

import { ReactNode, useMemo, useState } from 'react'

import { getMessages, Locale } from './messages'
import { I18nContext, I18nContextValue } from './useI18n'

export function I18nProvider({
  children,
  initialLocale
}: {
  children: ReactNode
  initialLocale: Locale
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
      messages: getMessages(locale),
      setLocale,
      t: (key, values) => {
        let value: string = getMessages(locale)[key]
        if (values) {
          Object.entries(values).forEach(([name, replacement]) => {
            value = value.replace(`{${name}}`, String(replacement))
          })
        }
        return value
      }
    }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
