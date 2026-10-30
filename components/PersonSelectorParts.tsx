'use client'

import { m } from 'framer-motion'
import { Check, ChevronDown, Database, Search } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'

import DefaultAvatar from '@/components/DefaultAvatar'
import { FemaleIcon, MaleIcon } from '@/components/GenderIcons'
import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { isImeComposing, pickerKeyNavigation } from '@/utils/pickerNavigation'
import { getAvatarBg } from '@/utils/styleHelpers'

const getGenderStyle = (gender: string) => {
  if (gender === 'male') return 'bg-sky-100 text-sky-600'
  if (gender === 'female') return 'bg-rose-100 text-rose-600'
  return 'bg-stone-100 text-stone-600'
}

export function PersonAvatarBadge({
  person,
  bgClassName,
  fallback
}: {
  person: Person
  bgClassName: string
  fallback: React.ReactNode
}) {
  const { t } = useI18n()
  const avatarUrl = useAvatarUrl()
  const url = avatarUrl(person.avatar_url)
  return (
    <div className='relative shrink-0'>
      <div
        className={`flex size-8 items-center justify-center overflow-hidden rounded-full text-sm font-medium shadow-xs ring-1 ring-white ${bgClassName}`}>
        {url ? (
          <Image
            unoptimized
            src={url}
            alt=''
            width={32}
            height={32}
            className='h-full w-full object-cover'
          />
        ) : person ? (
          fallback
        ) : null}
      </div>
      <div
        className={`absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full shadow-xs ring-1 ring-white ${getGenderStyle(person.gender)}`}>
        {person.gender === 'male' ? (
          <MaleIcon className='size-2.5' label={t('male')} />
        ) : person.gender === 'female' ? (
          <FemaleIcon className='size-2.5' label={t('female')} />
        ) : null}
      </div>
    </div>
  )
}

export function PersonOptionRow({
  person,
  isSelected,
  isActive = false,
  optionId,
  onHover,
  onSelect
}: {
  person: Person
  isSelected: boolean
  isActive?: boolean
  optionId?: string
  onHover?: () => void
  onSelect: (id: string) => void
}) {
  const { t } = useI18n()
  return (
    <button
      id={optionId}
      role='option'
      aria-selected={isSelected}
      tabIndex={-1}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(person.id)}
      className={`group/item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition duration-200 ${
        isSelected
          ? 'border border-amber-200/50 bg-amber-50 text-amber-900'
          : `border border-transparent text-stone-700 hover:bg-stone-100/80 ${isActive ? 'bg-stone-100/80' : ''}`
      }`}>
      <PersonAvatarBadge
        person={person}
        bgClassName={getAvatarBg(person.gender)}
        fallback={<DefaultAvatar gender={person.gender} size={32} />}
      />

      <div className='min-w-0 flex-1 text-left'>
        <p
          className={`truncate ${isSelected ? 'font-medium' : 'font-medium group-hover/item:text-stone-900'}`}>
          {person.full_name}{' '}
          {person.birth_year ? (
            <span className='font-normal text-stone-400'>
              ({person.birth_year})
            </span>
          ) : null}
        </p>
        {person.generation != null && (
          <p className='text-sm font-medium text-stone-400'>
            {t('generationLabel', { generation: person.generation })}
          </p>
        )}
      </div>

      {isSelected && <Check className='size-4 shrink-0 text-amber-600' />}
    </button>
  )
}

export function SelectorTrigger({
  currentPerson,
  selectedId,
  showAllOption,
  resolvedLabel,
  resolvedAllOptionLabel,
  resolvedPlaceholder,
  label,
  isOpen,
  listId,
  buttonRef,
  onToggle
}: {
  currentPerson: Person | undefined
  selectedId?: string | null
  showAllOption: boolean
  resolvedLabel: string
  resolvedAllOptionLabel: string
  resolvedPlaceholder: string
  label?: string
  isOpen: boolean
  listId: string
  buttonRef?: React.Ref<HTMLButtonElement>
  onToggle: () => void
}) {
  const isAllSelected = Boolean(showAllOption) && selectedId === null
  return (
    <button
      ref={buttonRef}
      type='button'
      aria-haspopup='listbox'
      aria-expanded={isOpen}
      aria-controls={isOpen ? listId : undefined}
      onClick={onToggle}
      className={`group flex w-full items-center gap-3 rounded-xl border bg-white/60 px-3 py-2 text-sm transition duration-300 focus:ring-2 focus:ring-amber-500/20 focus:outline-none ${isOpen ? 'border-amber-300 bg-white ring-2 ring-amber-500/10' : 'border-stone-200/60 hover:border-amber-300 hover:bg-white/90'}`}>
      {currentPerson ? (
        <PersonAvatarBadge
          person={currentPerson}
          bgClassName={`${getAvatarBg(currentPerson.gender)} text-white`}
          fallback={<DefaultAvatar gender={currentPerson.gender} size={32} />}
        />
      ) : (
        <div className='relative shrink-0'>
          <div
            className={`flex size-8 items-center justify-center overflow-hidden rounded-full text-sm font-medium shadow-xs ring-2 ring-white ${
              isAllSelected
                ? 'bg-stone-500 text-white'
                : 'bg-stone-100 text-stone-400'
            }`}>
            {isAllSelected ? <Database className='size-4' /> : '?'}
          </div>
        </div>
      )}

      <div className='min-w-0 flex-1 text-left'>
        {label && (
          <p className='mb-0.5 text-sm leading-none font-medium text-stone-400'>
            {resolvedLabel}
          </p>
        )}
        <p className='truncate leading-tight font-medium text-stone-800 select-none'>
          {currentPerson
            ? `${currentPerson.full_name} ${currentPerson.birth_year ? `(${currentPerson.birth_year})` : ''}`
            : isAllSelected
              ? resolvedAllOptionLabel
              : resolvedPlaceholder}
        </p>
      </div>

      <m.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}>
        <ChevronDown
          className={`size-4 shrink-0 transition-colors ${isOpen ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'}`}
        />
      </m.div>
    </button>
  )
}

