'use client'

import { AnimatePresence, m } from 'framer-motion'
import { ArrowLeft, Edit2, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useState
} from 'react'

import {
  CreatePanel,
  DetailPanel,
  EditPanel,
  ErrorPanel,
  LoadingPanel
} from '@/components/modal/MemberDetailModalPanels'
import { useUser } from '@/components/UserProvider'
import ViewOnTreeLink from '@/components/ViewOnTreeLink'
import { useMemberListView } from '@/context/useMemberListView'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { createLatestGuard } from '@/utils/latestOnly'
import { shouldCloseMemberModalOnEscape } from '@/utils/memberModalEscape'
import { fetchPrivateDetails } from '@/utils/privateDetails'

export function ModalHeaderActions({
  isEditing,
  canEdit,
  person,
  onBack,
  onStartEdit,
  onClose
}: {
  isEditing: boolean
  canEdit: boolean
  person: Person | null
  onBack: () => void
  onStartEdit: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div className='absolute top-4 right-4 z-20 flex items-center gap-2 sm:top-5 sm:right-5'>
      {isEditing ? (
        /* In edit mode — show back button */
        <button
          onClick={onBack}
          className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-stone-200/50 bg-stone-100/80 px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors duration-300 hover:-translate-y-1 hover:bg-stone-200'>
          <ArrowLeft className='size-4' />
          <span className='hidden sm:inline'>{t('backToPrevious')}</span>
        </button>
      ) : (
        person && (
          <>
            {/* Every role; the new URL has no memberModalId, so the modal closes */}
            <ViewOnTreeLink
              personId={person.id}
              className='btn-amber text-sm'
              compact
            />
            {canEdit && (
              <>
                <Link
                  href={`/dashboard/members/${person.id}`}
                  className='btn-amber text-sm'>
                  <ExternalLink className='size-4' />
                  <span className='hidden sm:inline'>{t('view')}</span>
                </Link>
                <button onClick={onStartEdit} className='btn-amber text-sm'>
                  <Edit2 className='size-4' />
                  <span className='hidden sm:inline'>{t('editMember')}</span>
                </button>
              </>
            )}
          </>
        )
      )}
      <button
        onClick={onClose}
        className='flex size-10 items-center justify-center rounded-full border border-stone-200/50 bg-stone-100/80 text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900'
        aria-label={t('close')}>
        <X className='size-5' />
      </button>
    </div>
  )
}

function ModalBody({
  loading,
  error,
  isEditing,
  showCreateMember,
  person,
  privateData,
  privateLoaded,
  formInitialData,
  isAdmin,
  canEdit,
  onClose,
  onEditSuccess,
  onCreateSuccess,
  onEditCancel
}: {
  loading: boolean
  error: string | null
  isEditing: boolean
  showCreateMember: boolean
  person: Person | null
  privateData: Record<string, unknown> | null
  privateLoaded: boolean
  formInitialData: Person | undefined
  isAdmin: boolean
  canEdit: boolean
  onClose: () => void
  onEditSuccess: (personId: string) => void
  onCreateSuccess: (personId: string) => void
  onEditCancel: () => void
}) {
  // Each mode is a plain branch; early returns keep the decision flat.
  let panel: ReactNode = null
  if (loading) {
    panel = <LoadingPanel />
  } else if (error) {
    panel = <ErrorPanel error={error} onClose={onClose} />
  } else if (isEditing && formInitialData) {
    panel = (
      <EditPanel
        formInitialData={formInitialData}
        isAdmin={isAdmin}
        privateLoaded={privateLoaded}
        onSuccess={onEditSuccess}
        onCancel={onEditCancel}
      />
    )
  } else if (showCreateMember) {
    panel = (
      <CreatePanel
        isAdmin={isAdmin}
        onSuccess={onCreateSuccess}
        onCancel={onClose}
      />
    )
  } else if (person) {
    panel = (
      <DetailPanel
        person={person}
        privateData={privateData}
        isAdmin={isAdmin}
        canEdit={canEdit}
      />
    )
  }

  return <AnimatePresence mode='wait'>{panel}</AnimatePresence>
}

