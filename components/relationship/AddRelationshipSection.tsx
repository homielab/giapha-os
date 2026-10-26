'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AddRelationshipForm from '@/components/relationship/AddRelationshipForm'
import RelationshipErrorBanner from '@/components/relationship/RelationshipErrorBanner'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, RelationshipType } from '@/types'
import { addRelationshipWithTargetSync } from '@/utils/relationshipMutations'
import {
  relationshipErrorKey,
  RelationshipValidationError
} from '@/utils/relationshipValidation'
import { createClient } from '@/utils/supabase/client'

interface AddRelationshipSectionProps {
  person: Person
  open: boolean
  onClose: () => void
  onSaved: () => void
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
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [recentMembers, setRecentMembers] = useState<Person[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  // Search for people to add
  useEffect(() => {
    if (!open) return
    const searchPeople = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([])
        return
      }

      const { data } = await supabase
        .from('persons')
        .select('*')
        .ilike('full_name', `%${searchTerm}%`)
        .neq('id', personId) // Exclude self
        .limit(5)

      if (data) setSearchResults(data)
    }

    const timeoutId = setTimeout(searchPeople, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, personId, supabase, open])

  // Fetch recent members when opening the form
  useEffect(() => {
    if (!open || recentMembers.length > 0) return
    let cancelled = false
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('persons')
        .select('*')
        .neq('id', personId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data && !cancelled) setRecentMembers(data)
    }
    fetchRecent()
    return () => {
      cancelled = true
    }
  }, [open, personId, supabase, recentMembers.length])

  const handleTargetSelect = (p: Person) => {
    setSelectedTargetId(p.id)
    setSearchTerm(p.full_name)
    setSearchResults([])
  }

  const handleSave = async () => {
    if (!selectedTargetId) return
    setProcessing(true)
    setError(null)

    try {
      await addRelationshipWithTargetSync(supabase, {
        personId,
        selectedTargetId,
        direction: newRelDirection,
        relType: newRelType,
        note: newRelNote,
        person
      })

      onClose()
      onSaved()
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
