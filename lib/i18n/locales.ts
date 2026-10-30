export const locales = ['vi', 'en'] as const

export type Locale = (typeof locales)[number]

// The language of the app when no `locale` cookie is set, and of emails sent to
// administrators (the sender's language says nothing about theirs).
export const defaultLocale: Locale = 'vi'

export function getLocale(value?: string | null): Locale {
  return value === 'en' ? 'en' : defaultLocale
}

// The language for a first visit (no `locale` cookie yet), from the browser's
// Accept-Language header: English when English ranks above Vietnamese,
// Vietnamese otherwise (also when neither is listed).
export function localeFromAcceptLanguage(header?: string | null): Locale {
  if (!header) return defaultLocale
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';')
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='))
      const quality = q ? Number(q.slice(2)) : 1
      return { lang: tag.split('-')[0], quality, index }
    })
    .filter(
      ({ lang, quality }) =>
        (lang === 'en' || lang === 'vi') &&
        Number.isFinite(quality) &&
        quality > 0
    )
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
  return ranked[0]?.lang === 'en' ? 'en' : defaultLocale
}
