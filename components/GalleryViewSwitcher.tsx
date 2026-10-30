'use client'

import { Clock, LayoutGrid } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'
import { toggleButtonProps } from '@/utils/a11y'
import type { GalleryView } from '@/utils/galleryView'

export default function GalleryViewSwitcher({
  value,
  onChange
}: {
  /** null until hydrated: no button shows as pressed. */
  value: GalleryView | null
  onChange: (view: GalleryView) => void
}) {
  const { t } = useI18n()
  const options = [
    { view: 'timeline' as const, label: t('timelineView'), Icon: Clock },
    { view: 'grid' as const, label: t('gridView'), Icon: LayoutGrid }
  ]
  return (
    <div className='flex items-center rounded-xl border border-stone-200/60 bg-stone-100 p-1'>
      {options.map(({ view, label, Icon }) => (
        <button
          key={view}
          type='button'
          onClick={() => onChange(view)}
          {...toggleButtonProps(label, value === view)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            value === view
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
          title={label}>
          <Icon className='size-4' aria-hidden='true' />
          <span className='xs:inline hidden'>{label}</span>
        </button>
      ))}
    </div>
  )
}
