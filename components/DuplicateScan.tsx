'use client'

import { CopyCheck } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import {
  scanPossibleDuplicates,
  type DuplicateScanResult
} from '@/app/actions/duplicateScan'
import type { MergeSummary } from '@/app/actions/mergePersons'
import DataCard from '@/components/DataCard'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import MergePersonsModal from '@/components/MergePersonsModal'
import { useI18n } from '@/lib/i18n/useI18n'
import { onDuplicateScanRequest } from '@/utils/duplicateScanTrigger'
import { deathYearOf } from '@/utils/memberSearch'

export default function DuplicateScan() {
  const { t } = useI18n()
  const [result, setResult] = useState<DuplicateScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergingIds, setMergingIds] = useState<string[] | null>(null)
  const [mergedNotice, setMergedNotice] = useState<string | null>(null)
  const scanButtonRef = useRef<HTMLButtonElement>(null)

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)
    setMergedNotice(null)
    try {
      const res = await scanPossibleDuplicates()
      if ('error' in res) {
        setResult(null)
        setError(res.error)
        return
      }
      setResult(res)
    } catch {
      setResult(null)
      setError(t('duplicateScanFailed'))
    } finally {
      setIsScanning(false)
    }
  }

  // "Scan for duplicates now" after adding a file to the tree.
  const onScanRequest = useEffectEvent(() => {
    const button = scanButtonRef.current
    button?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    button?.focus({ preventScroll: true })
    if (!isScanning) void handleScan()
  })
  useEffect(() => onDuplicateScanRequest(() => onScanRequest()), [])

  /** Drops the merged pair from the list; the keeper gets a fresh count on the next scan. */
  const handleMerged = (ids: string[], summary: MergeSummary) => {
    setMergingIds(null)
    setResult((current) =>
      current
        ? {
            ...current,
            groups: current.groups.filter(
              (group) => !group.members.some((m) => ids.includes(m.id))
            )
          }
        : current
    )
    setMergedNotice(
      t('mergeDone', {
        moved: summary.relationships_moved,
        dropped: summary.relationships_dropped,
        filled: summary.person_fields_filled + summary.details_fields_filled
      })
    )
  }

  const years = (birth: number | null, death: number | null) =>
    `${birth ?? '?'} – ${death ?? ''}`.trim()

  return (
    <DataCard
      icon={<CopyCheck className='size-6' />}
      title={t('duplicateScanTitle')}
      description={t('duplicateScanDescription')}
      accent='amber'>
      <button
        ref={scanButtonRef}
        onClick={handleScan}
        disabled={isScanning}
        className='btn w-full sm:w-auto'>
        {isScanning ? t('duplicateScanScanning') : t('duplicateScanRun')}
      </button>

      {error && (
        <div className='mt-4'>
          <ImportStatusMessage status={{ type: 'error', message: error }} />
        </div>
      )}

      {mergedNotice && (
        <div className='mt-4'>
          <ImportStatusMessage
            status={{ type: 'success', message: mergedNotice }}
          />
        </div>
      )}

      {result && (
        <div className='mt-4 space-y-3'>
          {result.groups.length === 0 ? (
            <p className='text-sm text-stone-500'>{t('duplicateScanNone')}</p>
          ) : (
            <>
              <p className='text-sm text-stone-500'>
                {t('duplicateScanFound', {
                  count: result.groups.length + result.remaining
                })}
                {result.remaining > 0 &&
                  ` ${t('duplicateScanLimited', {
                    shown: result.groups.length,
                    remaining: result.remaining
                  })}`}
              </p>
              <div className='max-h-96 space-y-3 overflow-auto'>
                {result.groups.map((group) => (
                  <div
                    key={group.members.map((m) => m.id).join('-')}
                    className='overflow-hidden rounded-2xl border border-stone-200/80'>
                    <div className='flex items-center justify-between border-b border-stone-200/80 bg-stone-50 px-4 py-2'>
                      <span className='text-xs font-medium text-stone-500'>
                        {t('duplicateScanGroup')}
                      </span>
                      <button
                        onClick={() =>
                          setMergingIds(group.members.map((m) => m.id))
                        }
                        className='text-sm font-medium text-amber-700 hover:underline'>
                        {t('mergeButton')}
                      </button>
                    </div>
                    <table className='w-full text-sm'>
                      <thead className='bg-stone-50'>
                        <tr className='border-b border-stone-200/80'>
                          <th className='px-4 py-2 text-left font-medium text-stone-600'>
                            {t('name')}
                          </th>
                          <th className='px-4 py-2 text-left font-medium whitespace-nowrap text-stone-600'>
                            {t('duplicateScanYears')}
                          </th>
                          <th className='px-4 py-2 text-left font-medium whitespace-nowrap text-stone-600'>
                            {t('duplicateScanRelationships')}
                          </th>
                          <th className='px-4 py-2' />
                        </tr>
                      </thead>
                      <tbody>
                        {group.members.map((member) => (
                          <tr
                            key={member.id}
                            className='border-b border-stone-100 bg-white last:border-0'>
                            <td className='px-4 py-2 font-medium text-stone-800'>
                              {member.full_name}
                            </td>
                            <td className='px-4 py-2 whitespace-nowrap text-stone-600'>
                              {years(member.birth_year, deathYearOf(member))}
                            </td>
                            <td className='px-4 py-2 text-stone-600'>
                              {member.relationshipCount}
                            </td>
                            <td className='px-4 py-2 text-right whitespace-nowrap'>
                              <Link
                                href={`/dashboard/members/${member.id}`}
                                target='_blank'
                                rel='noopener'
                                className='font-medium text-amber-700 hover:underline'>
                                {t('duplicateScanOpen')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {mergingIds && (
        <MergePersonsModal
          members={
            result?.groups
              .flatMap((group) => group.members)
              .filter((m) => mergingIds.includes(m.id)) ?? []
          }
          onMerged={handleMerged}
          onCancel={() => setMergingIds(null)}
        />
      )}
    </DataCard>
  )
}
