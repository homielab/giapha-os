/** CSS selector for elements a keyboard user can Tab to. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])'

/**
 * Where Tab / Shift+Tab should move focus to keep it inside a dialog, or null
 * when the browser's own order is fine. At the last item Tab wraps to the
 * first, at the first Shift+Tab wraps to the last, and focus that is outside
 * the list (for example on the dialog itself) goes to the first or last item.
 * Returns null for an empty list.
 */
export function focusTrapTarget<T>(
  focusables: readonly T[],
  active: T | null,
  shiftKey: boolean
): T | null {
  if (focusables.length === 0) return null
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const index = active === null ? -1 : focusables.indexOf(active)
  if (index === -1) return first
  if (shiftKey) return index === 0 ? last : null
  return index === focusables.length - 1 ? first : null
}
