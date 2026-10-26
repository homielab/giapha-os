'use client'

import { useId } from 'react'

import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'

const fieldClasses =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none sm:py-2.5'

interface AdminCreateUserModalProps {
  isCreating: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function AdminCreateUserModal({
  isCreating,
  onClose,
  onSubmit
}: AdminCreateUserModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const dialogRef = useModalA11y(onClose)
  return (
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      tabIndex={-1}
      className='fixed inset-0 z-60 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm transition-opacity duration-300 outline-none'>
      <div className='w-full max-w-md transform overflow-hidden rounded-2xl border border-stone-200/60 bg-white/95 backdrop-blur-xl transition-colors'>
        <div className='flex items-center justify-between border-b border-stone-100/80 bg-stone-50/50 px-6 py-5'>
          <h3
            id={titleId}
            className='font-serif text-xl font-semibold text-stone-800'>
            {t('adminCreateTitle')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className='flex size-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600'>
            <svg
              className='size-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className='p-6'>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='admin-create-email'
                className='mb-1 block text-sm font-medium text-stone-700'>
                {t('adminEmail')} <span className='text-red-500'>*</span>
              </label>
              <input
                id='admin-create-email'
                type='email'
                name='email'
                required
                className={fieldClasses}
                placeholder='email@example.com'
              />
            </div>

            <div>
              <label
                htmlFor='admin-create-password'
                className='mb-1 block text-sm font-medium text-stone-700'>
                {t('password')} <span className='text-red-500'>*</span>
              </label>
              <input
                id='admin-create-password'
                type='password'
                name='password'
                required
                minLength={8}
                className={fieldClasses}
                placeholder={t('adminPasswordMinLength')}
              />
            </div>

            <div>
              <label
                htmlFor='admin-create-role'
                className='mb-1 block text-sm font-medium text-stone-700'>
                {t('adminRole')}
              </label>
              <select
                id='admin-create-role'
                name='role'
                className={fieldClasses}
                defaultValue='member'>
                <option value='member'>{t('adminMemberRole')}</option>
                <option value='editor'>{t('adminEditorRole')}</option>
                <option value='admin'>{t('adminAdminRole')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor='admin-create-status'
                className='mb-1 block text-sm font-medium text-stone-700'>
                {t('adminStatus')}
              </label>
              <select
                id='admin-create-status'
                name='is_active'
                className={fieldClasses}
                defaultValue='true'>
                <option value='true'>{t('adminApproved')}</option>
                <option value='false'>{t('adminPending')}</option>
              </select>
            </div>
          </div>

          <div className='mt-8 flex justify-end gap-3 pt-2'>
            <button type='button' onClick={onClose} className='btn'>
              {t('adminCancel')}
            </button>
            <button type='submit' disabled={isCreating} className='btn-primary'>
              {isCreating ? t('adminCreating') : t('adminCreateUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
