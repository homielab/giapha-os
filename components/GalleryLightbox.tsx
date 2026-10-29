'use client'

import dayjs from 'dayjs'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useId } from 'react'

import GalleryImage from '@/components/GalleryImage'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import { GalleryItem } from '@/types'

interface GalleryLightboxProps {
  item: GalleryItem
  isAdmin?: boolean
  isDeleting: boolean
  onClose: () => void
  onEdit?: (item: GalleryItem) => void
  onDelete: (item: GalleryItem) => void
  /** 1-based position of `item` among `total` browsable items. */
  position?: number
  total?: number
  onPrev?: () => void
  onNext?: () => void
}

export default function GalleryLightbox({
  item,
  isAdmin,
  isDeleting,
  onClose,
  onEdit,
  onDelete,
  position = 1,
  total = 1,
  onPrev,
  onNext
}: GalleryLightboxProps) {
  const { t } = useI18n()
  const titleId = useId()
  const dialogRef = useModalA11y(onClose)
  const hasPrev = !!onPrev && position > 1
  const hasNext = !!onNext && position < total
  const navButton =
    'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white/80 transition-colors hover:bg-black/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-30'
  return (
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
        if (e.key === 'ArrowLeft' && hasPrev) {
          e.preventDefault()
          onPrev?.()
        } else if (e.key === 'ArrowRight' && hasNext) {
          e.preventDefault()
          onNext?.()
        }
      }}
      className='animate-in fade-in fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm duration-200 outline-none'>
      <button
        onClick={onClose}
        aria-label={t('close')}
        className='absolute top-4 right-4 z-10 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:top-8 sm:right-8'>
        <X className='size-6' />
      </button>

      <div className='flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-stone-950 shadow-2xl lg:flex-row'>
        {/* Image Section */}
        <div className='relative flex min-h-[50vh] flex-1 items-center justify-center bg-black/50 p-4 lg:min-h-0'>
          <GalleryImage
            item={item}
            width={1200}
            height={800}
            className='max-h-[80vh] max-w-full rounded-lg object-contain'
          />
          {total > 1 && (
            <>
              <button
                type='button'
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label={t('galleryPrevImage')}
                className={`${navButton} left-3`}>
                <ChevronLeft className='size-6' />
              </button>
              <button
                type='button'
                onClick={onNext}
                disabled={!hasNext}
                aria-label={t('galleryNextImage')}
                className={`${navButton} right-3`}>
                <ChevronRight className='size-6' />
              </button>
              <p
                aria-live='polite'
                className='absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white tabular-nums'>
                {t('galleryImagePosition', { position, total })}
              </p>
            </>
          )}
        </div>

        {/* Content Section */}
        <div className='flex max-h-[40vh] w-full flex-col overflow-y-auto bg-white lg:max-h-none lg:w-96'>
          <div className='flex-1 p-6 sm:p-8'>
            <h2
              id={titleId}
              className='mb-4 text-2xl leading-tight font-semibold text-stone-800'>
              {item.title}
            </h2>

            {item.event_date && (
              <div className='mb-6 flex items-center gap-2 border-b border-stone-100 pb-6 font-medium text-stone-500'>
                <CalendarDays className='size-4' />
                <span>{dayjs(item.event_date).format('DD/MM/YYYY')}</span>
              </div>
            )}

            {item.description ? (
              <div className='prose prose-stone text-stone-600'>
                <p className='leading-relaxed whitespace-pre-wrap'>
                  {item.description}
                </p>
              </div>
            ) : (
              <p className='text-stone-400 italic'>{t('noDescription')}</p>
            )}
          </div>

          <div className='flex items-center justify-between border-t border-stone-100 bg-stone-50 p-6 text-sm font-medium text-stone-400'>
            <span>
              {t('addedOn')} {dayjs(item.created_at).format('DD/MM/YYYY')}
            </span>

            {isAdmin && (
              <div className='flex gap-2'>
                <button
                  onClick={() => {
                    onClose()
                    if (onEdit) onEdit(item)
                  }}
                  className='rounded-lg bg-stone-100/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-200 hover:text-stone-900'>
                  {t('edit')}
                </button>
                <button
                  onClick={() => onDelete(item)}
                  disabled={isDeleting}
                  className='rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50'>
                  {isDeleting ? t('deleting') : t('delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
