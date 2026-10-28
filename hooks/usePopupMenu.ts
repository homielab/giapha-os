import { useEffect, useId, useRef, useState } from 'react'

import { isOutsidePopup, shouldClosePopupOnKey } from '@/utils/popupMenu'

/**
 * Open/close state shared by header popup menus: a press outside the
 * container closes the menu, Escape closes it and puts focus back on the
 * button that opened it.
 *
 * Attach `containerRef` to the element wrapping the button and the panel,
 * `buttonRef` to the button, spread `buttonProps` on the button and give the
 * panel `id={menuId}`.
 */
export function usePopupMenu<
  C extends HTMLElement = HTMLDivElement,
  B extends HTMLElement = HTMLButtonElement
>() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<C>(null)
  const buttonRef = useRef<B>(null)
  const menuId = useId()

  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (event: MouseEvent) => {
      if (isOutsidePopup(containerRef.current, event.target as Node | null)) {
        setIsOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (!shouldClosePopupOnKey(event.key, isOpen)) return
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return {
    isOpen,
    setIsOpen,
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((open) => !open),
    containerRef,
    buttonRef,
    menuId,
    buttonProps: {
      'aria-haspopup': 'menu' as const,
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? menuId : undefined
    }
  }
}
