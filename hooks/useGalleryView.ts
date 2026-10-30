'use client'

import { useSyncExternalStore } from 'react'

import {
  readGalleryView,
  subscribeGalleryView,
  type GalleryView
} from '@/utils/galleryView'

const noopSubscribe = () => () => {}

/**
 * The saved gallery view, or null until the page has hydrated: the server
 * can't read localStorage, so rendering a guess there would flash the wrong
 * view before switching.
 */
export function useGalleryView(): GalleryView | null {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const view = useSyncExternalStore(
    subscribeGalleryView,
    readGalleryView,
    () => 'timeline' as const
  )
  return hydrated ? view : null
}
