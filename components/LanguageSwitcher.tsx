'use client'

import { Languages } from 'lucide-react'

import { locales } from '@/lib/i18n/locales'
import { useI18n } from '@/lib/i18n/useI18n'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className='inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-2 text-sm font-medium text-stone-600'>
      <Languages className='size-4 text-stone-500' aria-hidden='true' />
      <span className='sr-only'>{t('language')}</span>
      <select
        aria-label={t('language')}
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value as (typeof locales)[number])
        }
        className='cursor-pointer bg-transparent text-sm font-medium text-stone-700 outline-none'>
        <option value='vi'>{t('vietnamese')}</option>
        <option value='en'>{t('english')}</option>
      </select>
    </label>
  )
}
