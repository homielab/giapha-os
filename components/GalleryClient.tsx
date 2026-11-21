'use client'

import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useGalleryView } from '@/hooks/useGalleryView'
import { useI18n } from '@/lib/i18n/useI18n'
import { GalleryItem, Person } from '@/types'
import { GALLERY_RESIGN_AFTER_MS, shouldResignGallery } from '@/utils/gallery'
import { galleryHref } from '@/utils/galleryTags'
import { writeGalleryView } from '@/utils/galleryView'

import GalleryGrid from './GalleryGrid'
import { GalleryImageErrorContext } from './GalleryImage'
import GalleryViewSwitcher from './GalleryViewSwitcher'
import UploadModal from './modal/UploadModal'
import PersonSelector from './PersonSelector'

export default function GalleryClient({
  items: pageItems,
  page,
  pageCount,
  total,
  isAdmin,
  persons,
  memberId,
  photoId
}: {
  items: GalleryItem[]
  page: number
  pageCount: number
  total: number
  isAdmin: boolean
  persons: Person[]
  /** Member the gallery is filtered by (`?member=`), if any. */
  memberId: string | null
  /** Photo to open at first (`?photo=`), if any. */
  photoId: string | null
}) {
  // Hide deleted items right away; router.refresh() then brings the new page.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const items = pageItems.filter((item) => !deletedIds.has(item.id))
  const viewMode = useGalleryView()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const router = useRouter()
  const { t } = useI18n()
  const member = memberId ? persons.find((p) => p.id === memberId) : undefined

  // Signed image URLs last 1 h. A new `pageItems` means the server just signed
  // them; refresh once before they expire or when an image fails to load.
  const signing = useRef({ signedAt: 0, resigned: false })
  useEffect(() => {
    signing.current = { signedAt: Date.now(), resigned: false }
  }, [pageItems])

  const resign = useCallback(
    (imageFailed: boolean) => {
      const { signedAt, resigned } = signing.current
      if (
        !shouldResignGallery({
          signedAt,
          now: Date.now(),
          alreadyResigned: resigned,
          imageFailed
        })
      )
        return
      signing.current.resigned = true
      router.refresh()
    },
    [router]
  )
  const handleImageError = useCallback(() => resign(true), [resign])

  useEffect(() => {
    const timer = setTimeout(() => resign(false), GALLERY_RESIGN_AFTER_MS)
    return () => clearTimeout(timer)
  }, [pageItems, resign])

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
    <GalleryImageErrorContext.Provider value={handleImageError}>
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

          <div className='flex flex-wrap items-center gap-3'>
            {persons.length > 0 && (
              <PersonSelector
                persons={persons}
                selectedId={memberId}
                showAllOption
                label={t('galleryFilterMember')}
                allOptionLabel={t('galleryAllMembers')}
                allOptionIcon={Users}
                onSelect={(id) => router.push(galleryHref({ member: id }))}
                className='w-full sm:w-64'
              />
            )}
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

        {viewMode && memberId && items.length === 0 ? (
          <p
            role='status'
            className='rounded-3xl border border-stone-100 bg-white px-4 py-16 text-center text-stone-500'>
            {t('galleryFilterEmpty', { name: member?.full_name ?? '' })}
          </p>
        ) : viewMode ? (
          <GalleryGrid
            items={items}
            isAdmin={isAdmin}
            viewMode={viewMode}
            persons={persons}
            initialPhotoId={photoId}
            onEdit={handleEdit}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ) : (
          // Holds the space until the saved view is known, so no wrong view flashes.
          <div aria-hidden='true' className='min-h-[60vh]' />
        )}

        {pageCount > 1 && (
          <nav
            aria-label={t('galleryPagination')}
            className='mt-10 flex items-center justify-center gap-3'>
            {page > 1 ? (
              <Link
                href={galleryHref({ page: page - 1, member: memberId })}
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
                href={galleryHref({ page: page + 1, member: memberId })}
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
          persons={persons}
        />
      </>
    </GalleryImageErrorContext.Provider>
  )
}
