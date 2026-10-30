'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import {
  GLOBAL_SEARCH_COLUMNS,
  rankMembers,
  searchStatusKey,
  type SearchableMember
} from '@/utils/memberSearch'
import { memberSearchCache } from '@/utils/memberSearchCache'
import { isImeComposing } from '@/utils/pickerNavigation'
import { createClient } from '@/utils/supabase/client'
import { fetchAllRows } from '@/utils/supabase/fetchAll'

export default function GlobalMemberSearch() {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [members, setMembers] = useState<SearchableMember[] | null>(
    memberSearchCache.get()
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const listId = useId()
  const close = () => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }
  const dialogRef = useModalA11y<HTMLDivElement>(close, open)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    // Stale-while-revalidate: the list already on screen stays while it is
    // reloaded in the background when older than the TTL (or cleared by an edit).
    const cached = memberSearchCache.get()
    if (cached && memberSearchCache.isFresh()) return
    let cancelled = false
    const supabase = createClient()
    fetchAllRows<SearchableMember>((from, to) =>
      supabase
        .from('persons')
        .select(GLOBAL_SEARCH_COLUMNS)
        .order('full_name')
        .order('id')
        .range(from, to)
    ).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        // A failed background reload keeps the old list on screen.
        if (!members) setLoadError(error.message)
        return
      }
      memberSearchCache.set(data)
      setMembers(data)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members only matters when an open starts
  }, [open, reloadKey])

  const results = useMemo(
    () => (members && query.trim() ? rankMembers(query, members) : []),
    [members, query]
  )

  const go = (id: string) => {
    close()
    router.push(`/dashboard/members/${id}`)
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active].member.id)
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`
  const loading = !members && !loadError
  let status: string | null = null
  if (loading || query.trim()) {
    const s = searchStatusKey(loading, results.length)
    status = 'count' in s ? t(s.key, { count: s.count }) : t(s.key)
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        aria-label={t('globalSearchOpen')}
        aria-haspopup='dialog'
        aria-keyshortcuts='Control+K Meta+K'
        title={t('globalSearchOpen')}
        className='inline-flex size-10 items-center justify-center rounded-full border border-stone-200 bg-white/70 text-stone-600 transition-colors hover:text-amber-700'>
        <Search className='size-4' aria-hidden='true' />
      </button>
      {open && (
        <div
          className='fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}>
          <div
            ref={dialogRef}
            role='dialog'
            aria-modal='true'
            aria-label={t('globalSearchTitle')}
            tabIndex={-1}
            className='w-full max-w-lg rounded-2xl border border-border bg-surface p-3 shadow-xl outline-none'>
            <input
              ref={inputRef}
              type='text'
              role='combobox'
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete='list'
              aria-activedescendant={
                results.length > 0 ? optionId(active) : undefined
              }
              aria-label={t('globalSearchTitle')}
              placeholder={t('globalSearchPlaceholder')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKeyDown}
              className='w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 outline-none focus:border-amber-500'
            />
            <ul
              id={listId}
              role='listbox'
              aria-label={t('globalSearchTitle')}
              className='mt-2 max-h-80 overflow-y-auto'>
              {results.map(({ member, years }, i) => (
                <li
                  key={member.id}
                  id={optionId(i)}
                  role='option'
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(member.id)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                    i === active
                      ? 'bg-amber-50 text-amber-800'
                      : 'text-stone-700'
                  }`}>
                  <span className='truncate font-medium'>
                    {member.full_name}
                  </span>
                  {years && (
                    <span className='shrink-0 text-xs text-stone-500'>
                      {years}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div role='status' aria-live='polite' className='px-3 py-2 text-sm'>
              {loadError ? (
                <span className='text-red-600'>
                  {t('globalSearchLoadError', { error: loadError })}{' '}
                  <button
                    type='button'
                    className='underline'
                    onClick={() => {
                      setLoadError(null)
                      setReloadKey((k) => k + 1)
                    }}>
                    {t('tryAgain')}
                  </button>
                </span>
              ) : (
                <span className='text-stone-500'>{status}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
