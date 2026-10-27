import { cookies } from 'next/headers'

import { interpolate, type TranslationValues } from './interpolate'
import {
  getLocale,
  getMessages,
  type Locale,
  type TranslationKey
} from './messages'

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return getLocale(cookieStore.get('locale')?.value)
}

export async function getServerTranslations() {
  const locale = await getServerLocale()
  const dictionary = getMessages(locale)

  return {
    locale,
    dictionary,
    t: (key: TranslationKey, values?: TranslationValues) =>
      interpolate(dictionary[key], values)
  }
}
