'use client'

import { UploadCloud, X } from 'lucide-react'
import Image from 'next/image'
import { RefObject } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { IMAGE_ACCEPT } from '@/utils/imageUpload'

interface UploadDropzoneProps {
  preview: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onRemovePreview: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export default function UploadDropzone({
  preview,
  fileInputRef,
  onRemovePreview,
  onFileChange,
  onDragOver,
  onDrop
}: UploadDropzoneProps) {
  const { t } = useI18n()
  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${preview ? 'border-stone-200 bg-stone-50' : 'border-stone-300 hover:border-pink-400 hover:bg-pink-50/50'}`}
      onDragOver={onDragOver}
      onDrop={onDrop}>
      {!preview && (
        <button
          type='button'
          aria-label={t('chooseImage')}
          className='absolute inset-0 z-10 cursor-pointer'
          onClick={() => fileInputRef.current?.click()}
        />
      )}
      {preview ? (
        <div className='relative inline-block w-full'>
          <Image
            unoptimized
            src={preview}
            alt={t('imagePreview')}
            width={800}
            height={600}
            className='mx-auto max-h-64 rounded-lg object-contain shadow-sm'
          />
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              onRemovePreview()
            }}
            aria-label={t('delete')}
            className='absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md backdrop-blur-sm hover:text-rose-600'>
            <X className='size-4' />
          </button>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center space-y-3'>
          <div className='rounded-full bg-stone-100 p-4 text-stone-400'>
            <UploadCloud className='size-8' />
          </div>
          <div>
            <p className='text-sm font-medium text-stone-700'>
              {t('chooseImage')}
            </p>
            <p className='mt-1 text-sm text-stone-500'>
              {t('imageUploadHint')}
            </p>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type='file'
        accept={IMAGE_ACCEPT}
        className='hidden'
        onChange={onFileChange}
      />
    </div>
  )
}
