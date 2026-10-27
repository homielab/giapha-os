'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'

import {
  SelectorDropdown,
  SelectorTrigger
} from '@/components/PersonSelectorParts'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { filterRootPersons } from '@/utils/pickerNavigation'

export default function PersonSelector({
  persons,
  selectedId,
  onSelect,
  placeholder,
  label,
  className = 'w-full sm:w-72',
  showAllOption = false,
  allOptionLabel
}: {
  persons: Person[]
  selectedId?: string | null
  onSelect: (id: string | null) => void
  placeholder?: string
  label?: string
  className?: string
  showAllOption?: boolean
  allOptionLabel?: string
}) {
  const { t } = useI18n()
  const resolvedPlaceholder = placeholder ?? t('choosePerson')
  const resolvedLabel = label ?? t('displayRoot')
  const resolvedAllOptionLabel = allOptionLabel ?? t('allData')
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const currentPerson = persons.find((p) => p.id === selectedId)

  const filteredPersons = filterRootPersons(persons, searchTerm)

  const handleSelect = (personId: string | null) => {
    onSelect(personId)
    setIsOpen(false)
    setSearchTerm('')
    buttonRef.current?.focus()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <SelectorTrigger
        currentPerson={currentPerson}
        selectedId={selectedId}
        showAllOption={showAllOption}
        resolvedLabel={resolvedLabel}
        resolvedAllOptionLabel={resolvedAllOptionLabel}
        resolvedPlaceholder={resolvedPlaceholder}
        label={label}
        isOpen={isOpen}
        listId={listId}
        buttonRef={buttonRef}
        onToggle={() => setIsOpen(!isOpen)}
      />

      <AnimatePresence>
        {isOpen && (
          <SelectorDropdown
            showAllOption={showAllOption}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            resolvedAllOptionLabel={resolvedAllOptionLabel}
            selectedId={selectedId}
            onSelect={handleSelect}
            onClose={() => {
              setIsOpen(false)
              setSearchTerm('')
              buttonRef.current?.focus()
            }}
            listId={listId}
            filteredPersons={filteredPersons}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
