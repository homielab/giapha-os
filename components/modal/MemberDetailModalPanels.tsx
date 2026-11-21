'use client'

import { m } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

import MemberForm from '@/components/MemberForm'
import { MemberDetailSkeleton } from '@/context/memberDetail/MemberDetailSkeleton'
import MemberDetailContent from '@/context/MemberDetailContent'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

export function LoadingPanel() {
  const { t } = useI18n()
  // Same layout as the member view, so the content does not jump when the
  // member arrives.
  return <MemberDetailSkeleton label={t('loadingMember')} />
}

export function ErrorPanel({
  error,
  onClose
}: {
  error: string
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <m.div
      key='error'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className='flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center'>
      <div className='mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-inner'>
        <AlertCircle className='size-8' />
      </div>
      <p role='alert' className='text-sm font-medium text-red-600'>
        {error}
      </p>
      <button onClick={onClose} className='btn mt-2 rounded-full'>
        {t('close')}
      </button>
    </m.div>
  )
}

export function EditPanel({
  formInitialData,
  isAdmin,
  privateLoaded = true,
  onSuccess,
  onCancel
}: {
  formInitialData: Person
  isAdmin: boolean
  privateLoaded?: boolean
  onSuccess: (personId: string) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  return (
    <m.div
      key='editing'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className='custom-scrollbar flex-1 overflow-y-auto px-4 pt-16 pb-8 sm:px-8'>
      <h2 className='mb-6 font-serif text-xl font-semibold text-stone-800'>
        {t('editMember')}
      </h2>
      <MemberForm
        initialData={formInitialData}
        isEditing={true}
        isAdmin={isAdmin}
        privateLoaded={privateLoaded}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </m.div>
  )
}

export function CreatePanel({
  isAdmin,
  onSuccess,
  onCancel
}: {
  isAdmin: boolean
  onSuccess: (personId: string) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  return (
    <m.div
      key='creating'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className='custom-scrollbar flex-1 overflow-y-auto px-4 pt-16 pb-8 sm:px-8'>
      <h2 className='mb-6 font-serif text-xl font-semibold text-stone-800'>
        {t('newMember')}
      </h2>
      <MemberForm isAdmin={isAdmin} onSuccess={onSuccess} onCancel={onCancel} />
    </m.div>
  )
}

export function DetailPanel({
  person,
  privateData,
  isAdmin,
  canEdit
}: {
  person: Person
  privateData: Record<string, unknown> | null
  isAdmin: boolean
  canEdit: boolean
}) {
  return (
    <m.div
      key='details'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className='custom-scrollbar flex-1 overflow-y-auto'>
      <MemberDetailContent
        person={person}
        privateData={privateData}
        isAdmin={isAdmin}
        canEdit={canEdit}
      />
    </m.div>
  )
}
