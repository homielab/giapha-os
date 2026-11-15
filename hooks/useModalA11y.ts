import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Opens a `<dialog>` as a modal for as long as it is mounted. The browser
 * makes the page behind inert, keeps it in the top layer, moves focus in and
 * returns it to the opener on close.
 *
 * Mark the control that should get focus first with `data-autofocus`.
 *
 * Esc and the back gesture call `onClose` instead of closing the dialog, so
 * the caller decides (a form with unsaved changes can ask first). Unmount the
 * dialog to close it. Attach the returned ref to the `<dialog>`.
 */
export function useModalA11y(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  return useCallback((dialog: HTMLDialogElement | null) => {
    if (!dialog) return
    let unmounting = false

    const onCancel = (event: Event) => {
      event.preventDefault()
      onCloseRef.current()
    }
    // Browsers ignore preventDefault() on repeated Esc presses without user
    // activation and close the dialog anyway: reopen it and let the caller
    // decide, as for any other close request.
    const onNativeClose = () => {
      if (unmounting || !dialog.isConnected) return
      dialog.showModal()
      onCloseRef.current()
    }

    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onNativeClose)
    if (!dialog.open) {
      dialog.showModal()
      // React's autoFocus focuses before the dialog opens and renders no
      // attribute for showModal() to find, so the caller marks the control.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }

    return () => {
      unmounting = true
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onNativeClose)
      if (dialog.open) dialog.close()
    }
  }, [])
}
