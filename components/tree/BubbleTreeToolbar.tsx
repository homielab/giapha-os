'use client'

import type { ZoomBehavior } from 'd3-zoom'
import { Maximize2, Minimize2, Minus, Plus, Scan } from 'lucide-react'
import { RefObject } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'

interface BubbleTreeToolbarProps {
  containerRef: RefObject<HTMLDivElement | null>
  zoomRef: RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>
  zoomLevel: number
  isFullscreen: boolean
  onZoomChange: (nextLevel: number) => void
  onResetZoom: () => void
  onToggleFullscreen: () => void
}

export default function BubbleTreeToolbar({
  zoomLevel,
  isFullscreen,
  onZoomChange,
  onResetZoom,
  onToggleFullscreen
}: BubbleTreeToolbarProps) {
  const { t } = useI18n()
  return (
    <div className='flex h-10 items-center gap-1 rounded-full border border-stone-200/60 bg-white/80 px-1'>
      <button
        type='button'
        onClick={() => onZoomChange(Math.max(0.1, zoomLevel - 0.1))}
        className='flex size-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none'
        aria-label={t('zoomOut')}
        title={t('zoomOut')}>
        <Minus className='size-4' />
      </button>
      <input
        type='range'
        min='0.1'
        max='4'
        step='0.1'
        value={zoomLevel}
        onChange={(event) => onZoomChange(Number(event.currentTarget.value))}
        className='h-1.5 w-20 cursor-pointer accent-amber-600 sm:w-28'
        aria-label={t('zoomLevel')}
        title={t('zoomLevel')}
      />
      <span className='w-10 text-center text-sm font-medium text-stone-500 tabular-nums'>
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        type='button'
        onClick={() => onZoomChange(Math.min(4, zoomLevel + 0.1))}
        className='flex size-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none'
        aria-label={t('zoomIn')}
        title={t('zoomIn')}>
        <Plus className='size-4' />
      </button>
      <div className='mx-0.5 h-5 w-px bg-stone-200' aria-hidden='true' />
      <button
        type='button'
        onClick={onResetZoom}
        className='flex size-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none'
        aria-label={t('resetZoomLevel')}
        title={t('resetZoomLevel')}>
        <Scan className='size-4' />
      </button>
      <div className='mx-0.5 h-5 w-px bg-stone-200' aria-hidden='true' />
      <button
        type='button'
        onClick={onToggleFullscreen}
        className='flex size-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none'
        aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
        aria-pressed={isFullscreen}
        title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}>
        {isFullscreen ? (
          <Minimize2 className='size-4' />
        ) : (
          <Maximize2 className='size-4' />
        )}
      </button>
    </div>
  )
}
