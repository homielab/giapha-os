'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, Download, UserPlus } from 'lucide-react'
import { useId } from 'react'

import { useModalA11y } from '@/hooks/useModalA11y'
import type { Locale } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n/useI18n'
import type { ImportMode } from '@/utils/appendImport'
import {
  formatExportedAt,
  type BackupSummary,
  type RestoreWarning
} from '@/utils/backupSummary'
import type { GedcomImportStats } from '@/utils/gedcom'

interface ImportConfirmModalProps {
  fileName: string
  summary: BackupSummary
  /** Replace the whole tree (default) or add the file to it. */
  mode?: ImportMode
  onModeChange?: (mode: ImportMode) => void
  warning?: RestoreWarning
  /** Values of the file cut to the length limits. */
  truncated?: number
  /** Notes and sources of a GEDCOM file the import cannot keep. */
  gedcom?: GedcomImportStats
  /** GEDCOM only: names read surname first (Vietnamese order). */
  surnameFirst?: boolean
  onSurnameFirstChange?: (value: boolean) => void
  isReadingFile?: boolean
  locale: Locale
  isImporting: boolean
  isDownloading: boolean
  downloadError: string | null
  onDownloadBackup: () => void
  onCancel: () => void
  onConfirm: () => void
}

export default function ImportConfirmModal({
  fileName,
  summary,
  mode = 'replace',
  onModeChange,
  warning,
  truncated,
  gedcom,
  surnameFirst = true,
  onSurnameFirstChange,
  isReadingFile = false,
  locale,
  isImporting,
  isDownloading,
  downloadError,
  onDownloadBackup,
  onCancel,
  onConfirm
}: ImportConfirmModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const append = mode === 'append'
  const exportedDate = formatExportedAt(summary.exportedAt, locale)
  const dialogRef = useModalA11y(() => {
    if (!isImporting) onCancel()
  })
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
          className='relative z-10 w-full max-w-md rounded-2xl border border-stone-200/60 bg-white p-6'>
          <div className='mb-5 flex items-start gap-4'>
            <div
              className={`mt-1 shrink-0 rounded-full p-3 ${
                append
                  ? 'bg-amber-100/50 text-amber-700'
                  : 'bg-rose-100/50 text-rose-600'
              }`}>
              {append ? (
                <UserPlus className='size-6' aria-hidden='true' />
              ) : (
                <AlertTriangle className='size-6' aria-hidden='true' />
              )}
            </div>
            <div>
              <h3 id={titleId} className='text-lg font-semibold text-stone-800'>
                {t(append ? 'appendConfirmTitle' : 'restoreConfirmTitle')}
              </h3>
              {onModeChange ? (
                <fieldset className='mt-3' disabled={isImporting}>
                  <legend className='text-sm font-medium text-stone-800'>
                    {t('importModeLegend')}
                  </legend>
                  {(['replace', 'append'] as const).map((value) => (
                    <label
                      key={value}
                      className='mt-1 flex items-center gap-2 text-sm text-stone-700'>
                      <input
                        type='radio'
                        name={`${titleId}-mode`}
                        checked={mode === value}
                        onChange={() => onModeChange(value)}
                      />
                      {t(
                        value === 'append'
                          ? 'importModeAppend'
                          : 'importModeReplace'
                      )}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              <p className='mt-2 text-sm leading-relaxed text-stone-600'>
                {t(append ? 'appendConfirmText' : 'restoreConfirmText', {
                  file: fileName
                })}
              </p>
              <p className='mt-3 text-sm font-medium text-stone-800'>
                {t(append ? 'appendFileContains' : 'restoreFileContains', {
                  persons: summary.persons,
                  relationships: summary.relationships,
                  events: summary.events
                })}
              </p>
              {append && (
                <p className='mt-3 rounded-lg bg-stone-100 p-2 text-sm text-stone-700'>
                  {t('appendNotes')}
                </p>
              )}
              {warning && (
                <p
                  role='alert'
                  className='mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800'>
                  {t(
                    warning === 'ansel'
                      ? 'restoreEncodingAnsel'
                      : 'restoreEncodingReplaced'
                  )}
                </p>
              )}
              {truncated ? (
                <p
                  role='alert'
                  className='mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800'>
                  {t('restoreTruncated', { count: truncated })}
                </p>
              ) : null}
              {gedcom &&
              (gedcom.sources > 0 ||
                gedcom.missingNotes > 0 ||
                gedcom.droppedFamilyNotes > 0) ? (
                <p
                  role='alert'
                  className='mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800'>
                  {t('restoreGedcomDropped', {
                    sources: gedcom.sources,
                    missingNotes: gedcom.missingNotes,
                    droppedFamilyNotes: gedcom.droppedFamilyNotes
                  })}
                </p>
              ) : null}
              {gedcom && gedcom.unnamed > 0 ? (
                <p
                  role='alert'
                  className='mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800'>
                  {t('restoreGedcomUnnamed', {
                    count: gedcom.unnamed,
                    name: t('gedcomUnnamedPerson')
                  })}
                </p>
              ) : null}
              {gedcom && onSurnameFirstChange ? (
                <fieldset
                  className='mt-3'
                  disabled={isImporting || isReadingFile}>
                  <legend className='text-sm font-medium text-stone-800'>
                    {t('restoreGedcomNameOrder')}
                  </legend>
                  {[true, false].map((value) => (
                    <label
                      key={String(value)}
                      className='mt-1 flex items-center gap-2 text-sm text-stone-700'>
                      <input
                        type='radio'
                        name={`${titleId}-name-order`}
                        checked={surnameFirst === value}
                        onChange={() => onSurnameFirstChange(value)}
                      />
                      {t(
                        value
                          ? 'restoreGedcomSurnameFirst'
                          : 'restoreGedcomSurnameLast'
                      )}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              {exportedDate && (
                <p className='mt-1 text-xs text-stone-500'>
                  {t('restoreFileExportedAt', { date: exportedDate })}
                </p>
              )}
              <button
                type='button'
                onClick={onDownloadBackup}
                disabled={isDownloading || isImporting}
                className='mt-3 inline-flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-50'>
                <Download className='size-4' />
                {isDownloading
                  ? t('processingData')
                  : t('restoreDownloadCurrent')}
              </button>
              {downloadError && (
                <p role='alert' className='mt-2 text-sm text-red-600'>
                  {downloadError}
                </p>
              )}
              {!append && (
                <p className='mt-3 text-sm font-medium text-rose-600'>
                  {t('restoreIrreversible')}
                </p>
              )}
            </div>
          </div>

          <div className='mt-6 flex justify-end gap-3'>
            <button
              onClick={onCancel}
              disabled={isImporting}
              className='rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900'>
              {t('restoreCancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isImporting || isReadingFile}
              className={`rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50 ${
                append
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}>
              {append
                ? t(isImporting ? 'appending' : 'appendConfirm')
                : t(isImporting ? 'restoring' : 'restoreContinue')}
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  )
}
