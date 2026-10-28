'use client'

import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'

import BaseToolbar, { type BaseToolbarProps } from './BaseToolbar'

interface MindmapToolbarProps extends BaseToolbarProps {
  setExpandSignal: (val: { type: 'expand' | 'collapse'; ts: number }) => void
}

export function MindmapExpandControls({
  setExpandSignal
}: Pick<MindmapToolbarProps, 'setExpandSignal'>) {
  const { t } = useI18n()
  const collapseLabel = `${t('collapse')} ${t('all')}`
  const expandLabel = `${t('expand')} ${t('all')}`

  return (
    <div className='flex h-10 items-center overflow-hidden rounded-full border border-stone-200/60 bg-white/80 backdrop-blur-md transition-opacity'>
      <button
        type='button'
        onClick={() => setExpandSignal({ type: 'collapse', ts: Date.now() })}
        className='flex h-full items-center gap-1.5 px-3 font-medium text-stone-600 transition-colors hover:bg-stone-100/50 md:px-4'
        aria-label={collapseLabel}
        title={collapseLabel}>
        <ChevronsDownUp className='size-4' aria-hidden='true' />
        <span className='hidden text-sm sm:inline sm:text-sm'>
          {t('collapse')}
        </span>
      </button>
      <button
        type='button'
        onClick={() => setExpandSignal({ type: 'expand', ts: Date.now() })}
        className='flex h-full items-center gap-1.5 border-r border-stone-200/50 px-3 font-medium text-stone-600 transition-colors hover:bg-stone-100/50 md:px-4'
        aria-label={expandLabel}
        title={expandLabel}>
        <ChevronsUpDown className='size-4' aria-hidden='true' />
        <span className='hidden text-sm sm:inline sm:text-sm'>
          {t('expand')}
        </span>
      </button>
    </div>
  )
}

export default function MindmapToolbar({
  setExpandSignal,
  ...baseProps
}: MindmapToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      <MindmapExpandControls setExpandSignal={setExpandSignal} />
    </BaseToolbar>
  )
}
