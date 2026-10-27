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
