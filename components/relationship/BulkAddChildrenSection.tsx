'use client'

import { useState } from 'react'

import BulkAddChildrenForm from '@/components/relationship/BulkAddChildrenForm'
import {
  BulkChildRow,
  emptyBulkChildRow,
  EnrichedRelationship
} from '@/components/relationship/relationshipTypes'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { TextTooLongError } from '@/utils/limits'
import { bulkCreateChildren } from '@/utils/relationshipMutations'
import {
  relationshipErrorKey,
  RelationshipValidationError
} from '@/utils/relationshipValidation'
import { createClient } from '@/utils/supabase/client'

interface BulkAddChildrenSectionProps {
  person: Person
  spouseOptions: EnrichedRelationship[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function BulkAddChildrenSection({
  person,
  spouseOptions,
  open,
  onClose,
  onSaved
}: BulkAddChildrenSectionProps) {
  const { t } = useI18n()
  const supabase = createClient()
  const personId = person.id

  const [selectedSpouseId, setSelectedSpouseId] = useState<string>('')
  const [bulkChildren, setBulkChildren] = useState<BulkChildRow[]>([
    emptyBulkChildRow()
  ])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleSave = async () => {
    // Filter out rows without a name
    const validChildren = bulkChildren.filter((c) => c.name.trim() !== '')
    if (validChildren.length === 0) {
      showError(t('childNameRequired'))
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { created, failures } = await bulkCreateChildren(supabase, {
        children: validChildren,
        parentId: personId,
        otherParentId: selectedSpouseId,
        parentGeneration: person.generation,
        parents: [
          person,
          ...spouseOptions
            .filter((s) => s.targetPerson.id === selectedSpouseId)
            .map((s) => s.targetPerson)
        ]
      })

      if (failures.length === 0) {
        onClose()
        onSaved()
        return
      }

      // Keep only the rows that can be retried: saved rows and rows whose
      // person exists without parents would be added twice.
      const retryRows = failures.filter((f) => !f.orphaned).map((f) => f.child)
      setBulkChildren(retryRows.length > 0 ? retryRows : [emptyBulkChildRow()])
      setError(
        [
          t('bulkAddPartial', {
            success: created,
            total: validChildren.length
          }),
          ...failures.map(
            (f) =>
              `${f.child.name.trim()}: ${
                f.orphaned ? t('bulkAddChildOrphaned') : f.error
              }`
          ),
          ...(retryRows.length > 0 ? [t('bulkAddFailedRowsKept')] : [])
        ].join('\n')
      )
      if (created > 0 || failures.some((f) => f.orphaned)) onSaved()
    } catch (err: unknown) {
      if (err instanceof TextTooLongError) {
        showError(t('textTooLong', { field: t(err.label), max: err.max }))
        return
      }
      if (err instanceof RelationshipValidationError) {
        const message = t(relationshipErrorKey(err.code))
        showError(err.subject ? `${err.subject}: ${message}` : message)
        return
      }
      const e = err as Error
      showError(t('bulkAddError', { error: e.message }))
    } finally {
      setProcessing(false)
    }
  }

  if (!open) return null

  return (
    <>
      {error && (
        <div
          role='alert'
          className='animate-in fade-in slide-in-from-top-1 mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600'>
          <svg
            className='mt-0.5 h-4 w-4 shrink-0'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='whitespace-pre-line'>{error}</span>
        </div>
      )}
      <BulkAddChildrenForm
        spouseOptions={spouseOptions}
        bulkChildren={bulkChildren}
        onBulkChildrenChange={setBulkChildren}
        selectedSpouseId={selectedSpouseId}
        onSpouseChange={setSelectedSpouseId}
        processing={processing}
        onSave={handleSave}
        onCancel={() => {
          onClose()
          setBulkChildren([emptyBulkChildRow()])
          setSelectedSpouseId('')
        }}
      />
    </>
  )
}
