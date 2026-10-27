'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, CalendarSync } from 'lucide-react'
import { useState } from 'react'

import {
  applyLunarRecompute,
  previewLunarRecompute
} from '@/app/actions/lunarRecompute'
import DataCard from '@/components/DataCard'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import LunarRecomputeTable from '@/components/LunarRecomputeTable'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import type { LunarRecomputeRow } from '@/utils/lunarRecompute'

type Status = { type: 'success' | 'error'; message: string | undefined }

export default function LunarRecompute() {
  const { t } = useI18n()
  const [rows, setRows] = useState<LunarRecomputeRow[] | null>(null)
  // Nothing is selected by default: the admin decides row by row.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isChecking, setIsChecking] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  // Esc closes the confirmation unless the changes are being written.
  const dialogRef = useModalA11y(() => {
    if (!isApplying) setShowConfirm(false)
  }, showConfirm)

  const loadPreview = async (): Promise<boolean> => {
    const result = await previewLunarRecompute()
    if ('error' in result) {
      setStatus({ type: 'error', message: result.error })
      return false
    }
    setRows(result.rows)
    setSelected(new Set())
    return true
  }

  const handleCheck = async () => {
    setIsChecking(true)
    setStatus(null)
    try {
      await loadPreview()
    } catch {
      setStatus({ type: 'error', message: t('lunarRecomputeFailed') })
    } finally {
      setIsChecking(false)
    }
  }

  const handleApply = async () => {
    setIsApplying(true)
    setStatus(null)
    try {
      const result = await applyLunarRecompute([...selected])
      if ('error' in result) {
        setStatus({ type: 'error', message: result.error })
        return
      }
      setStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t('lunarRecomputeResult', {
          updated: result.updated,
          skipped: result.skipped,
          failed: result.failed
        })
      })
      await loadPreview()
    } catch {
      setStatus({ type: 'error', message: t('lunarRecomputeFailed') })
    } finally {
      setIsApplying(false)
      setShowConfirm(false)
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!rows) return
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    )
  }

  const busy = isChecking || isApplying

  return (
    <DataCard
      icon={<CalendarSync className='size-6' />}
      title={t('lunarRecomputeTitle')}
      description={t('lunarRecomputeDescription')}
      accent='amber'>
      <div className='mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
        <AlertTriangle className='mt-0.5 size-5 shrink-0' />
        <div className='space-y-1'>
          <p>{t('lunarRecomputeWarning')}</p>
          <p className='font-medium'>{t('lunarRecomputeBackupHint')}</p>
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={busy}
        className='btn w-full sm:w-auto'>
        {isChecking ? t('lunarRecomputeChecking') : t('lunarRecomputeCheck')}
      </button>

      {rows && (
        <div className='mt-4 space-y-3'>
          {rows.length === 0 ? (
            <p className='text-sm text-stone-500'>{t('lunarRecomputeNone')}</p>
          ) : (
            <>
              <p className='text-sm text-stone-500'>
                {t('lunarRecomputeFound', {
                  count: rows.length,
                  selected: selected.size
                })}
              </p>
              <LunarRecomputeTable
                rows={rows}
                selected={selected}
                disabled={busy}
                onToggle={toggle}
                onToggleAll={toggleAll}
              />
              <button
                onClick={() => setShowConfirm(true)}
                disabled={busy || selected.size === 0}
                className='btn-primary w-full disabled:pointer-events-none disabled:opacity-50 sm:w-auto'>
                {t('lunarRecomputeApply', { count: selected.size })}
              </button>
            </>
          )}
        </div>
      )}

      {status && (
        <div className='mt-4'>
          <ImportStatusMessage status={status} />
        </div>
      )}

      <AnimatePresence>
        {showConfirm && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 cursor-pointer bg-stone-900/40 backdrop-blur-sm'
              onClick={() => !isApplying && setShowConfirm(false)}
            />
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              ref={dialogRef}
              role='dialog'
              tabIndex={-1}
              aria-modal='true'
              aria-labelledby='lunar-recompute-confirm-title'
              className='relative z-10 w-full max-w-md rounded-2xl border border-stone-200/60 bg-white p-6'>
              <div className='mb-5 flex items-start gap-4'>
                <div className='mt-1 shrink-0 rounded-full bg-amber-100/50 p-3 text-amber-600'>
                  <AlertTriangle className='size-6' />
                </div>
                <div>
                  <h3
                    id='lunar-recompute-confirm-title'
                    className='text-lg font-semibold text-stone-800'>
                    {t('lunarRecomputeConfirmTitle')}
                  </h3>
                  <p className='mt-2 text-sm leading-relaxed text-stone-600'>
                    {t('lunarRecomputeConfirmText', { count: selected.size })}
                  </p>
                  <p className='mt-2 text-sm font-medium text-amber-700'>
                    {t('lunarRecomputeBackupHint')}
                  </p>
                </div>
              </div>
              <div className='mt-6 flex justify-end gap-3'>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isApplying}
                  className='rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900'>
                  {t('cancel')}
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className='rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50'>
                  {isApplying
                    ? t('lunarRecomputeApplying')
                    : t('lunarRecomputeConfirmContinue')}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </DataCard>
  )
}
