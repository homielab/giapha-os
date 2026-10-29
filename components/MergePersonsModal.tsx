'use client'

import { AnimatePresence, m } from 'framer-motion'
import Link from 'next/link'
import { useId, useState } from 'react'

import {
  loadMergePreview,
  mergePersons,
  type MergeSummary
} from '@/app/actions/mergePersons'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import MergeWarnings from '@/components/MergeWarnings'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import type { DuplicateGroupMember } from '@/utils/duplicatePeople'
import { deathYearOf } from '@/utils/memberSearch'
import { memberSearchCache } from '@/utils/memberSearchCache'
import { canConfirmMerge, type MergePreview } from '@/utils/mergePersons'

interface MergePersonsModalProps {
  members: DuplicateGroupMember[]
  onMerged: (mergedIds: string[], summary: MergeSummary) => void
  onCancel: () => void
}

/**
 * Merge two members of one duplicate group: pick the keeper, review what
 * moves over, confirm by typing the dropped member's name. There is no undo,
 * so the modal asks for a backup first.
 */
export default function MergePersonsModal({
  members,
  onMerged,
  onCancel
}: MergePersonsModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const [keepId, setKeepId] = useState(members[0]?.id ?? '')
  const [dropId, setDropId] = useState(members[1]?.id ?? '')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dialogRef = useModalA11y(() => {
    if (!isMerging) onCancel()
  })

  const drop = members.find((member) => member.id === dropId)
  const canMerge =
    keepId !== '' &&
    dropId !== '' &&
    keepId !== dropId &&
    canConfirmMerge({
      preview,
      acknowledged,
      confirmText,
      dropName: drop?.full_name
    })
  // With warnings, the name can only be typed once they are acknowledged.
  const needsAcknowledge =
    preview != null && preview.warnings.length > 0 && !acknowledged

  const pickMember = (picker: 'keep' | 'drop', id: string) => {
    if (picker === 'keep') {
      setKeepId(id)
      if (id === dropId) setDropId(members.find((m) => m.id !== id)?.id ?? '')
    } else {
      setDropId(id)
      if (id === keepId) setKeepId(members.find((m) => m.id !== id)?.id ?? '')
    }
    setPreview(null)
    setPreviewError(null)
    setConfirmText('')
    setAcknowledged(false)
    setError(null)
  }

  const loadPreview = async () => {
    if (!keepId || !dropId || keepId === dropId) return
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const res = await loadMergePreview(keepId, dropId)
      if ('error' in res) setPreviewError(res.error)
      else setPreview(res)
    } catch {
      setPreviewError(t('mergePreviewFailed'))
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const submit = async () => {
    if (!canMerge || isMerging) return
    setIsMerging(true)
    setError(null)
    try {
      const res = await mergePersons(keepId, dropId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      memberSearchCache.clear()
      onMerged([keepId, dropId], res.summary)
    } catch {
      setError(t('mergeFailedGeneric'))
    } finally {
      setIsMerging(false)
    }
  }

  const years = (birth: number | null, death: number | null) =>
    `${birth ?? '?'} – ${death ?? ''}`.trim()

  const relationshipLabel = (type: string, name: string) => {
    const kind =
      type === 'marriage'
        ? t('mergeRelMarriage')
        : type === 'adopted_child'
          ? t('mergeRelAdopted')
          : t('mergeRelChild')
    return `${kind} ${name}`
  }

  const hasPreviewChanges =
    preview != null &&
    (preview.moved.length > 0 ||
      preview.droppedPair.length > 0 ||
      preview.droppedDuplicates.length > 0 ||
      preview.personFills.length > 0 ||
      preview.privateMoved ||
      preview.privateFills.length > 0 ||
      preview.otherNamesAdded.length > 0 ||
      preview.noteAppended)

  return (
    <AnimatePresence>
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className='fixed inset-0 z-50 flex items-center justify-center p-4 outline-none'>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='absolute inset-0 cursor-pointer bg-stone-900/40 backdrop-blur-sm'
          onClick={onCancel}
        />
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className='relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-stone-200/60 bg-white p-6'>
          <h2 id={titleId} className='text-lg font-semibold text-stone-900'>
            {t('mergeTitle')}
          </h2>
          <p className='mt-1 text-sm text-stone-500'>{t('mergeDescription')}</p>

          <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
            {t('mergeBackupFirst')}{' '}
            <Link href='/dashboard/data' className='font-medium underline'>
              {t('mergeBackupLink')}
            </Link>
          </div>

          <div className='mt-4 space-y-2'>
            <p className='text-xs font-semibold text-stone-600'>
              {t('mergeKeepTag')} / {t('mergeDropTag')}
            </p>
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border p-3 text-sm ${
                  member.id === keepId
                    ? 'border-emerald-300 bg-emerald-50'
                    : member.id === dropId
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-stone-200'
                }`}>
                <span className='min-w-40 flex-1'>
                  <span className='block font-medium text-stone-900'>
                    {member.full_name}
                  </span>
                  <span className='block text-xs text-stone-500'>
                    {t('duplicateScanYears')}:{' '}
                    {years(member.birth_year, deathYearOf(member))}
                  </span>
                </span>
                <label className='flex cursor-pointer items-center gap-1.5'>
                  <input
                    type='radio'
                    name='merge-keep'
                    checked={member.id === keepId}
                    onChange={() => pickMember('keep', member.id)}
                  />
                  {t('mergeKeepTag')}
                </label>
                <label className='flex cursor-pointer items-center gap-1.5'>
                  <input
                    type='radio'
                    name='merge-drop'
                    checked={member.id === dropId}
                    onChange={() => pickMember('drop', member.id)}
                  />
                  {t('mergeDropTag')}
                </label>
              </div>
            ))}
          </div>
          <p className='mt-2 text-xs text-stone-500'>{t('mergeKeeperHint')}</p>

          {keepId !== dropId && keepId !== '' && dropId !== '' && (
            <>
              {!preview && !previewError && (
                <button
                  onClick={loadPreview}
                  disabled={isLoadingPreview}
                  className='btn btn-outline mt-4'>
                  {isLoadingPreview
                    ? t('mergePreviewLoading')
                    : t('mergePreviewButton')}
                </button>
              )}

              {previewError && (
                <div className='mt-4'>
                  <ImportStatusMessage
                    status={{ type: 'error', message: previewError }}
                  />
                </div>
              )}

              {preview && (
                <div className='mt-4 space-y-3 rounded-xl border border-stone-200 p-4 text-sm'>
                  {!hasPreviewChanges && (
                    <p className='text-stone-500'>{t('mergeNothingToMove')}</p>
                  )}
                  {preview.moved.length > 0 && (
                    <div>
                      <p className='font-medium text-stone-800'>
                        {t('mergeMoved', { count: preview.moved.length })}
                      </p>
                      <ul className='mt-1 list-disc pl-5 text-stone-600'>
                        {preview.moved.map((rel) => (
                          <li key={rel.id}>
                            {relationshipLabel(rel.type, rel.otherName ?? '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.droppedPair.length > 0 && (
                    <p className='text-stone-600'>
                      {t('mergeDroppedPair', {
                        count: preview.droppedPair.length
                      })}
                    </p>
                  )}
                  {preview.droppedDuplicates.length > 0 && (
                    <div>
                      <p className='font-medium text-stone-800'>
                        {t('mergeDroppedDuplicates', {
                          count: preview.droppedDuplicates.length
                        })}
                      </p>
                      <ul className='mt-1 list-disc pl-5 text-stone-600'>
                        {preview.droppedDuplicates.map((rel) => (
                          <li key={rel.id}>
                            {relationshipLabel(rel.type, rel.otherName ?? '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.personFills.length > 0 && (
                    <div>
                      <p className='font-medium text-stone-800'>
                        {t('mergeFieldsFilled', {
                          count: preview.personFills.length
                        })}
                      </p>
                      <ul className='mt-1 list-disc pl-5 text-stone-600'>
                        {preview.personFills.map((fill) => (
                          <li key={fill.key}>
                            {t(`mergeField_${fill.key}`)}:{' '}
                            {typeof fill.value === 'boolean'
                              ? t(fill.value ? 'mergeYes' : 'mergeNo')
                              : fill.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.privateMoved && (
                    <p className='text-stone-600'>{t('mergePrivateMoved')}</p>
                  )}
                  {preview.privateFills.length > 0 && (
                    <div>
                      <p className='font-medium text-stone-800'>
                        {t('mergePrivateFilled', {
                          count: preview.privateFills.length
                        })}
                      </p>
                      <ul className='mt-1 list-disc pl-5 text-stone-600'>
                        {preview.privateFills.map((fill) => (
                          <li key={fill.key}>
                            {t(`mergePrivate_${fill.key}`)}: {fill.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.otherNamesAdded.length > 0 && (
                    <p className='text-stone-600'>
                      {t('mergeOtherNames', {
                        names: preview.otherNamesAdded.join(', ')
                      })}
                    </p>
                  )}
                  {preview.noteAppended && (
                    <p className='text-stone-600'>{t('mergeNoteAppended')}</p>
                  )}
                  {preview.moved.length === 0 &&
                    preview.droppedDuplicates.length === 0 &&
                    preview.personFills.length === 0 && (
                      <p className='text-xs text-stone-500'>
                        {t('mergeNoRelationships')}
                      </p>
                    )}
                </div>
              )}

              {preview && (
                <MergeWarnings
                  warnings={preview.warnings}
                  acknowledged={acknowledged}
                  onAcknowledgedChange={setAcknowledged}
                />
              )}

              <div className='mt-4 space-y-2'>
                <label className='block space-y-1.5'>
                  <span className='text-xs font-semibold text-stone-600'>
                    {t('mergeConfirmLabel', { name: drop?.full_name ?? '' })}
                  </span>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={!preview || needsAcknowledge}
                    className='w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900 disabled:cursor-not-allowed disabled:bg-stone-100'
                  />
                </label>
              </div>

              {error && (
                <div className='mt-3'>
                  <ImportStatusMessage
                    status={{ type: 'error', message: error }}
                  />
                </div>
              )}

              <div className='mt-5 flex justify-end gap-2'>
                <button onClick={onCancel} disabled={isMerging} className='btn'>
                  {t('cancel')}
                </button>
                <button
                  onClick={submit}
                  disabled={!canMerge || isMerging}
                  className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-100 px-4 py-4 text-sm font-medium text-red-800 transition duration-300 hover:-translate-y-1 hover:bg-red-200 hover:shadow-soft-hover disabled:cursor-not-allowed disabled:opacity-50'>
                  {isMerging ? t('mergeMerging') : t('mergeConfirmButton')}
                </button>
              </div>
            </>
          )}
        </m.div>
      </div>
    </AnimatePresence>
  )
}
