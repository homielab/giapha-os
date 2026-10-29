'use client'

import { AlertCircle, X } from 'lucide-react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useState } from 'react'

import { deleteMemberProfile } from '@/app/actions/member'
import { useI18n } from '@/lib/i18n/useI18n'
import { noticeAria } from '@/utils/a11y'
import { memberSearchCache } from '@/utils/memberSearchCache'

interface DeleteMemberButtonProps {
  memberId: string
  className?: string
}

export default function DeleteMemberButton({
  memberId,
  className = ''
}: DeleteMemberButtonProps) {
  const { t } = useI18n()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!window.confirm(t('deleteProfileConfirm'))) {
      return
    }

    setIsDeleting(true)
    setError(null)
    try {
      const result = await deleteMemberProfile(memberId)
      if (result?.error) {
        setError(result.error)
        return
      }
      // Note: the server action will redirect on success
    } catch (err) {
      if (isRedirectError(err)) {
        memberSearchCache.clear()
        throw err
      }
      console.error('Delete failed:', err)
      setError(err instanceof Error ? err.message : t('deleteProfileError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className='inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-100 px-4 py-4 text-sm font-medium text-red-800 transition duration-300 hover:-translate-y-1 hover:bg-red-200 hover:shadow-soft-hover disabled:cursor-not-allowed disabled:opacity-50'>
        {isDeleting ? t('deletingProfile') : t('deleteProfile')}
      </button>

      {error && (
        <div
          {...noticeAria('error')}
          className='animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 w-72 rounded-lg border border-red-200 bg-red-50 p-3 duration-200'>
          <div className='flex items-start gap-2 text-sm text-red-800'>
            <AlertCircle className='mt-0.5 h-5 w-5 shrink-0 text-red-500' />
            <div className='flex-1 pr-4'>{error}</div>
            <button
              onClick={() => setError(null)}
              aria-label={t('clearError')}
              className='absolute top-2 right-2 text-red-400 transition-colors hover:text-red-600'>
              <X className='h-4 w-4' />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
