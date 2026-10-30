'use server'

import { revalidatePath } from 'next/cache'

import { getServerTranslations } from '@/lib/i18n/server'
import { UserRole } from '@/types'
import { notifyAdminIfPending } from '@/utils/approval-notification'
import {
  getIsAdmin,
  getProfile,
  getSupabase,
  getUser
} from '@/utils/supabase/queries'
import {
  knownUserAdminErrorKey,
  UserAdminAction,
  UserAdminDatabaseError,
  userAdminErrorKey
} from '@/utils/userAdminErrors'

// Called by the login page after a password sign-in or a sign-up that returns a
// session (Supabase "Confirm email" off): those never pass through
// /auth/callback, so this is where the administrators hear about the account.
// Does nothing for active accounts; never fails the sign-in.
export async function notifyAdminIfAccountPending(): Promise<void> {
  try {
    const [user, profile] = await Promise.all([getUser(), getProfile()])
    await notifyAdminIfPending(user, profile)
  } catch (error) {
    console.error('Cannot notify administrators of a pending account:', error)
  }
}

// Same minimum as public.admin_create_user in docs/schema.sql.
const MIN_PASSWORD_LENGTH = 8

type UserAdminResult = { error?: string; success?: boolean }

type Translate = Awaited<ReturnType<typeof getServerTranslations>>['t']

// The database functions check public.is_admin() too; this check stops a
// non-admin before any call reaches the database.
async function checkAdmin() {
  const [isAdmin, { t }] = await Promise.all([
    getIsAdmin(),
    getServerTranslations()
  ])
  return { isAdmin, t }
}

function failure(
  t: Translate,
  action: UserAdminAction,
  error: UserAdminDatabaseError,
  logMessage: string
): UserAdminResult {
  if (!knownUserAdminErrorKey(error)) {
    console.error(logMessage, error)
  }
  return { error: t(userAdminErrorKey(action, error)) }
}

export async function changeUserRole(
  userId: string,
  newRole: UserRole
): Promise<UserAdminResult> {
  const { isAdmin, t } = await checkAdmin()
  if (!isAdmin) return { error: t('userAdminAccessDenied') }

  const supabase = await getSupabase()
  const { error } = await supabase.rpc('set_user_role', {
    target_user_id: userId,
    new_role: newRole
  })

  if (error) {
    return failure(t, 'role', error, 'Failed to change user role:')
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function deleteUser(userId: string): Promise<UserAdminResult> {
  const { isAdmin, t } = await checkAdmin()
  if (!isAdmin) return { error: t('userAdminAccessDenied') }

  const supabase = await getSupabase()
  const { error } = await supabase.rpc('delete_user', {
    target_user_id: userId
  })

  if (error) {
    return failure(t, 'delete', error, 'Failed to delete user:')
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function adminCreateUser(
  formData: FormData
): Promise<UserAdminResult> {
  const { isAdmin, t } = await checkAdmin()
  if (!isAdmin) return { error: t('userAdminAccessDenied') }

  const email = formData.get('email')?.toString()
  const password = formData.get('password')?.toString()
  const role = formData.get('role')?.toString() || 'member'

  if (role !== 'admin' && role !== 'editor' && role !== 'member') {
    return { error: t('invalidUserRole') }
  }

  const isActiveStr = formData.get('is_active')?.toString()
  const isActive = isActiveStr === 'false' ? false : true

  if (!email || !password) {
    return { error: t('emailPasswordRequired') }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t('userAdminPasswordTooShort') }
  }

  const supabase = await getSupabase()

  const { error } = await supabase.rpc('admin_create_user', {
    new_email: email,
    new_password: password,
    new_role: role,
    new_active: isActive
  })

  if (error) {
    return failure(t, 'create', error, 'Failed to create user:')
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function toggleUserStatus(
  userId: string,
  newStatus: boolean
): Promise<UserAdminResult> {
  const { isAdmin, t } = await checkAdmin()
  if (!isAdmin) return { error: t('userAdminAccessDenied') }

  const supabase = await getSupabase()
  const { error } = await supabase.rpc('set_user_active_status', {
    target_user_id: userId,
    new_status: newStatus
  })

  if (error) {
    return failure(t, 'status', error, 'Failed to change user status:')
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}
