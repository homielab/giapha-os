'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { memberSearchCache } from '@/utils/memberSearchCache'
import { createClient } from '@/utils/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setError(null)
    try {
      // signOut reports failure in `error` instead of throwing
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      // The next account on this browser must not see this tree's names.
      memberSearchCache.clear()
      router.push('/login')
      router.refresh() // Refresh to clear any cached Server Component data
    } catch (err) {
      console.error('Sign out failed:', err)
      setError(t('logoutFailed'))
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className='flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-rose-50 hover:text-rose-700'>
        <LogOut className='size-4' />
        {isLoggingOut ? t('processing') : t('logout')}
      </button>
      {error && (
        <p role='alert' className='px-4 pb-2 text-xs text-rose-600'>
          {error}
        </p>
      )}
    </>
  )
}
