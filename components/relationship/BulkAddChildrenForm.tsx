'use client'

import {
  BulkChildRow,
  emptyBulkChildRow,
  EnrichedRelationship
} from '@/components/relationship/relationshipTypes'
import { useI18n } from '@/lib/i18n/useI18n'
import { MAX_NAME } from '@/utils/limits'

interface BulkAddChildrenFormProps {
  spouseOptions: EnrichedRelationship[]
  bulkChildren: BulkChildRow[]
  onBulkChildrenChange: (rows: BulkChildRow[]) => void
  selectedSpouseId: string
  onSpouseChange: (value: string) => void
  processing: boolean
  onSave: () => void
  onCancel: () => void
}

export default function BulkAddChildrenForm({
  spouseOptions,
  bulkChildren,
  onBulkChildrenChange,
  selectedSpouseId,
  onSpouseChange,
  processing,
  onSave,
  onCancel
}: BulkAddChildrenFormProps) {
  const { t } = useI18n()

  const updateRow = (index: number, patch: Partial<BulkChildRow>) => {
    const newBulk = bulkChildren.map((row, i) =>
      i === index ? { ...row, ...patch } : row
    )
    onBulkChildrenChange(newBulk)
  }

  const removeRow = (index: number) => {
    let newBulk = bulkChildren.filter((_, i) => i !== index)
    if (newBulk.length === 0) {
      newBulk = [emptyBulkChildRow()]
    }
    onBulkChildrenChange(newBulk)
  }

  const addRow = () => {
    onBulkChildrenChange([
      ...bulkChildren,
      emptyBulkChildRow(String(bulkChildren.length + 1))
    ])
  }

  return (
    <div className='mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5'>
      <h4 className='mb-3 text-base font-semibold text-sky-800'>
        {t('addBulkChildren')}
      </h4>

      <div className='space-y-4'>
        <div>
          <label
            htmlFor='bulk-spouse'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('otherParent')}
          </label>
          <select
            id='bulk-spouse'
            name='bulk-spouse'
            value={selectedSpouseId}
            onChange={(e) => onSpouseChange(e.target.value)}
            className='block w-full max-w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 transition-colors focus:border-sky-500 focus:ring-sky-500 sm:p-2.5'>
            <option value='unknown'>{t('unknownOtherParent')}</option>
            {spouseOptions.map((rel) => (
              <option key={rel.id} value={rel.targetPerson.id}>
                {rel.targetPerson.full_name} {rel.note ? `(${rel.note})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-3'>
          <span className='mb-1 block text-sm font-medium text-stone-600'>
            {t('childrenList')}
          </span>
          {bulkChildren.map((child, index) => (
            <div
              key={child.id}
              className='rounded-xl border border-stone-200/80 bg-white p-3 sm:p-4'>
              {/* Header: number + remove */}
              <div className='mb-2.5 flex items-center justify-between'>
                <span className='rounded-md bg-sky-50 px-2 py-0.5 text-sm font-medium text-sky-600'>
                  {t('nthChild', { count: index + 1 })}
                </span>
                <button
                  onClick={() => removeRow(index)}
                  className='rounded-lg p-1.5 text-sm text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500'
                  title={t('remove')}>
                  ✕
                </button>
              </div>
              {/* Fields */}
              <div className='flex flex-wrap gap-2 sm:flex-nowrap'>
                <input
                  id={`child-birth-order-${child.id}`}
                  name={`child-birth-order-${child.id}`}
                  type='number'
                  aria-label={t('birthOrder')}
                  placeholder={t('birthOrderShort')}
                  min='1'
                  value={child.birthOrder}
                  onChange={(e) =>
                    updateRow(index, { birthOrder: e.target.value })
                  }
                  className='w-14 shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-1 py-2 text-center text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-sky-500 focus:ring-sky-500'
                />
                <input
                  id={`child-name-${child.id}`}
                  name={`child-name-${child.id}`}
                  type='text'
                  aria-label={t('childName')}
                  placeholder={t('requiredFullName')}
                  maxLength={MAX_NAME}
                  value={child.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  className='w-[calc(100%-4rem)] min-w-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-sky-500 focus:ring-sky-500 sm:w-auto sm:flex-1'
                />
                <select
                  id={`child-gender-${child.id}`}
                  name={`child-gender-${child.id}`}
                  aria-label={t('gender')}
                  value={child.gender}
                  onChange={(e) =>
                    updateRow(index, {
                      gender: e.target.value as 'male' | 'female' | 'other'
                    })
                  }
                  className='w-[calc(50%-0.25rem)] shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-2 py-2 text-sm text-stone-900 transition-colors focus:border-sky-500 focus:ring-sky-500 sm:w-24'>
                  <option value='male'>{t('male')}</option>
                  <option value='female'>{t('female')}</option>
                  <option value='other'>{t('otherGender')}</option>
                </select>
                <input
                  id={`child-birth-year-${child.id}`}
                  name={`child-birth-year-${child.id}`}
                  type='number'
                  aria-label={t('birthYear')}
                  placeholder={t('birthYear')}
                  value={child.birthYear}
                  onChange={(e) =>
                    updateRow(index, { birthYear: e.target.value })
                  }
                  className='w-[calc(50%-0.25rem)] shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-2 py-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-sky-500 focus:ring-sky-500 sm:w-24'
                />
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className='w-full rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 py-2.5 text-sm font-medium text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-50'>
            + {t('addRow')}
          </button>
        </div>

        <div className='flex gap-2 border-t border-stone-200 pt-4'>
          <button
            onClick={onSave}
            disabled={
              processing || bulkChildren.every((c) => c.name.trim() === '')
            }
            className='flex-1 rounded-md bg-sky-600 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50 sm:rounded-lg sm:py-2.5'>
            {processing ? t('saving') : t('saveAll')}
          </button>
          <button
            onClick={onCancel}
            className='rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 sm:rounded-lg sm:py-2.5'>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
