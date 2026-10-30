export const locales = ['vi', 'en'] as const

export type Locale = (typeof locales)[number]

// The language of the app when no `locale` cookie is set, and of emails sent to
// administrators (the sender's language says nothing about theirs).
export const defaultLocale: Locale = 'vi'

export function getLocale(value?: string | null): Locale {
  return value === 'en' ? 'en' : defaultLocale
}