export function SelectorDropdown({
  showAllOption,
  searchTerm,
  onSearchTermChange,
  resolvedAllOptionLabel,
  selectedId,
  onSelect,
  onClose,
  listId,
  filteredPersons
}: {
  showAllOption: boolean
  searchTerm: string
  onSearchTermChange: (value: string) => void
  resolvedAllOptionLabel: string
  selectedId?: string | null
  onSelect: (personId: string | null) => void
  onClose: () => void
  listId: string
  filteredPersons: Person[]
}) {
  const { t } = useI18n()
  const baseId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(0)
  const showAll = showAllOption && searchTerm.trim() === ''
  const optionIds: (string | null)[] = [
    ...(showAll ? [null] : []),
    ...filteredPersons.map((p) => p.id)
  ]
  const optionDomId = (i: number) => `${baseId}-opt-${i}`
  const offset = showAll ? 1 : 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return
    const result = pickerKeyNavigation(e.key, active, optionIds.length)
    if (!result.handled) return
    e.preventDefault()
    setActive(Math.max(result.active, 0))
    if (result.action === 'close') onClose()
    else if (result.action === 'select') onSelect(optionIds[result.active])
  }
  return (
    <m.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className='absolute z-50 mt-2 flex max-h-80 w-full flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white/95 ring-1 ring-black/5 backdrop-blur-xl'>
      <div className='sticky top-0 z-10 border-b border-stone-100/80 bg-stone-50/50 p-2 backdrop-blur-sm'>
        <div className='relative'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400' />
          <input
            ref={inputRef}
            type='text'
            role='combobox'
            aria-expanded='true'
            aria-controls={listId}
            aria-autocomplete='list'
            aria-activedescendant={
              optionIds.length > 0
                ? optionDomId(Math.min(active, optionIds.length - 1))
                : undefined
            }
            aria-label={t('searchMembers')}
            onKeyDown={onInputKeyDown}
            className='w-full rounded-lg border border-stone-200/80 bg-white py-2 pr-3 pl-9 text-sm text-stone-900 placeholder-stone-400 transition outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
            placeholder={t('searchMembers')}
            value={searchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value)
              setActive(0)
            }}
          />
        </div>
      </div>
      <div
        id={listId}
        role='listbox'
        aria-label={t('searchMembers')}
        className='custom-scrollbar flex-1 overflow-y-auto p-1.5'>
        {showAll && (
          <button
            id={optionDomId(0)}
            role='option'
            aria-selected={selectedId === null}
            tabIndex={-1}
            onMouseEnter={() => setActive(0)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(null)}
            className={`group/item mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition duration-200 ${
              selectedId === null
                ? 'border border-amber-200/50 bg-amber-50 text-amber-900'
                : `border border-transparent text-stone-700 hover:bg-stone-100/80 ${active === 0 ? 'bg-stone-100/80' : ''}`
            }`}>
            <div className='relative shrink-0'>
              <div className='flex size-8 items-center justify-center rounded-full bg-stone-500 text-white shadow-xs ring-1 ring-white'>
                <Database className='size-4' />
              </div>
            </div>
            <div className='min-w-0 flex-1 text-left'>
              <p
                className={`truncate ${selectedId === null ? 'font-medium' : 'font-medium group-hover/item:text-stone-900'}`}>
                {resolvedAllOptionLabel}
              </p>
            </div>
            {selectedId === null && (
              <Check className='size-4 shrink-0 text-amber-600' />
            )}
          </button>
        )}

        {filteredPersons.length > 0 ? (
          <div className='space-y-0.5'>
            {filteredPersons.map((person, i) => (
              <PersonOptionRow
                key={person.id}
                optionId={optionDomId(i + offset)}
                isActive={i + offset === active}
                onHover={() => setActive(i + offset)}
                person={person}
                isSelected={person.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 px-4 py-8 text-center'>
            <div className='mb-1 flex size-10 items-center justify-center rounded-full bg-stone-100'>
              <Search className='size-5 text-stone-300' />
            </div>
            <div className='text-sm font-medium text-stone-600'>
              {t('noSearchResults')}
            </div>
            <div className='text-sm text-stone-400'>{t('tryOtherName')}</div>
          </div>
        )}
      </div>
    </m.div>
  )
}
