export type GalleryView = 'grid' | 'timeline'

/** localStorage key that remembers the gallery view across pages and visits. */
export const GALLERY_VIEW_KEY = 'giapha-gallery-view'

/** Stored value → view; anything unknown falls back to the timeline. */
export function parseGalleryView(raw: string | null): GalleryView {
  return raw === 'grid' ? 'grid' : 'timeline'
}

const listeners = new Set<() => void>()

/** Current view from localStorage (timeline when storage is blocked). */
export function readGalleryView(): GalleryView {
  try {
    return parseGalleryView(localStorage.getItem(GALLERY_VIEW_KEY))
  } catch {
    return 'timeline'
  }
}

export function writeGalleryView(view: GalleryView) {
  try {
    localStorage.setItem(GALLERY_VIEW_KEY, view)
  } catch (e) {
    console.warn('Failed to write to localStorage:', e)
  }
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: this tab's writes and other tabs' changes. */
export function subscribeGalleryView(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}
