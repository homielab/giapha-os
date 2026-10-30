'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { appendImportData, exportData, importData } from '@/app/actions/data'
import DataCard from '@/components/DataCard'
import ExportActions from '@/components/ExportActions'
import ImportConfirmModal from '@/components/ImportConfirmModal'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import { useAllPersons } from '@/hooks/useAllPersons'
import { useI18n } from '@/lib/i18n/useI18n'
import type { ImportMode } from '@/utils/appendImport'
import {
  validateImportPayload,
  type ImportPayload
} from '@/utils/backupPayload'
import {
  BackupParseError,
  readRestoreFile,
  summarizeBackup,
  type BackupSummary,
  type RestoreWarning
} from '@/utils/backupSummary'
import { CsvParseError, CsvZipInvalidError } from '@/utils/csvErrors'
import { formatIsoDay } from '@/utils/dateHelpers'
import { requestDuplicateScan } from '@/utils/duplicateScanTrigger'
import type { GedcomImportStats } from '@/utils/gedcom'
import { memberSearchCache } from '@/utils/memberSearchCache'
import { restorePayloadTooLarge } from '@/utils/restoreLimit'

import PersonSelector from './PersonSelector'

const CSV_PROBLEM_MESSAGES = {
  tooFewFields: 'csvTooFewFields',
  tooManyFields: 'csvTooManyFields',
  brokenQuotes: 'csvBrokenQuotes'
} as const

