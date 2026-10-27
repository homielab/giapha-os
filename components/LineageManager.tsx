'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

import LineagePreviewTable from '@/components/lineage/LineagePreviewTable'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import {
  applyGenerationUpdates,
  buildLineageUpdates
} from '@/utils/generationUpdates'
import {
  computeBirthOrders,
  ComputedUpdate,
  computeGenerations,
  computeInLaws
} from '@/utils/lineageCompute'
import { createClient } from '@/utils/supabase/client'

interface LineageManagerProps {
  persons: Person[]
  relationships: Relationship[]
}

// ─── Component ───────────────────────────────────────────────────────────────

function LineageActionButtons({
  computing,
  applying,
  hasChanges,
  changeCount,
  onCompute,
  onApply
}: {
  computing: boolean
  applying: boolean
  hasChanges: boolean
  changeCount: number
  onCompute: () => void
  onApply: () => void
}) {
  const { t } = useI18n()
  return (
    <div className='flex flex-col gap-3 sm:flex-row'>
      <button
        onClick={onCompute}
        disabled={computing || applying}
        className='btn-secondary'>
        {computing ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Sparkles className='size-4' />
        )}
        {computing ? t('calculating') : t('calculate')}
      </button>

      {hasChanges && (
        <button onClick={onApply} disabled={applying} className='btn-primary'>
          {applying ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          {applying
            ? t('updating')
            : t('applyChangesCount', { count: changeCount })}
        </button>
      )}
    </div>
  )
}

export default function LineageManager({
  persons,
  relationships
}: LineageManagerProps) {
  const { t } = useI18n()
  const supabase = createClient()

  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null)
  const [computing, setComputing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleCompute = () => {
    setComputing(true)
    setApplied(false)
    setError(null)
    setWarning(null)

    try {
      const genMap = computeGenerations(persons, relationships)
      const orderMap = computeBirthOrders(persons, relationships)
      const inLawMap = computeInLaws(persons, relationships)

      const result: ComputedUpdate[] = persons.map((p) => {
        const newGen = genMap.has(p.id) ? genMap.get(p.id)! : null
        const newOrder = orderMap.has(p.id) ? orderMap.get(p.id)! : null
        const newInLaw = inLawMap.get(p.id) ?? false

        return {
          id: p.id,
          full_name: p.full_name,
          old_generation: p.generation,
          new_generation: newGen,
          old_birth_order: p.birth_order,
          new_birth_order: newOrder,
          old_is_in_law: p.is_in_law,
          new_is_in_law: newInLaw,
          gender: p.gender,
          changed:
            newGen !== p.generation ||
            newOrder !== p.birth_order ||
            newInLaw !== p.is_in_law
        }
      })

      // Sort: changed first, then by new generation, then by new birth_order
      result.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1
        const gA = a.new_generation ?? 999
        const gB = b.new_generation ?? 999
        if (gA !== gB) return gA - gB
        const oA = a.new_birth_order ?? 999
        const oB = b.new_birth_order ?? 999
        return oA - oB
      })

      setUpdates(result)
    } catch (err) {
      setError((err as Error).message || t('lineageComputeError'))
    } finally {
      setComputing(false)
    }
  }

  const handleApply = async () => {
    if (!updates) return
    setApplying(true)
    setError(null)
    setWarning(null)

    try {
      const rows = buildLineageUpdates(updates)
      const result = await applyGenerationUpdates(supabase, rows)
      if (result.ok) {
        setApplied(true)
        if (result.legacy) setWarning(t('generationUpgradeDatabase'))
      } else if (result.legacy) {
        setError(
          `${t('lineagePartialUpdateError', {
            failed: result.failedIds.length,
            total: rows.length,
            error: result.error
          })} ${t('generationUpgradeDatabase')}`
        )
      } else {
        setError(t('lineageTransactionError', { error: result.error }))
      }
    } catch (err) {
      setError((err as Error).message || t('lineageUpdateError'))
    } finally {
      setApplying(false)
    }
  }

  const changedCount = updates?.filter((u) => u.changed).length ?? 0

  return (
    <div className='space-y-6'>
      <LineageActionButtons
        computing={computing}
        applying={applying}
        hasChanges={Boolean(updates) && changedCount > 0 && !applied}
        changeCount={changedCount}
        onCompute={handleCompute}
        onApply={handleApply}
      />

      <LineageStatusBanners
        error={error}
        warning={warning}
        applied={applied}
        changedCount={changedCount}
      />

      {/* Preview table */}
      {updates && (
        <LineagePreviewTable updates={updates} changedCount={changedCount} />
      )}
    </div>
  )
}

function LineageStatusBanners({
  error,
  warning,
  applied,
  changedCount
}: {
  error: string | null
  warning: string | null
  applied: boolean
  changedCount: number
}) {
  const { t } = useI18n()
  return (
    <>
      {/* Error */}
      <AnimatePresence>
        {error && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role='alert'
            className='flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700'>
            <AlertCircle className='mt-0.5 size-5 shrink-0' />
            {error}
          </m.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {applied && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role='status'
            aria-live='polite'
            className='flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700'>
            <CheckCircle2 className='size-5 shrink-0' />
            {t('lineageApplied', { count: changedCount })}
          </m.div>
        )}
      </AnimatePresence>

      {/* Database not upgraded */}
      <AnimatePresence>
        {warning && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800'>
            <AlertTriangle className='mt-0.5 size-5 shrink-0' />
            {warning}
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
