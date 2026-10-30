'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { PersonNode } from '@/components/kinship/kinshipTypes'
import PersonAvatar from '@/components/kinship/PersonAvatar'
import { useI18n } from '@/lib/i18n/useI18n'
import {
  filterPickerPersons,
  isImeComposing,
  pickerKeyNavigation
} from '@/utils/pickerNavigation'
import { getAvatarBg } from '@/utils/styleHelpers'

interface KinshipPersonSelectorProps {
  label: string
  selected: PersonNode | null
  onSelect: (p: PersonNode) => void
  persons: PersonNode[]
  disabledId?: string
}

export default function KinshipPersonSelector({
  label,
  selected,
  onSelect,
  persons,
  disabledId
}: KinshipPersonSelectorProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const [active, setActive] = useState(0)
  const listId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => filterPickerPersons(persons, search, disabledId),
    [persons, disabledId, search]
  )

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const optionId = (i: number) => `${listId}-opt-${i}`

  const close = (restoreFocus = true) => {
    setOpen(false)
    setSearch('')
    setActive(0)
    if (restoreFocus) buttonRef.current?.focus()
  }

  const choose = (p: PersonNode) => {
    onSelect(p)
    close()
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return
    const result = pickerKeyNavigation(e.key, active, filtered.length)
    if (!result.handled) return
    e.preventDefault()
    setActive(Math.max(result.active, 0))
    if (result.action === 'close') close()
    else if (result.action === 'select') choose(filtered[result.active])
  }

  return (
    <div className='relative w-full min-w-0 flex-1'>
      <p className='mb-2 text-sm font-medium text-stone-400'>{label}</p>
      <button
        ref={buttonRef}
        type='button'
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected ? selected.full_name : t('selectMember')}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
          selected
            ? 'border-amber-300 bg-amber-50 text-stone-800'
            : 'border-stone-200 bg-white/80 text-stone-400 hover:border-amber-200'
        }`}>
        <PersonAvatar
          person={selected}
          large
          bgClassName={
            selected
              ? getAvatarBg(selected.gender)
              : 'bg-stone-100 text-stone-400'
          }
        />

        <span className='truncate font-medium'>
          {selected ? selected.full_name : t('selectMember')}
        </span>
        {selected?.birth_year && (
          <span className='shrink-0 text-sm text-stone-400'>
            ({selected.birth_year})
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget))
                close(false)
            }}
            className='absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200/60 bg-white'>
            <div className='border-b border-stone-100 p-3'>
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
                    filtered.length > 0 ? optionId(active) : undefined
                  }
                  aria-label={t('searchName')}
                  onKeyDown={onInputKeyDown}
                  placeholder={t('searchName')}
                  className='w-full rounded-xl border border-stone-200 py-2 pr-4 pl-9 text-sm focus:border-amber-400 focus:outline-none sm:text-sm'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setActive(0)
                  }}
                />
              </div>
            </div>
            <ul
              id={listId}
              role='listbox'
              aria-label={label}
              className='max-h-52 overflow-y-auto'>
              {filtered.map((p, i) => (
                <li
                  key={p.id}
                  id={optionId(i)}
                  role='option'
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? 'bg-amber-50' : ''
                  }`}>
                  <PersonAvatar
                    person={p}
                    bgClassName={getAvatarBg(p.gender)}
                  />

                  <span className='truncate text-sm font-medium text-stone-700'>
                    {p.full_name}
                  </span>
                  {p.birth_year && (
                    <span className='ml-auto shrink-0 text-sm text-stone-400'>
                      {p.birth_year}
                    </span>
                  )}
                  {p.generation != null && (
                    <span className='shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-sm text-emerald-600'>
                      {t('generationLabel', { generation: p.generation })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p
              role='status'
              aria-live='polite'
              className={
                filtered.length === 0
                  ? 'py-6 text-center text-sm text-stone-400'
                  : 'sr-only'
              }>
              {filtered.length === 0
                ? t('noSearchResults')
                : t('pickerResultsCount', { count: filtered.length })}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
