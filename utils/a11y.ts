export type NoticeType = 'success' | 'error' | 'info' | 'warning'

/** `alert` interrupts the screen reader (errors); everything else waits. */
export function noticeRole(type: NoticeType): 'alert' | 'status' {
  return type === 'error' ? 'alert' : 'status'
}

/** Attributes to spread on a notice element so screen readers announce it. */
export function noticeAria(type: NoticeType) {
  const role = noticeRole(type)
  return {
    role,
    'aria-live': role === 'alert' ? ('assertive' as const) : ('polite' as const)
  }
}

/**
 * Attributes for a button that switches an option on or off (a view or a
 * filter). The label keeps the button named when only its icon shows.
 */
export function toggleButtonProps(label: string, pressed: boolean) {
  return { 'aria-label': label, 'aria-pressed': pressed }
}

/** Attributes for a button that opens and closes the panel `controls`. */
export function disclosureButtonProps(
  label: string,
  expanded: boolean,
  controls: string
) {
  return {
    'aria-label': label,
    'aria-expanded': expanded,
    'aria-controls': controls
  }
}

/**
 * Attributes that make a non-button element (a card) work like a button:
 * reachable with Tab, opened with Enter or Space. Pass `null` when the
 * element does nothing, so it stays out of the Tab order.
 */
export function clickableProps(onActivate: (() => void) | null) {
  if (!onActivate) return {}
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onActivate()
    }
  }
}
