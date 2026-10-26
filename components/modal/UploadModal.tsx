'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import UploadDropzone from '@/components/modal/UploadDropzone'
import UploadFormFields from '@/components/modal/UploadFormFields'
import UploadModalActions from '@/components/modal/UploadModalActions'
import { useFilePreview } from '@/hooks/useFilePreview'
import { useI18n } from '@/lib/i18n/useI18n'
import type { GalleryItem } from '@/types'
import { validateImageFile } from '@/utils/imageUpload'
import { createClient } from '@/utils/supabase/client'
import { InvalidImageError, uploadGalleryImage } from '@/utils/supabase/storage'
import { getGalleryStoragePath } from '@/utils/supabase/storage-path'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: GalleryItem | null
}

export default function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  initialData
}: UploadModalProps) {
  const { t } = useI18n()
  const { file, previewUrl: preview, setFile } = useFilePreview()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Both the file picker and drag-and-drop go through the same checks:
  // size, reported MIME type and the file's own signature.
  const acceptFile = async (selected: File) => {
    const validation = await validateImageFile(selected)
    if (!validation.ok) {
      setError(
        validation.reason === 'too-large'
          ? t('fileTooLarge10')
          : t('unsupportedImageType')
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(selected)
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) void acceptFile(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) void acceptFile(dropped)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialData && !file) {
      setError(t('chooseImageError'))
      return
    }
    if (!title) {
      setError(t('enterImageTitle'))
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      let finalPath = initialData
        ? initialData.storage_path ||
          getGalleryStoragePath(initialData.image_url)
        : ''

      // 1. Upload to storage (only if new file selected)
      if (file) {
        const { path, error: uploadError } = await uploadGalleryImage(file)
        if (uploadError instanceof InvalidImageError) {
          throw new Error(
            uploadError.reason === 'too-large'
              ? t('fileTooLarge10')
              : t('unsupportedImageType')
          )
        }
        if (uploadError || !path) {
          throw new Error(t('uploadError'))
        }
        finalPath = path
      }

      // 2. Save to database
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()

      const itemData = {
        title,
        description: description || null,
        image_url: finalPath,
        event_date: eventDate || null
      }

      if (initialData) {
        // Update
        const { error: dbError } = await supabase
          .from('gallery_items')
          .update(itemData)
          .eq('id', initialData.id)
        if (dbError) throw dbError
      } else {
        // Insert
        const { error: dbError } = await supabase.from('gallery_items').insert([
          {
            ...itemData,
            created_by: userData?.user?.id || null
          }
        ])
        if (dbError) throw dbError
      }

      // Success
      resetForm()
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('systemError'))
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setEventDate('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 z-100 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm sm:p-6'>
          {/* Click-away backdrop */}
          <button
            type='button'
            aria-label={t('close')}
            disabled={isUploading}
            className='absolute inset-0 cursor-pointer'
            onClick={handleClose}
          />

          <m.div
            layout
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white/95 backdrop-blur-2xl'>
            {/* Sticky Header Actions */}
            <div className='absolute top-4 right-4 z-20 flex items-center gap-2 sm:top-5 sm:right-5'>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className='flex size-10 items-center justify-center rounded-full border border-stone-200/50 bg-stone-100/80 text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50'
                aria-label={t('close')}>
                <X className='size-5' />
              </button>
            </div>

            <div className='custom-scrollbar flex-1 overflow-y-auto px-4 pt-16 pb-8 sm:px-8'>
              <h2 className='mb-6 font-serif text-xl font-semibold text-stone-800'>
                {initialData ? t('editImage') : t('addToGallery')}
              </h2>

              <form
                id='upload-form'
                onSubmit={handleSubmit}
                className='space-y-6'>
                <UploadDropzone
                  preview={preview}
                  fileInputRef={fileInputRef}
                  onRemovePreview={() => setFile(null)}
                  onFileChange={handleFileChange}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />

                {error && (
                  <div className='rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600'>
                    {error}
                  </div>
                )}

                <UploadFormFields
                  title={title}
                  eventDate={eventDate}
                  description={description}
                  onTitleChange={setTitle}
                  onEventDateChange={setEventDate}
                  onDescriptionChange={setDescription}
                />

                <UploadModalActions
                  isUploading={isUploading}
                  canSubmit={
                    (Boolean(initialData) || Boolean(file)) && Boolean(title)
                  }
                  isEdit={Boolean(initialData)}
                  onClose={handleClose}
                />
              </form>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
