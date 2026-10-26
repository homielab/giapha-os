'use client'

import { useI18n } from '@/lib/i18n/useI18n'

interface RelationshipAddButtonsProps {
  onAddRelation: () => void
  onAddBulk: () => void
  onAddSpouse: () => void
}

export default function RelationshipAddButtons({
  onAddRelation,
  onAddBulk,
  onAddSpouse
}: RelationshipAddButtonsProps) {
  const { t } = useI18n()
  return (
    <div className='mt-4 flex flex-col gap-3 sm:flex-row print:hidden'>
      <button
        onClick={onAddRelation}
        className='flex-1 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 py-3 text-sm font-medium text-stone-500 transition-colors duration-200 hover:border-amber-400 hover:bg-stone-50 hover:text-amber-700 sm:rounded-2xl'>
        + {t('addRelationship')}
      </button>

      <button
        onClick={onAddBulk}
        className='flex-1 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 py-3 text-sm font-medium text-stone-500 transition-colors duration-200 hover:border-sky-400 hover:bg-stone-50 hover:text-sky-700 sm:rounded-2xl'>
        + {t('addChildren')}
      </button>

      <button
        onClick={onAddSpouse}
        className='flex-1 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 py-3 text-sm font-medium text-stone-500 transition-colors duration-200 hover:border-rose-400 hover:bg-stone-50 hover:text-rose-700 sm:rounded-2xl'>
        + {t('addSpouse')}
      </button>
    </div>
  )
}
