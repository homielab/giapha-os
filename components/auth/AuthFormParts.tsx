'use client'

import { AnimatePresence, m } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import { ReactNode } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'

const inputClasses =
  'block w-full rounded-xl border border-stone-200/80 bg-white/50 py-3.5 pr-4 pl-11 text-stone-900 placeholder-stone-400 transition duration-200 outline-none focus:border-amber-400 focus:bg-white focus:ring-amber-400'

export function AuthField({
  id,
  label,
  icon,
  type,
  autoComplete,
  required,
  placeholder,
  value,
  onChange
}: {
  id: string
  label: string
  icon?: ReactNode
  type: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='relative'>
      <label
        htmlFor={id}
        className='mb-1.5 ml-1 block text-sm font-medium text-stone-600'>
        {label}
      </label>
      <div className='group relative flex items-center'>
        {icon && (
          <span className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500'>
            {icon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export function AuthAlerts({
  error,
  successMessage
}: {
  error: string | null
  successMessage: string | null
}) {
  return (
    <AnimatePresence>
      {error && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          role='alert'
          className='rounded-xl border border-red-100/50 bg-red-50 p-3 text-center text-sm font-medium text-red-700'>
          {error}
        </m.div>
      )}

      {successMessage && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          role='status'
          aria-live='polite'
          className='rounded-xl border border-teal-100/50 bg-teal-50 p-3 text-center text-sm font-medium text-teal-700'>
          {successMessage}
        </m.div>
      )}
    </AnimatePresence>
  )
}

export function SsoNotice({ show, text }: { show: boolean; text: string }) {
  const { t } = useI18n()
  if (!show) return null
  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className='rounded-xl border border-amber-200/70 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800'>
      <p>{text}</p>
      <a
        href={t('ssoGuideUrl')}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-2 inline-block font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-700'>
        {t('ssoGuide')}
      </a>
    </m.div>
  )
}

export function DemoNotice({ show }: { show: boolean }) {
  const { t } = useI18n()
  if (!show) return null
  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className='mt-4 rounded-xl border border-amber-200/60 bg-amber-50 p-3'>
      <p className='text-sm font-medium text-amber-800'>{t('demoNotice')}</p>
    </m.div>
  )
}

export function AuthSubmitButton({
  loading,
  isLogin
}: {
  loading: boolean
  isLogin: boolean
}) {
  const { t } = useI18n()
  return (
    <button
      type='submit'
      disabled={loading}
      className='group relative flex w-full items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-4 text-sm font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-stone-800 focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70'>
      {loading ? (
        <span className='flex items-center gap-2.5'>
          <svg
            className='-ml-1 h-4 w-4 animate-spin text-white'
            fill='none'
            viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
          </svg>
          {t('loading')}
        </span>
      ) : (
        <>
          {isLogin ? t('login') : t('createAccount')}
          {!isLogin && <UserPlus className='ml-1 size-4' />}
        </>
      )}
    </button>
  )
}

export function AuthModeToggle({
  isLogin,
  isDemo,
  onToggle
}: {
  isLogin: boolean
  isDemo: boolean
  onToggle: (notice: string | null) => void
}) {
  const { t } = useI18n()
  return (
    <button
      type='button'
      onClick={() => {
        if (isLogin && isDemo) {
          onToggle(t('demoLoginNotice'))
          return
        }
        onToggle(null)
      }}
      className='w-full rounded-xl border border-stone-200/80 bg-white py-3.5 text-sm font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-50 hover:text-stone-900 focus:outline-none'>
      {isLogin ? t('noAccount') : t('hasAccount')}
    </button>
  )
}

export function AuthBackgroundDecor() {
  return (
    <>
      {/* Decorative background grid and blurs */}
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]'></div>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)]'></div>

      <div className='pointer-events-none absolute inset-x-0 top-0 flex h-screen justify-center overflow-hidden'>
        <div className='absolute top-[-10%] right-[-5%] h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-amber-300/20 mix-blend-multiply blur-[100px]' />
        <div className='absolute bottom-[0%] left-[-10%] h-[60vw] max-h-[800px] w-[60vw] max-w-[800px] rounded-full bg-rose-200/20 mix-blend-multiply blur-[120px]' />
      </div>
    </>
  )
}
