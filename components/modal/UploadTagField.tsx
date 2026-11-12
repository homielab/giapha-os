'use client'

import { X } from 'lucide-react'
import { useId } from 'react'

import PersonSelector from '@/components/PersonSelector'
import { useI18n } from '@/lib/i18n/useI18n'
import type { Person } from '@/types'

interface UploadTagFieldProps {
  persons: Person[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

// Members shown in the photo: pick one at a time, each stays as a chip that
// can be removed.
export default function UploadTagField({
  persons,
  selectedIds,
  onChange
}: UploadTagFieldProps) {
  const { t } = useI18n()
  const labelId = useId()
  const byId = new Map(persons.map((person) => [person.id, person]))
  const selected = selectedIds.flatMap((id) => byId.get(id) ?? [])
  const available = persons.filter((person) => !selectedIds.includes(person.id))

  if (persons.length === 0) return null

  return (
    <div role='group' aria-labelledby={labelId}>
      <p
        id={labelId}
        className='mb-1.5 block text-sm font-medium text-stone-700'>
        {t('galleryTagMembers')}
      </p>
      {selected.length > 0 && (
        <ul className='mb-2 flex flex-wrap gap-2'>
          {selected.map((person) => (
            <li
              key={person.id}
              className='inline-flex items-center gap-1 rounded-full bg-amber-50 py-1 pr-1 pl-3 text-sm font-medium text-amber-900'>
              <span>{person.full_name}</span>
              <button
                type='button'
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== person.id))
                }
                aria-label={t('galleryTagRemove', { name: person.full_name })}
                className='flex size-6 items-center justify-center rounded-full text-amber-800 transition-colors hover:bg-amber-100'>
                <X className='size-3.5' aria-hidden='true' />
              </button>
            </li>
          ))}
        </ul>
      )}
      <PersonSelector
        persons={available}
        selectedId={null}
        onSelect={(id) => {
          if (id && !selectedIds.includes(id)) onChange([...selectedIds, id])
        }}
        placeholder={t('galleryTagAdd')}
        className='w-full'
      />
    </div>
  )
}