export default function MemberDetailModal() {
  const { t } = useI18n()
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember
  } = useMemberListView()
  const { isAdmin, isEditor: canEdit, supabase } = useUser()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [person, setPerson] = useState<Person | null>(null)
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null)
  // False when an admin's read of the private details failed: the edit form
  // locks those fields and never deletes the stored row.
  const [privateLoaded, setPrivateLoaded] = useState(true)
  const isOpen = Boolean(memberId || showCreateMember)
  // Only the latest member fetch may update the modal: opening A then B
  // quickly must not let a slow response for A replace B.
  const [fetchGuard] = useState(createLatestGuard)
  // The loaded person, only while it is the member the modal is open for, so
  // View/Edit never act on the previous member while the next one loads
  // (kept while closing so the exit animation still shows it).
  const shownPerson = !memberId || person?.id === memberId ? person : null

  const closeModal = useCallback(() => {
    setMemberModalId(null)
    setShowCreateMember(false)
    setIsEditing(false)
  }, [setMemberModalId, setShowCreateMember])

  // Escape closes the detail view, not a form being edited (see the helper)
  const dialogRef = useModalA11y<HTMLDivElement>(() => {
    if (shouldCloseMemberModalOnEscape({ isEditing, showCreateMember })) {
      closeModal()
    }
  }, isOpen)
  let dialogLabel = t('memberDetails')
  if (showCreateMember) dialogLabel = t('addMember')
  else if (isEditing) dialogLabel = t('editMember')
  else if (shownPerson) dialogLabel = shownPerson.full_name

  const fetchData = useCallback(
    async (id: string) => {
      const token = fetchGuard.begin()
      setLoading(true)
      setError(null)
      try {
        // Public and (admin-only) private data are fetched in parallel
        const [personRes, privateRes] = await Promise.all([
          supabase.from('persons').select('*').eq('id', id).single(),
          isAdmin
            ? fetchPrivateDetails(supabase, id).then(
                (data) => ({ data, failed: false }),
                (err: unknown) => {
                  console.error('Error fetching private details:', err)
                  return { data: null, failed: true }
                }
              )
            : Promise.resolve(null)
        ])

        if (!fetchGuard.isCurrent(token)) return
        if (personRes.error || !personRes.data) {
          throw new Error(t('memberLoadError'))
        }
        setPerson(personRes.data)
        setPrivateData(isAdmin ? (privateRes?.data ?? {}) : null)
        setPrivateLoaded(!privateRes?.failed)
      } catch (err) {
        if (!fetchGuard.isCurrent(token)) return
        console.error('Error fetching member details:', err)
        setError(
          err instanceof Error && err.message ? err.message : t('systemError')
        )
      } finally {
        if (fetchGuard.isCurrent(token)) setLoading(false)
      }
    },
    [fetchGuard, isAdmin, supabase, t]
  )

  // Sync state with URL parameter or create mode
  const syncModalState = useEffectEvent((memberId: string | null) => {
    let timeoutId: NodeJS.Timeout | null = null
    // The member changed or the modal closed: drop any fetch still running
    fetchGuard.invalidate()

    if (memberId) {
      timeoutId = setTimeout(() => {
        setIsEditing(false) // always start on detail view when opening
        fetchData(memberId)
      }, 0)
    } else if (showCreateMember) {
      timeoutId = setTimeout(() => {
        setIsEditing(false)
        setPerson(null)
        setPrivateData(null)
        setError(null)
      }, 0)
    } else {
      timeoutId = setTimeout(() => {
        setPerson(null)
        setPrivateData(null)
        setError(null)
        setIsEditing(false)
      }, 300)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  })

  useEffect(() => {
    return syncModalState(memberId)
  }, [memberId, showCreateMember])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Called by MemberForm after a successful save
  const handleEditSuccess = (savedPersonId: string) => {
    // Clear stale data first so the loading state is shown while refetching
    setIsEditing(false)
    setPerson(null)
    setPrivateData(null)
    fetchData(savedPersonId)
    // Revalidate Next.js server component cache so the dashboard list/members updates
    router.refresh()
  }

  // Called by MemberForm after a successful CREATE
  const handleCreateSuccess = (savedPersonId: string) => {
    setShowCreateMember(false)
    // Open the detail modal for the new member
    setMemberModalId(savedPersonId)
    // Delay refresh so React commits state changes first,
    // ensuring the server component re-fetches the updated member list.
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  // initialData for MemberForm — merge public + private
  const formInitialData = shownPerson
    ? { ...shownPerson, ...(privateData ?? {}) }
    : undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-label={dialogLabel}
          tabIndex={-1}
          className='fixed inset-0 z-100 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm sm:p-6'>
          {/* Click-away backdrop (disabled while editing/creating to avoid accidental close) */}
          {!isEditing && !showCreateMember && (
            <button
              type='button'
              aria-label={t('close')}
              className='absolute inset-0 cursor-pointer'
              onClick={closeModal}
            />
          )}

          {/* Modal Content */}
          <m.div
            layout
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            layoutDependency={false}
            className='relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:border sm:border-stone-200'>
            <ModalHeaderActions
              isEditing={isEditing}
              canEdit={canEdit}
              person={shownPerson}
              onBack={() => setIsEditing(false)}
              onStartEdit={() => setIsEditing(true)}
              onClose={closeModal}
            />

            <ModalBody
              loading={loading}
              error={error}
              isEditing={isEditing}
              showCreateMember={showCreateMember}
              person={shownPerson}
              privateData={privateData}
              privateLoaded={privateLoaded}
              formInitialData={formInitialData}
              isAdmin={isAdmin}
              canEdit={canEdit}
              onClose={closeModal}
              onEditSuccess={handleEditSuccess}
              onCreateSuccess={handleCreateSuccess}
              onEditCancel={() => setIsEditing(false)}
            />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
