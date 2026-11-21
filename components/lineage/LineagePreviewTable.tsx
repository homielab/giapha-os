'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { ComputedUpdate } from '@/utils/lineageCompute'

interface LineagePreviewTableProps {
  updates: ComputedUpdate[]
  changedCount: number
}

export default function LineagePreviewTable({
  updates,
  changedCount
}: LineagePreviewTableProps) {
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const displayedRows = showAll ? updates : updates.slice(0, 20)

  return (
    <div>
      <div className='mb-3 flex items-center justify-between'>
        <p className='text-sm font-medium text-stone-500'>
          <span className='font-medium text-stone-800'>{changedCount}</span>{' '}
          {t('membersWillUpdate')} /&nbsp;
          <span className='font-medium text-stone-800'>
            {updates.length}
          </span>{' '}
          {t('total')}
        </p>
      </div>

      <div className='overflow-hidden rounded-2xl border border-stone-200/80'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-stone-200/80 bg-stone-50'>
                <th className='px-4 py-3 text-left font-medium whitespace-nowrap text-stone-600'>
                  {t('name')}
                </th>
                <th className='px-4 py-3 text-center font-medium whitespace-nowrap text-stone-600'>
                  {t('generationColumn')}
                </th>
                <th className='px-4 py-3 text-center font-medium whitespace-nowrap text-stone-600'>
                  {t('orderColumn')}
                </th>
                <th className='px-4 py-3 text-center font-medium whitespace-nowrap text-stone-600'>
                  {t('inLawColumn')}
                </th>
                <th className='px-4 py-3 text-center font-medium text-stone-600'>
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-stone-100 transition-colors last:border-0 ${
                    u.changed ? 'bg-amber-50/40' : ''
                  } ${i % 2 === 0 && !u.changed ? 'bg-white' : !u.changed ? 'bg-stone-50/30' : ''}`}>
                  <td className='px-4 py-3 font-medium text-stone-800'>
                    {u.full_name}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <span className='text-stone-500'>
                      {u.old_generation ?? '—'}
                    </span>
                    {u.old_generation !== u.new_generation && (
                      <>
                        <span className='mx-2 text-stone-300'>→</span>
                        <span className='font-medium text-amber-700'>
                          {u.new_generation ?? '—'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <span className='text-stone-500'>
                      {u.old_birth_order ?? '—'}
                    </span>
                    {u.old_birth_order !== u.new_birth_order && (
                      <>
                        <span className='mx-2 text-stone-300'>→</span>
                        <span className='font-medium text-amber-700'>
                          {u.new_birth_order ?? '—'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <span
                      className={
                        u.old_is_in_law !== u.new_is_in_law
                          ? 'text-stone-500'
                          : ''
                      }>
                      {u.old_is_in_law
                        ? u.gender === 'male'
                          ? t('inLawMale')
                          : t('inLawFemale')
                        : '—'}
                    </span>
                    {u.old_is_in_law !== u.new_is_in_law && (
                      <>
                        <span className='mx-2 text-stone-300'>→</span>
                        <span className='font-medium text-amber-700'>
                          {u.new_is_in_law
                            ? u.gender === 'male'
                              ? t('inLawMale')
                              : t('inLawFemale')
                            : t('bloodline')}
                        </span>
                      </>
                    )}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    {u.changed ? (
                      <span className='inline-block rounded-full border border-amber-200/60 bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700'>
                        {t('updated')}
                      </span>
                    ) : (
                      <span className='inline-block rounded-full border border-stone-200/60 bg-stone-100 px-2 py-0.5 text-sm font-medium text-stone-600'>
                        {t('unchanged')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {updates.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className='mx-auto mt-3 flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-amber-700'>
          {showAll ? (
            <>
              <ChevronUp className='size-4' /> {t('collapse')}
            </>
          ) : (
            <>
              <ChevronDown className='size-4' />{' '}
              {t('showAllMembers', { count: updates.length })}
            </>
          )}
        </button>
      )}
    </div>
  )
}
