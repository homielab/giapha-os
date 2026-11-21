'use client'

import { Database, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { installDatabase } from '@/app/actions/migrations'
import { useI18n } from '@/lib/i18n/useI18n'

export default function InstallButton() {
  const { t } = useI18n()
  const router = useRouter()
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const install = async () => {
    setInstalling(true)
    setError(null)
    try {
      const result = await installDatabase()
      if (result.success) {
        // The first account to sign up becomes the administrator.
        router.push('/login')
        return
      }
      setError(result.error)
    } catch (err) {
      console.error(err)
      setError(t('setupInstallError'))
    }
    setInstalling(false)
  }

  return (
    <div className='w-full'>
      <button
        type='button'
        onClick={install}
        disabled={installing}
        className='flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60'>
        {installing ? (
          <Loader2 className='size-5 animate-spin' aria-hidden='true' />
        ) : (
          <Database className='size-5' aria-hidden='true' />
        )}
        {installing ? t('setupInstalling') : t('setupInstallButton')}
      </button>
      {error && (
        <p
          role='alert'
          className='mt-2 rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-600'>
          {error}
        </p>
      )}
    </div>
  )
}