export default function DataImportExport({
  restoreMaxBytes = null
}: {
  /** Largest restore payload the host accepts (Vercel), or null. */
  restoreMaxBytes?: number | null
} = {}) {
  const { t, locale } = useI18n()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error'
    message: string | undefined
    /** Set after adding a file to the tree: offer the duplicate scan. */
    appended?: boolean
  } | null>(null)
  // Replace the whole tree (restore) or add the file to it; chosen per file.
  const [importMode, setImportMode] = useState<ImportMode>('replace')
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedBackup, setParsedBackup] = useState<{
    payload: ImportPayload
    summary: BackupSummary
    warning?: RestoreWarning
    truncated?: number
    gedcom?: GedcomImportStats
  } | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  // GEDCOM names: surname first (Vietnamese order) or as the file writes them.
  const [surnameFirst, setSurnameFirst] = useState(true)
  const [exportError, setExportError] = useState<string | null>(null)

  const { persons, error: personsError } = useAllPersons()
  const [exportRootId, setExportRootId] = useState<string | null>(null)

  const handleExport = async (
    format: 'json' | 'gedcom' | 'csv',
    rootId: string | null = exportRootId
  ) => {
    try {
      setIsExporting(true)
      const rootParam = rootId || undefined
      const data = await exportData(rootParam)

      if ('error' in data) {
        setExportError(data.error)
        setTimeout(() => setExportError(null), 5000)
        return
      }

      if (format === 'csv') {
        const { exportToCsvZip } = await import('@/utils/csv')
        const zipBlob = await exportToCsvZip(data)
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `giapha-export-${formatIsoDay()}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      let content = ''
      let type = ''
      let extension = ''

      if (format === 'json') {
        content = JSON.stringify(data, null, 2)
        type = 'application/json'
        extension = 'json'
      } else {
        const { exportToGedcom } = await import('@/utils/gedcom')
        content = exportToGedcom(data)
        type = 'text/plain'
        extension = 'ged'
      }

      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `giapha-export-${formatIsoDay()}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: unknown) {
      setExportError(
        error instanceof Error ? error.message : t('downloadFailed')
      )
      setTimeout(() => setExportError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  const resetFile = () => {
    setShowConfirm(false)
    setImportMode('replace')
    setSelectedFile(null)
    setParsedBackup(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fail = (message: string) => {
      setImportStatus({ type: 'error', message })
      resetFile()
    }

    if (file.size > 25 * 1024 * 1024) return fail(t('fileTooLarge'))
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.csv')) return fail(t('csvRestoreZipOnly'))
    if (
      !fileName.endsWith('.json') &&
      !fileName.endsWith('.ged') &&
      !fileName.endsWith('.zip')
    ) {
      return fail(t('invalidRestoreFile'))
    }

    // Read the file now, so a broken one is reported before the destructive
    // confirmation and the confirmation can say what the file holds.
    setImportStatus(null)
    setIsReadingFile(true)
    try {
      const { payload, warning, truncated, gedcom } = await readRestoreFile(
        file,
        { surnameFirst, unnamedName: t('gedcomUnnamedPerson') }
      )
      const summary = summarizeBackup(payload)
      if (!summary) return fail(t('invalidBackupFile'))
      const invalid = validateImportPayload(payload, t)
      if (invalid) return fail(invalid)
      if (restorePayloadTooLarge(payload, restoreMaxBytes)) {
        return fail(t('restoreTooLargeForHost'))
      }
      setSelectedFile(file)
      setParsedBackup({ payload, summary, warning, truncated, gedcom })
      setShowConfirm(true)
    } catch (error: unknown) {
      fail(
        error instanceof BackupParseError
          ? t('restoreFileUnreadable')
          : error instanceof CsvZipInvalidError
            ? t('csvZipInvalid')
            : error instanceof CsvParseError
              ? t('csvParseError', {
                  file: error.file,
                  line: error.line,
                  problem: t(CSV_PROBLEM_MESSAGES[error.problem])
                })
              : error instanceof Error && error.message
                ? error.message
                : t('restoreFailed')
      )
    } finally {
      setIsReadingFile(false)
    }
  }

  // Reads the chosen GEDCOM again with the other name order.
  const handleSurnameFirstChange = async (value: boolean) => {
    if (!selectedFile || !parsedBackup) return
    setSurnameFirst(value)
    setIsReadingFile(true)
    try {
      const { payload } = await readRestoreFile(selectedFile, {
        surnameFirst: value,
        unnamedName: t('gedcomUnnamedPerson')
      })
      setParsedBackup({ ...parsedBackup, payload })
    } catch {
      setImportStatus({ type: 'error', message: t('restoreFileUnreadable') })
      resetFile()
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!selectedFile || !parsedBackup) return

    try {
      setIsImporting(true)
      setImportStatus(null)

      const payload = parsedBackup.payload
      const append = importMode === 'append'

      const result = await (append ? appendImportData : importData)({
        version: payload.version,
        persons: payload.persons,
        relationships: payload.relationships,
        person_details_private: payload.person_details_private,
        custom_events: payload.custom_events
      })

      if ('error' in result) {
        setImportStatus({
          type: 'error',
          message: result.error
        })
        resetFile()
        return
      }

      memberSearchCache.clear()
      const counts = {
        persons: result.imported?.persons || 0,
        relationships: result.imported?.relationships || 0
      }
      setImportStatus({
        type: 'success',
        message: [
          t(append ? 'appendSuccess' : 'restoreSuccess', counts),
          'warning' in result ? result.warning : undefined
        ]
          .filter(Boolean)
          .join(' '),
        appended: append
      })
      resetFile()
    } catch (error: unknown) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : t('restoreFailed')
      })
      resetFile()
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Export Card */}
        <DataCard
          icon={<Download className='size-6' />}
          title={t('backupData')}
          description={
            <>
              {t('backupDataDescription')}
              <span className='mt-1 block text-xs text-stone-500'>
                {t('backupPhotosNote')}
              </span>
            </>
          }
          accent='amber'>
          <div className='mb-4'>
            {personsError ? (
              <div
                role='alert'
                className='flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600'>
                <AlertTriangle className='h-5 w-5 shrink-0 text-red-500' />
                <span>
                  {t('exportPersonsLoadError', { error: personsError })}
                </span>
              </div>
            ) : (
              <PersonSelector
                persons={persons}
                selectedId={exportRootId}
                onSelect={setExportRootId}
                label={t('exportRoot')}
                className='w-full sm:w-80'
                showAllOption={true}
                allOptionLabel={t('allData')}
              />
            )}
          </div>

          <ExportActions
            isExporting={isExporting}
            onExport={(format) => handleExport(format)}
          />

          <AnimatePresence>
            {exportError && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='mt-4'>
                <div
                  role='alert'
                  className='flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600'>
                  <AlertTriangle className='h-5 w-5 shrink-0 text-red-500' />
                  <span>{exportError}</span>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </DataCard>

        {/* Import Card */}
        <DataCard
          icon={<Upload className='size-6' />}
          title={t('restoreData')}
          description={
            <>
              {t('restoreDataDescription')}{' '}
              <span className='font-medium text-rose-600'>
                {t('restoreWarning')}
              </span>
            </>
          }
          accent='rose'>
          <input
            type='file'
            accept='.json,.ged,.zip,.csv'
            className='hidden'
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isReadingFile}
            className='btn w-full'>
            {isImporting || isReadingFile
              ? t('processingData')
              : t('chooseRestoreFile')}
          </button>
        </DataCard>
      </div>

      {showConfirm && parsedBackup && (
        <ImportConfirmModal
          fileName={selectedFile?.name || ''}
          summary={parsedBackup.summary}
          mode={importMode}
          onModeChange={setImportMode}
          warning={parsedBackup.warning}
          truncated={parsedBackup.truncated}
          gedcom={parsedBackup.gedcom}
          surnameFirst={surnameFirst}
          onSurnameFirstChange={handleSurnameFirstChange}
          isReadingFile={isReadingFile}
          locale={locale}
          isImporting={isImporting}
          isDownloading={isExporting}
          downloadError={exportError}
          onDownloadBackup={() => handleExport('json', null)}
          onCancel={resetFile}
          onConfirm={handleConfirmImport}
        />
      )}

      <ImportStatusMessage
        status={importStatus}
        action={
          importStatus?.appended ? (
            <button
              type='button'
              onClick={() => requestDuplicateScan()}
              className='btn whitespace-nowrap'>
              {t('scanDuplicatesNow')}
            </button>
          ) : null
        }
      />
    </div>
  )
}
