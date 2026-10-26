import type { TranslationKey } from '@/lib/i18n/messages'

export type UserAdminAction = 'role' | 'status' | 'delete' | 'create'

export interface UserAdminDatabaseError {
  code?: string | null
  message?: string | null
}

// Messages raised by the user management functions in docs/schema.sql and
// the security migrations. Keep in sync when a function gets a new check.
const KNOWN_DATABASE_ERRORS: Record<string, TranslationKey> = {
  'Access denied.': 'userAdminAccessDenied',
  'Cannot change your own role.': 'userAdminOwnRole',
  'Cannot remove the last active administrator.': 'userAdminLastAdminRole',
  'Cannot delete yourself.': 'userAdminDeleteSelf',
  'Cannot delete the last active administrator.': 'userAdminLastAdminDelete',
  'Invalid email.': 'userAdminInvalidEmail',
  'Password must be at least 8 characters.': 'userAdminPasswordTooShort',
  'Cannot change your own active status.': 'userAdminOwnStatus',
  'Cannot deactivate the last active administrator.':
    'userAdminLastAdminDeactivate'
}

const UNKNOWN_ERROR_KEYS: Record<UserAdminAction, TranslationKey> = {
  role: 'adminUnknownRoleError',
  status: 'adminUnknownStatusError',
  delete: 'adminUnknownDeleteError',
  create: 'adminUnknownCreateError'
}

/** Returns the translation key for a known database error, or null. */
export function knownUserAdminErrorKey(
  error: UserAdminDatabaseError
): TranslationKey | null {
  const message = error.message?.trim() ?? ''
  const known = KNOWN_DATABASE_ERRORS[message]
  if (known) return known

  // 42501 = insufficient_privilege (a revoked grant or a raise with that code).
  if (error.code === '42501') return 'userAdminAccessDenied'
  // 23505 = unique_violation: auth.users already has this email.
  if (error.code === '23505') return 'userAdminEmailTaken'

  return null
}

/** Translation key to show for a failed user management call. */
export function userAdminErrorKey(
  action: UserAdminAction,
  error: UserAdminDatabaseError
): TranslationKey {
  return knownUserAdminErrorKey(error) ?? UNKNOWN_ERROR_KEYS[action]
}
