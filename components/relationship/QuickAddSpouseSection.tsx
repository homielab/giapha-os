'use client'

import { useState } from 'react'

import QuickAddSpouseForm from '@/components/relationship/QuickAddSpouseForm'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { TextTooLongError } from '@/utils/limits'
import { createSpouseWithMarriage } from '@/utils/relationshipMutations'
import { createClient } from '@/utils/supabase/client'
import { PersonNotCreatedError } from '@/utils/writeErrors'

interface QuickAddSpouseSectionProps {
  person: Person
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function QuickAddSpouseSection({
  person,
  open,
  onClose,
  onSaved
}: QuickAddSpouseSectionProps) {
  const { t } = useI18n()
  const supabase = createClient()

  const [newSpouseName, setNewSpouseName] = useState('')
  const [newSpouseBirthYear, setNewSpouseBirthYear] = useState('')
  const [newSpouseNote, setNewSpouseNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleSave = async () => {
    if (!newSpouseName.trim()) {
      showError(t('spouseNameRequired'))
      return
    }

    setProcessing(true)
    setError(null)
    try {
      await createSpouseWithMarriage(supabase, {
        person,
        name: newSpouseName,
        birthYear: newSpouseBirthYear,
        note: newSpouseNote
      })

      onClose()
      onSaved()
    } catch (err: unknown) {
      if (err instanceof TextTooLongError) {
        showError(t('textTooLong', { field: t(err.label), max: err.max }))
      } else if (err instanceof PersonNotCreatedError) {
        showError(t('personNotCreated'))
      } else {
        const e = err as Error
        showError(t('spouseAddError', { error: e.message }))
      }
    } finally {
      setProcessing(false)
    }
  }

  if (!open) return null

  return (
    <QuickAddSpouseForm
      personGender={person.gender}
      newSpouseName={newSpouseName}
      onNameChange={setNewSpouseName}
      newSpouseBirthYear={newSpouseBirthYear}
      onBirthYearChange={setNewSpouseBirthYear}
      newSpouseNote={newSpouseNote}
      onNoteChange={setNewSpouseNote}
      processing={processing}
      error={error}
      onSave={handleSave}
      onCancel={() => {
        onClose()
        setNewSpouseName('')
        setNewSpouseBirthYear('')
        setNewSpouseNote('')
      }}
    />
  )
}
