'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import AddRelationshipForm, {
  PickerPerson
} from '@/components/relationship/AddRelationshipForm'
import RelationshipErrorBanner from '@/components/relationship/RelationshipErrorBanner'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, RelationshipType } from '@/types'
import { PERSON_PICKER_COLUMNS } from '@/utils/personColumns'
import { addRelationshipWithTargetSync } from '@/utils/relationshipMutations'
import {
  relationshipErrorKey,
  RelationshipValidationError
} from '@/utils/relationshipValidation'
import { searchPersons } from '@/utils/search'
import { createClient } from '@/utils/supabase/client'
import { fetchAllRows } from '@/utils/supabase/fetchAll'

interface AddRelationshipSectionProps {
  person: Person
  open: boolean
  onClose: () => void
  /** Called after saving; `warning` is set when only part of it succeeded. */
  onSaved: (warning?: string) => void
}

export default function AddRelationshipSection({
  person,
  open,
  onClose,
  onSaved
}: AddRelationshipSectionProps) {
  const { t } = useI18n()
  const supabase = createClient()
  const router = useRouter()
  const personId = person.id

  const [newRelType, setNewRelType] =
    useState<RelationshipType>('biological_child')
  const [newRelDirection, setNewRelDirection] = useState<
    'parent' | 'child' | 'spouse'
  >('parent')
  const [newRelNote, setNewRelNote] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [allPersons, setAllPersons] = useState<PickerPerson[]>([])
  const [recentMembers, setRecentMembers] = useState<PickerPerson[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  // The name list loads once per opening; typing filters it locally so
  // "nguyen van duc" finds "Nguyễn Văn Đức" (the database has no unaccent).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoadError(null)
      const [all, recent] = await Promise.all([
        fetchAllRows<PickerPerson>((from, to) =>
          supabase
            .from('persons')
            .select(PERSON_PICKER_COLUMNS)
            .neq('id', personId) // Exclude self
            .order('full_name')
            .order('id')
            .range(from, to)
        ),
        supabase
          .from('persons')
          .select(PERSON_PICKER_COLUMNS)
          .neq('id', personId)
          .order('created_at', { ascending: false })
          .limit(10)
      ])
      if (cancelled) return
      const failure = all.error ?? recent.error
      if (failure) {
        setLoadError(failure.message)
        return
      }
      setAllPersons(all.data)
      setRecentMembers((recent.data ?? []) as PickerPerson[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, personId, supabase, reloadKey])

  const searchResults = useMemo(
    () => (searchTerm.length < 2 ? [] : searchPersons(allPersons, searchTerm)),
    [allPersons, searchTerm]
  )

  const handleTargetSelect = (p: PickerPerson) => {
    setSelectedTargetId(p.id)
    setSearchTerm(p.full_name)
  }

  const handleSave = async () => {
    if (!selectedTargetId) return
    setProcessing(true)
    setError(null)

    try {
      const { targetUpdateError } = await addRelationshipWithTargetSync(
        supabase,
        {
          personId,
          selectedTargetId,
          direction: newRelDirection,
          relType: newRelType,
          note: newRelNote,
          person
        }
      )

      onClose()
      onSaved(
        targetUpdateError
          ? t('relationshipSavedTargetNotUpdated', {
              error: targetUpdateError
            })
          : undefined
      )
    } catch (err: unknown) {
      if (err instanceof RelationshipValidationError) {
        showError(t(relationshipErrorKey(err.code)))
        return
      }
      const e = err as Error
      showError(t('relationshipAddError', { error: e.message }))
    } finally {
      setProcessing(false)
    }
  }

  if (!open) return null

  return (
    <>
      {loadError && (
        <RelationshipErrorBanner
          error={t('relationshipSearchLoadError', { error: loadError })}
          onDismiss={() => setReloadKey((k) => k + 1)}
        />
      )}
      {error && (
        <RelationshipErrorBanner
          error={error}
          onDismiss={() => setError(null)}
        />
      )}
      <AddRelationshipForm
        newRelNote={newRelNote}
        onNoteChange={setNewRelNote}
        newRelDirection={newRelDirection}
        onDirectionChange={setNewRelDirection}
        newRelType={newRelType}
        onTypeChange={setNewRelType}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        searchResults={searchResults}
        recentMembers={recentMembers}
        selectedTargetId={selectedTargetId}
        onTargetSelect={handleTargetSelect}
        processing={processing}
        onSave={handleSave}
        onCancel={() => {
          onClose()
          setSelectedTargetId(null)
          setSearchTerm('')
          setNewRelNote('')
        }}
      />
    </>
  )
}
