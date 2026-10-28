'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Filter } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { disclosureButtonProps } from '@/utils/a11y'

import ExportButton from './ExportButton'

export interface BaseToolbarProps {
  hideDaughtersInLaw: boolean
  setHideDaughtersInLaw: (val: boolean) => void
  hideSonsInLaw: boolean
  setHideSonsInLaw: (val: boolean) => void
  hideDaughters: boolean
  setHideDaughters: (val: boolean) => void
  hideSons: boolean
  setHideSons: (val: boolean) => void
  hideMales: boolean
  setHideMales: (val: boolean) => void
  hideFemales: boolean
  setHideFemales: (val: boolean) => void
  hideExpandButtons?: boolean
  setHideExpandButtons?: (val: boolean) => void
  autoCollapseLevel?: number
  setAutoCollapseLevel?: (val: number) => void
  canEdit?: boolean
  children?: React.ReactNode
}

export default function BaseToolbar({
  hideDaughtersInLaw,
  setHideDaughtersInLaw,
  hideSonsInLaw,
  setHideSonsInLaw,
  hideDaughters,
  setHideDaughters,
  hideSons,
  setHideSons,
  hideMales,
  setHideMales,
  hideFemales,
  setHideFemales,
  hideExpandButtons,
  setHideExpandButtons,
  autoCollapseLevel,
  setAutoCollapseLevel,
  canEdit,
  children
}: BaseToolbarProps) {
  const { showAvatar, setShowAvatar } = useMemberListView()
  const { t } = useI18n()
  const [showFilters, setShowFilters] = useState(false)
  const filtersPanelId = useId()
  const filtersRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // defer state init to avoid hydration mismatch checks with strict mode
    const timer = setTimeout(() => setMounted(true), 0)

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!mounted) return null

  const portalNode =
    typeof document !== 'undefined'
      ? document.getElementById('tree-toolbar-portal')
      : null
  if (!portalNode) return null

  return createPortal(
    <div
      className='flex w-max flex-wrap items-center justify-center gap-2'
      ref={filtersRef}>
      {/* Custom Controls (Zoom or Expand/Collapse) */}
      {children}

      {/* Filters */}
      <div className='relative'>
        <button
          type='button'
          {...disclosureButtonProps(t('show'), showFilters, filtersPanelId)}
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition duration-300 ${
            showFilters
              ? 'border-amber-200 bg-amber-100/90 text-amber-800'
              : 'border-stone-200/60 bg-white/80 text-stone-600 backdrop-blur-md hover:bg-white hover:text-stone-900'
          }`}>
          <Filter className='size-4' aria-hidden='true' />
          <span className='hidden sm:inline'>{t('show')}</span>
        </button>

        <AnimatePresence>
          {showFilters && (
            <m.div
              id={filtersPanelId}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className='absolute top-full right-0 z-50 mt-2 flex w-48 flex-col gap-3 rounded-3xl border border-border bg-surface/95 p-4 backdrop-blur-xl'>
              <div className='mb-1 text-sm font-medium text-stone-400'>
                {t('display')}
              </div>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={!showAvatar}
                  onChange={(e) => setShowAvatar(!e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('minimal')}
              </label>
              {setHideExpandButtons && (
                <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                  <input
                    type='checkbox'
                    checked={!!hideExpandButtons}
                    onChange={(e) => setHideExpandButtons(e.target.checked)}
                    className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                  />
                  {t('hideExpandCollapse')}
                </label>
              )}
              {setAutoCollapseLevel && (
                <label className='flex cursor-pointer items-center justify-between gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                  <span>{t('generations')}</span>
                  <input
                    type='number'
                    min={0}
                    max={99}
                    value={autoCollapseLevel ?? 0}
                    onChange={(e) => {
                      const val = e.target.valueAsNumber
                      setAutoCollapseLevel(Number.isFinite(val) ? val : 0)
                    }}
                    className='w-14 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm focus:ring-1 focus:ring-amber-400 focus:outline-none'
                  />
                </label>
              )}

              <div className='my-1 flex h-px w-full items-center gap-2 bg-stone-100 font-medium text-stone-400'></div>
              <div className='mb-1 text-sm font-medium text-stone-400'>
                {t('filters')}
              </div>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideDaughtersInLaw}
                  onChange={(e) => setHideDaughtersInLaw(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideDaughtersInLaw')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideSonsInLaw}
                  onChange={(e) => setHideSonsInLaw(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideSonsInLaw')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideDaughters}
                  onChange={(e) => setHideDaughters(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideDaughters')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideSons}
                  onChange={(e) => setHideSons(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideSons')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideMales}
                  onChange={(e) => setHideMales(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideMales')}
              </label>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-stone-600 transition-colors select-none hover:text-stone-900'>
                <input
                  type='checkbox'
                  checked={hideFemales}
                  onChange={(e) => setHideFemales(e.target.checked)}
                  className='size-4 cursor-pointer rounded text-amber-600 focus:ring-amber-500'
                />
                {t('hideFemales')}
              </label>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Button */}
      {canEdit && <ExportButton />}
    </div>,
    portalNode
  )
}
