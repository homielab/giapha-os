'use client'

import { useI18n } from '@/lib/i18n/useI18n'
import type { MergeWarning } from '@/utils/mergePersons'

interface MergeWarningsProps {
  warnings: MergeWarning[]
  acknowledged: boolean
  onAcknowledgedChange: (acknowledged: boolean) => void
}

/**
 * What the merge would break in the tree, with the "I understand" box the
 * merge button waits for. Renders nothing without warnings.
 */
export default function MergeWarnings({
  warnings,
  acknowledged,
  onAcknowledgedChange
}: MergeWarningsProps) {
  const { t } = useI18n()
  if (warnings.length === 0) return null
  return (
    <div
      role='alert'
      className='mt-4 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
      <p className='font-semibold'>{t('mergeWarningsTitle')}</p>
      <ul className='list-disc pl-5'>
        {warnings.map((warning) => (
          <li key={warning}>{t(`mergeWarning_${warning}`)}</li>
        ))}
      </ul>
      <label className='flex cursor-pointer items-start gap-2 font-medium'>
        <input
          type='checkbox'
          className='mt-0.5'
          checked={acknowledged}
          onChange={(e) => onAcknowledgedChange(e.target.checked)}
        />
        {t('mergeWarningsAcknowledge')}
      </label>
    </div>
  )
}
