import type { MemberFormInitialValues } from '@/utils/memberFormInit'

export type MemberFormValues = Omit<
  MemberFormInitialValues,
  'updateDescendantGenerations'
>

function same(a: unknown, b: unknown): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim()
  }
  return a === b
}

/**
 * True when the member form holds changes the user would lose by leaving:
 * any field differs from its initial value (ignoring leading/trailing
 * spaces), or an avatar was picked or removed.
 */
export function isFormDirty(
  initial: MemberFormValues,
  current: MemberFormValues,
  avatarChanged = false
): boolean {
  if (avatarChanged) return true
  return (Object.keys(initial) as (keyof MemberFormValues)[]).some(
    (key) => !same(initial[key], current[key])
  )
}
