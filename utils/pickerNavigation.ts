import { searchPersons } from '@/utils/search'

export const PICKER_LIMIT = 20

/**
 * People a picker lists for the typed text: accent-insensitive search, the
 * person in `disabledId` left out. Empty text lists the first `limit` people.
 */
export function filterPickerPersons<
  T extends { id: string; full_name: string; other_names?: string | null }
>(
  persons: T[],
  query: string,
  disabledId?: string,
  limit: number = PICKER_LIMIT
): T[] {
  const available = disabledId
    ? persons.filter((p) => p.id !== disabledId)
    : persons
  if (!query.trim()) return available.slice(0, limit)
  return searchPersons(available, query, limit)
}

export interface PickerKeyResult {
  /** The highlighted option after the key (-1 when the list is empty). */
  active: number
  /** `select` = choose the highlighted option, `close` = close the list. */
  action: 'select' | 'close' | null
  /** The key was handled, so the caller should `preventDefault()`. */
  handled: boolean
}

/**
 * Keyboard rules of a picker list: Down/Up move the highlight (stopping at
 * the ends), Home/End jump, Enter selects it, Escape closes.
 */
export function pickerKeyNavigation(
  key: string,
  active: number,
  count: number
): PickerKeyResult {
  const last = count - 1
  const clamped = count === 0 ? -1 : Math.min(Math.max(active, 0), last)
  switch (key) {
    case 'ArrowDown':
      return {
        active: count === 0 ? -1 : Math.min(clamped + 1, last),
        action: null,
        handled: true
      }
    case 'ArrowUp':
      return {
        active: count === 0 ? -1 : Math.max(clamped - 1, 0),
        action: null,
        handled: true
      }
    case 'Home':
      return { active: count === 0 ? -1 : 0, action: null, handled: count > 0 }
    case 'End':
      return { active: last, action: null, handled: count > 0 }
    case 'Enter':
      return {
        active: clamped,
        action: clamped >= 0 ? 'select' : null,
        handled: clamped >= 0
      }
    case 'Escape':
      return { active: clamped, action: 'close', handled: true }
    default:
      return { active: clamped, action: null, handled: false }
  }
}
