'use client'

import { useI18n } from '@/lib/i18n/useI18n'
import type { DateParts, LunarRecomputeRow } from '@/utils/lunarRecompute'

interface LunarRecomputeTableProps {
  rows: LunarRecomputeRow[]
  selected: Set<string>
  disabled: boolean
  onToggle: (id: string) => void
  onToggleAll: () => void
}

function formatDate({ day, month, year }: DateParts): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export default function LunarRecomputeTable({
  rows,
  selected,
  disabled,
  onToggle,
  onToggleAll
}: LunarRecomputeTableProps) {
  const { t } = useI18n()
  const allSelected = rows.length > 0 && selected.size === rows.length

  return (
    <div className='overflow-hidden rounded-2xl border border-stone-200/80'>
      <div className='max-h-96 overflow-auto'>
        <table className='w-full text-sm'>
          <thead className='sticky top-0 bg-stone-50'>
            <tr className='border-b border-stone-200/80'>
              <th className='w-10 px-4 py-3 text-left'>
                <input
                  type='checkbox'
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={disabled}
                  aria-label={t('lunarRecomputeSelectAll')}
                  className='size-4 rounded-md border-stone-300 text-amber-500 transition focus:ring-amber-500'
                />
              </th>
              <th className='px-4 py-3 text-left font-medium whitespace-nowrap text-stone-600'>
                {t('name')}
              </th>
              <th className='px-4 py-3 text-left font-medium whitespace-nowrap text-stone-600'>
                {t('lunarRecomputeSolar')}
              </th>
              <th className='px-4 py-3 text-left font-medium whitespace-nowrap text-stone-600'>
                {t('lunarRecomputeStored')}
              </th>
              <th className='px-4 py-3 text-left font-medium whitespace-nowrap text-stone-600'>
                {t('lunarRecomputeNew')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-stone-100 last:border-0 ${
                  selected.has(row.id) ? 'bg-amber-50/40' : 'bg-white'
                }`}>
                <td className='px-4 py-3'>
                  <input
                    type='checkbox'
                    checked={selected.has(row.id)}
                    onChange={() => onToggle(row.id)}
                    disabled={disabled}
                    aria-label={t('lunarRecomputeSelectRow', {
                      name: row.fullName
                    })}
                    className='size-4 rounded-md border-stone-300 text-amber-500 transition focus:ring-amber-500'
                  />
                </td>
                <td className='px-4 py-3 font-medium text-stone-800'>
                  {row.fullName}
                </td>
                <td className='px-4 py-3 whitespace-nowrap text-stone-600'>
                  {formatDate(row.solar)}
                </td>
                <td className='px-4 py-3 whitespace-nowrap text-stone-400'>
                  {formatDate(row.stored)}
                </td>
                <td className='px-4 py-3 font-medium whitespace-nowrap text-amber-700'>
                  {formatDate(row.recomputed)}
                  {row.recomputed.leap && ` (${t('lunarRecomputeLeap')})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
