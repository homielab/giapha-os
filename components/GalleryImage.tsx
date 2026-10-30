import { ImageOff } from 'lucide-react'
import Image from 'next/image'
import { createContext, useContext } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import type { GalleryItem } from '@/types'

interface GalleryImageProps {
  item: Pick<GalleryItem, 'title' | 'image_url'>
  width: number
  height: number
  className?: string
  loading?: 'lazy' | 'eager'
}

// Called when a signed URL fails to load (usually expired) so the page can re-sign.
export const GalleryImageErrorContext = createContext<(() => void) | null>(null)

// Shows the image, or a placeholder when it has no signed URL (so no empty
// `src` ever reaches next/image).
export default function GalleryImage({
  item,
  width,
  height,
  className,
  loading
}: GalleryImageProps) {
  const { t } = useI18n()
  const onImageError = useContext(GalleryImageErrorContext)

  if (!item.image_url) {
    return (
      <div
        role='img'
        aria-label={`${item.title}: ${t('galleryImageUnavailable')}`}
        className='flex aspect-4/3 h-full w-full flex-col items-center justify-center gap-2 bg-stone-100 p-4 text-center text-sm text-stone-500'>
        <ImageOff className='size-6' aria-hidden='true' />
        {t('galleryImageUnavailable')}
      </div>
    )
  }

  return (
    <Image
      unoptimized
      src={item.image_url}
      alt={item.title}
      width={width}
      height={height}
      className={className}
      loading={loading}
      onError={onImageError ?? undefined}
    />
  )
}
