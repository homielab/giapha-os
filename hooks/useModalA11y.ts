import { useEffect, useEffectEvent, useRef } from 'react'

import { FOCUSABLE_SELECTOR, focusTrapTarget } from '@/utils/focusTrap'

// Open modals, topmost last: only the topmost one reacts to Escape.
const openModals: symbol[] = []
let previousBodyOverflow = ''

function lockScroll() {
  if (openModals.length === 1) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}

function unlockScroll() {
  if (openModals.length === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

/**
 * Keyboard and focus behaviour shared by modal dialogs: Escape closes the
 * topmost modal, focus moves into the dialog when it opens and returns to the
 * element that had it when it closes, Tab and Shift+Tab cycle inside the
 * dialog, and the page behind does not scroll.
 *
 * Attach the returned ref to the element carrying `role="dialog"` (give it
 * `tabIndex={-1}`). Pass `isOpen` when the component stays mounted while closed.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  isOpen = true
) {
  const ref = useRef<T>(null)
  const handleClose = useEffectEvent(onClose)

  useEffect(() => {
    if (!isOpen) return
    const id = Symbol('modal')
    openModals.push(id)
    lockScroll()
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    ref.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (openModals[openModals.length - 1] !== id) return
      if (e.key === 'Tab') {
        const dialog = ref.current
        if (!dialog) return
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.getClientRects().length > 0)
        const active = document.activeElement as HTMLElement | null
        const target = focusTrapTarget(
          focusables.length > 0 ? focusables : [dialog],
          active,
          e.shiftKey
        )
        if (target) {
          e.preventDefault()
          target.focus()
        }
        return
      }
      if (e.key !== 'Escape') return
      e.preventDefault()
      handleClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = openModals.indexOf(id)
      if (index !== -1) openModals.splice(index, 1)
      unlockScroll()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [isOpen])

  return ref
}
