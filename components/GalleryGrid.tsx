'use client'

import dayjs from 'dayjs'
import { CalendarDays, Clock, Maximize2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  revealOnInteract,
  slideInOnInteract
} from '@/components/galleryCardReveal'
import GalleryImage from '@/components/GalleryImage'
import GalleryLightbox from '@/components/GalleryLightbox'
import { useI18n } from '@/lib/i18n/useI18n'
import { GalleryItem } from '@/types'
import { deleteGalleryItem, GalleryItemNotDeletedError } from '@/utils/gallery'
import { idAfterDelete, stepIndex } from '@/utils/galleryNav'
import { createClient } from '@/utils/supabase/client'

interface GalleryGridProps {
  items: GalleryItem[]
  isAdmin?: boolean
  viewMode?: 'grid' | 'timeline'
  onEdit?: (item: GalleryItem) => void
  onDeleteSuccess?: (id: string) => void
}

export default function GalleryGrid({
  items,
  isAdmin,
  viewMode = 'timeline',
  onEdit,
  onDeleteSuccess
}: GalleryGridProps) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const setSelectedItem = (item: GalleryItem | null) =>
    setSelectedId(item ? item.id : null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Group items by year/month for timeline mode
  const timelineGroups = useMemo(() => {
    if (viewMode !== 'timeline') return []

    const datedItems: { item: GalleryItem; year: number; month: number }[] = []
    const undatedItems: GalleryItem[] = []

    items.forEach((item) => {
      if (item.event_date) {
        const d = dayjs(item.event_date)
        datedItems.push({
          item,
          year: d.year(),
          month: d.month() + 1
        })
      } else {
        undatedItems.push(item)
      }
    })

    // Sort dated items descending
    datedItems.sort((a, b) => {
      const timeA = dayjs(a.item.event_date).valueOf()
      const timeB = dayjs(b.item.event_date).valueOf()
      return timeB - timeA
    })

    // Group by Year
    const groupsMap = new Map<number, GalleryItem[]>()
    datedItems.forEach(({ item, year }) => {
      if (!groupsMap.has(year)) {
        groupsMap.set(year, [])
      }
      groupsMap.get(year)!.push(item)
    })

    const groups = Array.from(groupsMap.entries()).map(
      ([year, groupItems]) => ({
        year: String(year),
        items: groupItems
      })
    )

    if (undatedItems.length > 0) {
      groups.push({
        year: t('otherMemories'),
        items: undatedItems
      })
    }

    return groups
  }, [items, viewMode, t])

  // Lightbox order follows what is on screen
  const orderedItems = useMemo(
    () =>
      viewMode === 'timeline'
        ? timelineGroups.flatMap((group) => group.items)
        : items,
    [items, viewMode, timelineGroups]
  )
  const selectedIndex = orderedItems.findIndex((i) => i.id === selectedId)
  const selectedItem = selectedIndex >= 0 ? orderedItems[selectedIndex] : null
  const step = (dir: -1 | 1) => {
    const next = stepIndex(selectedIndex, orderedItems.length, dir)
    if (next !== null) setSelectedId(orderedItems[next].id)
  }

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm(t('deleteImageConfirm'))) return
    setIsDeleting(true)
    try {
      await deleteGalleryItem(createClient(), item)

      setSelectedId(
        idAfterDelete(
          orderedItems.map((i) => i.id),
          orderedItems.findIndex((i) => i.id === item.id)
        )
      )
      if (onDeleteSuccess) onDeleteSuccess(item.id)
    } catch (err) {
      console.error('Error deleting gallery item', err)
      alert(
        err instanceof GalleryItemNotDeletedError
          ? t('deleteImageNotAllowed')
          : t('deleteImageError')
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-3xl border border-stone-100 bg-white px-4 py-20 text-center'>
        <div className='mb-4 flex size-20 items-center justify-center rounded-full border border-stone-100 bg-stone-50'>
          <Maximize2 className='size-8 text-stone-300' />
        </div>
        <h3 className='mb-2 text-xl font-semibold text-stone-700'>
          {t('noImages')}
        </h3>
        <p className='max-w-sm text-stone-500'>{t('noImagesHint')}</p>
      </div>
    )
  }

  return (
    <>
      {viewMode === 'grid' ? (
        <div className='columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4'>
          {items.map((item) => (
            <div
              key={item.id}
              className='group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-stone-100 shadow-sm transition duration-500 hover:shadow-xl'
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedItem(item)
                }
              }}
              onClick={() => setSelectedItem(item)}>
              {/* Image */}
              <GalleryImage
                item={item}
                width={800}
                height={600}
                className='w-full object-cover transition-transform duration-700 group-hover:scale-105'
                loading='lazy'
              />

              {/* Overlay */}
              <div
                className={`absolute inset-0 flex flex-col justify-end bg-linear-to-t from-stone-900/80 via-stone-900/20 to-transparent p-5 opacity-0 transition-opacity duration-300 ${revealOnInteract}`}>
                <div
                  className={`translate-y-4 transform transition-transform duration-300 ${slideInOnInteract}`}>
                  <h3 className='mb-1 line-clamp-2 text-lg leading-tight font-semibold text-white'>
                    {item.title}
                  </h3>
                  {item.event_date && (
                    <p className='flex items-center gap-1.5 text-sm font-medium text-stone-300'>
                      <CalendarDays className='size-3.5' />
                      {dayjs(item.event_date).format('DD/MM/YYYY')}
                    </p>
                  )}
                </div>
              </div>

              {/* Top Right Icon */}
              <div
                className={`absolute top-4 right-4 opacity-0 transition-opacity delay-100 duration-300 ${revealOnInteract}`}>
                <div className='rounded-full bg-white/20 p-2 text-white backdrop-blur-md'>
                  <Maximize2 className='size-4' />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className='relative space-y-12 pl-4 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-linear-to-b before:from-amber-500 before:via-stone-300 before:to-stone-200 sm:pl-8 sm:before:left-7'>
          {timelineGroups.map((group) => (
            <div key={group.year} className='relative'>
              {/* Timeline Header Badge */}
              <div className='relative mb-6 flex items-center gap-3'>
                <div className='absolute -left-7 z-10 flex size-6 items-center justify-center rounded-full border-4 border-stone-50 bg-amber-600 sm:-left-11 sm:size-7'>
                  <Clock className='size-3 text-white' />
                </div>
                <h2 className='inline-block bg-stone-50/90 pr-4 font-serif text-2xl font-semibold text-stone-900 backdrop-blur-xs sm:text-3xl'>
                  {group.year}
                </h2>
              </div>

              {/* Items under this year */}
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedItem(item)
                      }
                    }}
                    className='group flex cursor-pointer flex-col justify-between rounded-2xl border border-stone-200/80 bg-white/80 p-4 backdrop-blur-xl transition-colors duration-300 hover:-translate-y-1'>
                    <div>
                      <div className='relative mb-4 aspect-16/10 overflow-hidden rounded-xl bg-stone-100'>
                        <GalleryImage
                          item={item}
                          width={600}
                          height={400}
                          className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                          loading='lazy'
                        />
                        <div
                          className={`absolute top-2 right-2 rounded-full bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-md transition-opacity ${revealOnInteract}`}>
                          <Maximize2 className='size-3.5' />
                        </div>
                      </div>

                      {item.event_date && (
                        <span className='mb-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800'>
                          <CalendarDays className='size-3' />
                          {dayjs(item.event_date).format('DD/MM/YYYY')}
                        </span>
                      )}

                      <h3 className='line-clamp-2 text-lg leading-snug font-semibold text-stone-900 transition-colors group-hover:text-amber-700'>
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className='mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-500'>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <GalleryLightbox
          item={selectedItem}
          isAdmin={isAdmin}
          isDeleting={isDeleting}
          onClose={() => setSelectedItem(null)}
          onEdit={onEdit}
          onDelete={handleDelete}
          position={selectedIndex + 1}
          total={orderedItems.length}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </>
  )
}
