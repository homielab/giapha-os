'use client'

import Link from 'next/link'

import GalleryImage from '@/components/GalleryImage'
import { useI18n } from '@/lib/i18n/useI18n'
import type { GalleryItem } from '@/types'
import { galleryHref } from '@/utils/galleryTags'

// Photos the member is tagged in. Each opens in the gallery lightbox, which
// is filtered to this member so Previous / Next stay within their photos.
export default function MemberPhotoStrip({
  personId,
  items,
  total
}: {
  personId: string
  items: GalleryItem[]
  total: number
}) {
  const { t } = useI18n()
  if (items.length === 0) return null

  return (
    <section
      aria-labelledby='member-photos-title'
      className='mt-6 rounded-2xl border border-stone-200/60 bg-white/60 p-4 sm:p-6 print:hidden'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h2
          id='member-photos-title'
          className='font-serif text-xl font-semibold text-stone-800'>
          {t('memberPhotos')}
        </h2>
        <Link
          href={galleryHref({ member: personId })}
          className='text-sm font-medium text-amber-800 underline-offset-2 hover:underline'>
          {t('memberPhotosSeeAll', { total })}
        </Link>
      </div>
      <ul className='flex gap-3 overflow-x-auto pb-2'>
        {items.map((item) => (
          <li key={item.id} className='shrink-0'>
            <Link
              href={galleryHref({ member: personId, photo: item.id })}
              title={t('memberPhotoOpen', { title: item.title })}
              className='block size-28 overflow-hidden rounded-xl bg-stone-100 ring-amber-500 transition hover:opacity-90 focus-visible:ring-2 sm:size-32'>
              <GalleryImage
                item={item}
                width={256}
                height={256}
                className='size-full object-cover'
                loading='lazy'
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
