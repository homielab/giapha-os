'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { GalleryItem } from '@/types'
import {
  readGalleryView,
  subscribeGalleryView,
  writeGalleryView
} from '@/utils/galleryView'

import GalleryGrid from './GalleryGrid'
import GalleryViewSwitcher from './GalleryViewSwitcher'
import UploadModal from './modal/UploadModal'

export default function GalleryClient({
  items: pageItems,
  page,
  pageCount,
  total,
  isAdmin
}: {
  items: GalleryItem[]
  page: number
  pageCount: number
  total: number
  isAdmin: boolean
}) {
  // Hide deleted items right away; router.refresh() then brings the new page.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const items = pageItems.filter((item) => !deletedIds.has(item.id))
  const viewMode = useSyncExternalStore(
    subscribeGalleryView,
    readGalleryView,
    () => 'timeline' as const
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const router = useRouter()
  const { t } = useI18n()

  const handleUploadSuccess = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    // Refresh the server component to get new data
    router.refresh()
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setDeletedIds((prev) => new Set(prev).add(deletedId))
    router.refresh()
  }

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setEditingItem(null), 300) // clear after animation
  }

  return (
    <>
      <div className='mb-8 flex flex-col items-stretch justify-between gap-4 sm:mb-12 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-3'>
          <div>
            <h1 className='title'>{t('galleryTitle')}</h1>
            <p className='mt-2 text-sm text-stone-500 sm:text-sm'>
              {t('galleryDescription')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {/* View switcher */}
          <GalleryViewSwitcher value={viewMode} onChange={writeGalleryView} />

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className='btn-primary whitespace-nowrap'>
              <Plus className='size-5' />
              <span>{t('addImage')}</span>
            </button>
          )}
        </div>
      </div>

      <GalleryGrid
        items={items}
        isAdmin={isAdmin}
        viewMode={viewMode}
        onEdit={handleEdit}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {pageCount > 1 && (
        <nav
          aria-label={t('galleryPagination')}
          className='mt-10 flex items-center justify-center gap-3'>
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}`}
              className='btn-outline px-3 py-2.5'
              aria-label={t('previousPage')}>
              <ChevronLeft className='size-4' />
            </Link>
          ) : (
            <span
              aria-hidden='true'
              className='btn-outline pointer-events-none px-3 py-2.5 opacity-40'>
              <ChevronLeft className='size-4' />
            </span>
          )}
          <span className='text-sm text-stone-600'>
            {t('galleryPageStatus', { page, pageCount, total })}
          </span>
          {page < pageCount ? (
            <Link
              href={`?page=${page + 1}`}
              className='btn-outline px-3 py-2.5'
              aria-label={t('nextPage')}>
              <ChevronRight className='size-4' />
            </Link>
          ) : (
            <span
              aria-hidden='true'
              className='btn-outline pointer-events-none px-3 py-2.5 opacity-40'>
              <ChevronRight className='size-4' />
            </span>
          )}
        </nav>
      )}

      <UploadModal
        key={editingItem?.id || 'new'}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleUploadSuccess}
        initialData={editingItem}
      />
    </>
  )
}
