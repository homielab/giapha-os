'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useContext, useEffect, useState } from 'react'

import {
  AvatarUrlProvider,
  useInAvatarUrlProvider
} from '@/context/AvatarUrlContext'
import { MemberListContext } from '@/context/memberListViewContext'
import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { NO_SIGNED_AVATAR_URLS } from '@/utils/avatar'
import { createLatestGuard } from '@/utils/latestOnly'
import {
  fetchRelationshipData,
  signRelationshipAvatars
} from '@/utils/relationshipFetch'
import { deleteRelationship } from '@/utils/relationshipMutations'
import { createClient } from '@/utils/supabase/client'
import { RelationshipNotDeletedError } from '@/utils/writeErrors'

import AddRelationshipSection from './relationship/AddRelationshipSection'
import BulkAddChildrenSection from './relationship/BulkAddChildrenSection'
import QuickAddSpouseSection from './relationship/QuickAddSpouseSection'
import RelationshipAddButtons from './relationship/RelationshipAddButtons'
import RelationshipErrorBanner from './relationship/RelationshipErrorBanner'
import RelationshipList from './relationship/RelationshipList'
import {
  EnrichedRelationship,
  RelationshipStats
} from './relationship/relationshipTypes'

interface RelationshipManagerProps {
  person: Person
  isAdmin: boolean
  canEdit?: boolean
  onStatsLoaded?: (stats: RelationshipStats) => void
}

export default function RelationshipManager({
  person,
  isAdmin,
  canEdit = false,
  onStatsLoaded
}: RelationshipManagerProps) {
  const { t } = useI18n()
  const supabase = createClient()
  const memberListContext = useContext(MemberListContext)
  const { setMemberModalId } = useMemberListView()
  const router = useRouter()
  // A page that already signed every avatar (members list, kinship) shares
  // its URLs; alone (member page) the relatives' avatars are signed here.
  const inAvatarProvider = useInAvatarUrlProvider()

  const personId = person.id

  // If inside DashboardProvider → open modal; otherwise → navigate to full page
  const handlePersonClick = (id: string) => {
    if (memberListContext !== undefined) {
      setMemberModalId(id)
    } else {
      router.push(`/dashboard/members/${id}`)
    }
  }

  const [relationships, setRelationships] = useState<EnrichedRelationship[]>([])
  const [signedAvatarUrls, setSignedAvatarUrls] = useState(
    NO_SIGNED_AVATAR_URLS
  )
  const [loading, setLoading] = useState(true)
  // Set when loading failed: show it with a retry instead of an empty list
  const [loadError, setLoadError] = useState<string | null>(null)
  // "Saved, but…" warning from the add forms
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  // Which admin form is open (mutually exclusive)
  const [isAdding, setIsAdding] = useState(false)
  const [isAddingBulk, setIsAddingBulk] = useState(false)
  const [isAddingSpouse, setIsAddingSpouse] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Only the latest fetch may update the list: when the person changes, a
  // slow response for the previous one is dropped.
  const [fetchGuard] = useState(createLatestGuard)

  // Fetch relationships
  const fetchRelationships = useCallback(async () => {
    const token = fetchGuard.begin()
    try {
      const { relationships, stats } = await fetchRelationshipData(
        supabase,
        personId,
        t
      )
      // Signed before the list shows, so no photo starts on `/api/avatar`.
      const signed = inAvatarProvider
        ? NO_SIGNED_AVATAR_URLS
        : await signRelationshipAvatars(supabase, relationships)
      if (!fetchGuard.isCurrent(token)) return
      setRelationships(relationships)
      setSignedAvatarUrls(signed)
      setLoadError(null)
      onStatsLoaded?.(stats)
    } catch (err) {
      if (!fetchGuard.isCurrent(token)) return
      console.error('Error fetching relationships:', err)
      const message = (err as Error)?.message || String(err)
      setLoadError(t('relationshipsLoadError', { error: message }))
    } finally {
      if (fetchGuard.isCurrent(token)) setLoading(false)
    }
  }, [fetchGuard, inAvatarProvider, personId, supabase, onStatsLoaded, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchRelationships, 0)
    return () => {
      window.clearTimeout(timeoutId)
      // Person changed or unmounted: ignore the fetch still running
      fetchGuard.invalidate()
    }
  }, [fetchGuard, fetchRelationships])

  const handleSaved = (warning?: string) => {
    setSaveWarning(warning ?? null)
    fetchRelationships()
    router.refresh()
  }

  const handleDelete = async (relId: string) => {
    if (!confirm(t('confirmDeleteRelationship'))) return
    try {
      await deleteRelationship(supabase, relId)
      fetchRelationships()
      router.refresh()
    } catch (err: unknown) {
      const e = err as Error
      setDeleteError(
        err instanceof RelationshipNotDeletedError
          ? t('relationshipNotDeleted')
          : t('deleteRelationshipError', { error: e.message })
      )
      setTimeout(() => setDeleteError(null), 5000)
    }
  }

  const handleRetry = () => {
    setLoading(true)
    fetchRelationships()
  }

  if (loading)
    return (
      <div className='text-sm text-stone-500'>{t('loadingFamilyInfo')}</div>
    )

  if (loadError)
    return (
      <div
        role='alert'
        className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600'>
        <span>{loadError}</span>
        <button type='button' onClick={handleRetry} className='btn'>
          {t('tryAgain')}
        </button>
      </div>
    )

  const relationshipList = (
    <RelationshipList
      relationships={relationships}
      isAdmin={isAdmin}
      canEdit={canEdit}
      onPersonClick={handlePersonClick}
      onDelete={handleDelete}
    />
  )

  return (
    <div className='space-y-6'>
      {inAvatarProvider ? (
        relationshipList
      ) : (
        <AvatarUrlProvider signedUrls={signedAvatarUrls}>
          {relationshipList}
        </AvatarUrlProvider>
      )}

      {/* Add Buttons (Admin) */}
      {canEdit && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <RelationshipAddButtons
          onAddRelation={() => setIsAdding(true)}
          onAddBulk={() => setIsAddingBulk(true)}
          onAddSpouse={() => setIsAddingSpouse(true)}
        />
      )}

      {canEdit &&
        saveWarning &&
        !isAdding &&
        !isAddingBulk &&
        !isAddingSpouse && (
          <RelationshipErrorBanner
            tone='warning'
            error={saveWarning}
            onDismiss={() => setSaveWarning(null)}
          />
        )}

      {canEdit &&
        deleteError &&
        !isAdding &&
        !isAddingBulk &&
        !isAddingSpouse && (
          <RelationshipErrorBanner
            error={deleteError}
            onDismiss={() => setDeleteError(null)}
          />
        )}

      {/* Add Form (Admin) */}
      {canEdit && (
        <AddRelationshipSection
          person={person}
          open={isAdding}
          onClose={() => setIsAdding(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Bulk Add Children Form (Admin) */}
      {canEdit && (
        <BulkAddChildrenSection
          person={person}
          spouseOptions={relationships.filter((r) => r.direction === 'spouse')}
          open={isAddingBulk}
          onClose={() => setIsAddingBulk(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Quick Add Spouse Form (Admin) */}
      {canEdit && (
        <QuickAddSpouseSection
          person={person}
          open={isAddingSpouse}
          onClose={() => setIsAddingSpouse(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
