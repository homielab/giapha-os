'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PersonNode } from '@/components/kinship/kinshipTypes'
import PersonAvatar from '@/components/kinship/PersonAvatar'
import { useI18n } from '@/lib/i18n/useI18n'
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

  const filtered = useMemo(
    () =>
      persons
        .filter(
          (p) =>
            p.id !== disabledId &&
            p.full_name.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 20),
    [persons, disabledId, search]
  )

  return (
    <div className='relative w-full min-w-0 flex-1'>
      <p className='mb-2 text-sm font-medium text-stone-400'>{label}</p>
      <button
        onClick={() => setOpen((v) => !v)}
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
            className='absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200/60 bg-white'>
            <div className='border-b border-stone-100 p-3'>
              <div className='relative'>
                <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400' />
                <input
                  placeholder={t('searchName')}
                  className='w-full rounded-xl border border-stone-200 py-2 pr-4 pl-9 text-sm focus:border-amber-400 focus:outline-none sm:text-sm'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className='max-h-52 overflow-y-auto'>
              {filtered.length === 0 ? (
                <p className='py-6 text-center text-sm text-stone-400'>
                  {t('noSearchResults')}
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p)
                      setOpen(false)
                      setSearch('')
                    }}
                    className='flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50'>
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
                  </button>
                ))
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
