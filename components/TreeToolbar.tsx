'use client'

import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'

import BaseToolbar, { type BaseToolbarProps } from './BaseToolbar'

interface TreeToolbarProps extends BaseToolbarProps {
  scale: number
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleResetZoom: () => void
  handleCenter: () => void
}

type TreeToolbarControlsProps = Pick<
  TreeToolbarProps,
  | 'scale'
  | 'handleZoomIn'
  | 'handleZoomOut'
  | 'handleResetZoom'
  | 'handleCenter'
>

export function TreeToolbarControls({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleCenter
}: TreeToolbarControlsProps) {
  const { t } = useI18n()

  return (
    <>
      {/* Zoom Controls */}
      <div className='flex h-10 items-center overflow-hidden rounded-full border border-stone-200/60 bg-white/80 backdrop-blur-md transition-opacity'>
        <button
          type='button'
          onClick={handleZoomOut}
          className='h-full px-3 text-stone-600 transition-colors hover:bg-stone-100/50 disabled:opacity-50'
          aria-label={t('zoomOut')}
          title={t('zoomOut')}
          disabled={scale <= 0.3}>
          <ZoomOut className='size-4' aria-hidden='true' />
        </button>
        <button
          type='button'
          onClick={handleResetZoom}
          className='h-full min-w-12.5 border-x border-stone-200/50 px-2 text-center text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100/50'
          title={t('resetZoom')}>
          {Math.round(scale * 100)}%
        </button>
        <button
          type='button'
          onClick={handleZoomIn}
          className='h-full px-3 text-stone-600 transition-colors hover:bg-stone-100/50 disabled:opacity-50'
          aria-label={t('zoomIn')}
          title={t('zoomIn')}
          disabled={scale >= 2}>
          <ZoomIn className='size-4' aria-hidden='true' />
        </button>
      </div>

      {/* Center Button */}
      <button
        type='button'
        onClick={handleCenter}
        className='flex size-10 items-center justify-center rounded-full border border-stone-200/60 bg-white/80 text-stone-600 backdrop-blur-md transition-colors hover:bg-white hover:text-stone-900'
        aria-label={t('centerTree')}
        title={t('centerTree')}>
        <Crosshair className='size-4' aria-hidden='true' />
      </button>
    </>
  )
}

export default function TreeToolbar({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleCenter,
  ...baseProps
}: TreeToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      <TreeToolbarControls
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        handleCenter={handleCenter}
      />
    </BaseToolbar>
  )
}
