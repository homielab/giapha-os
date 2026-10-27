export const locales = ['vi', 'en'] as const

export type Locale = (typeof locales)[number]

export function getLocale(value?: string | null): Locale {
  return value === 'en' ? 'en' : 'vi'
}
