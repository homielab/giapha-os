'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import {
  SelectorDropdown,
  SelectorTrigger
} from '@/components/PersonSelectorParts'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

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

  const currentPerson = persons.find((p) => p.id === selectedId)

  const filteredPersons = persons
    .filter((p) => {
      const searchStr = `${p.full_name} ${p.birth_year || ''}`.toLowerCase()
      return searchStr.includes(searchTerm.toLowerCase())
    })
    .slice(0, 20)

  const handleSelect = (personId: string | null) => {
    onSelect(personId)
    setIsOpen(false)
    setSearchTerm('')
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
            filteredPersons={filteredPersons}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
