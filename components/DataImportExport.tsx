'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { exportData, importData } from '@/app/actions/data'
import DataCard from '@/components/DataCard'
import ExportActions from '@/components/ExportActions'
import ImportConfirmModal from '@/components/ImportConfirmModal'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import { useAllPersons } from '@/hooks/useAllPersons'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

import PersonSelector from './PersonSelector'

export default function DataImportExport() {
  const { t } = useI18n()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error'
    message: string | undefined
  } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const persons = useAllPersons()
  const [exportRootId, setExportRootId] = useState<string | null>(null)

  const handleExport = async (format: 'json' | 'gedcom' | 'csv') => {
    try {
      setIsExporting(true)
      const rootParam = exportRootId || undefined
      const data = await exportData(rootParam)

      if ('error' in data) {
        setExportError(data.error)
        setTimeout(() => setExportError(null), 5000)
        return
      }

      if (format === 'csv') {
        const { exportToCsvZip } = await import('@/utils/csv')
        // @ts-expect-error: BackupPayload relationships type mismatch with Partial<Relationship>
        const zipBlob = await exportToCsvZip(data)
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `giapha-export-${new Date().toISOString().split('T')[0]}.zip`
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
      a.download = `giapha-export-${new Date().toISOString().split('T')[0]}.${extension}`
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setImportStatus({
          type: 'error',
          message: t('fileTooLarge')
        })
        return
      }
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.csv')) {
        setImportStatus({
          type: 'error',
          message: t('csvRestoreZipOnly')
        })
        return
      }

      if (
        !fileName.endsWith('.json') &&
        !fileName.endsWith('.ged') &&
        !fileName.endsWith('.zip')
      ) {
        setImportStatus({
          type: 'error',
          message: t('invalidRestoreFile')
        })
        return
      }
      setSelectedFile(file)
      setShowConfirm(true)
      setImportStatus(null)
    }
  }

  const handleConfirmImport = async () => {
    if (!selectedFile) return

    try {
      setIsImporting(true)
      setImportStatus(null)

      const fileText = await selectedFile.text()
      let payload

      if (selectedFile.name.toLowerCase().endsWith('.ged')) {
        const { parseGedcom } = await import('@/utils/gedcom')
        payload = parseGedcom(fileText)
      } else if (selectedFile.name.toLowerCase().endsWith('.zip')) {
        const { parseCsvZip } = await import('@/utils/csv')
        payload = await parseCsvZip(selectedFile)
      } else {
        payload = JSON.parse(fileText)
      }

      if (!payload.persons || !payload.relationships) {
        throw new Error(t('invalidBackupFile'))
      }

      const result = await importData({
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
        setShowConfirm(false)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setImportStatus({
        type: 'success',
        message: [
          t('restoreSuccess', {
            persons: result.imported?.persons || 0,
            relationships: result.imported?.relationships || 0
          }),
          result.warning
        ]
          .filter(Boolean)
          .join(' ')
      })
      setShowConfirm(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error: unknown) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : t('restoreFailed')
      })
      setShowConfirm(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
          description={t('backupDataDescription')}
          accent='amber'>
          <div className='mb-4'>
            <PersonSelector
              persons={persons}
              selectedId={exportRootId}
              onSelect={setExportRootId}
              label={t('exportRoot')}
              className='w-full sm:w-80'
              showAllOption={true}
              allOptionLabel={t('allData')}
            />
          </div>

          <ExportActions isExporting={isExporting} onExport={handleExport} />

          <AnimatePresence>
            {exportError && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='mt-4'>
                <div className='flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600'>
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
            disabled={isImporting}
            className='btn w-full'>
            {isImporting ? t('processingData') : t('chooseRestoreFile')}
          </button>
        </DataCard>
      </div>

      {showConfirm && (
        <ImportConfirmModal
          fileName={selectedFile?.name || ''}
          isImporting={isImporting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmImport}
        />
      )}

      <ImportStatusMessage status={importStatus} />
    </div>
  )
}
