import { beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  getMessages,
  type TranslationKey,
  type TranslationValues
} from '@/lib/i18n/messages'

import { knownUserAdminErrorKey, userAdminErrorKey } from './userAdminErrors'

const vi = getMessages('vi')

describe('userAdminErrorKey', () => {
  test.each([
    ['Access denied.', 'userAdminAccessDenied'],
    ['Cannot change your own role.', 'userAdminOwnRole'],
    ['Cannot remove the last active administrator.', 'userAdminLastAdminRole'],
    ['Cannot delete yourself.', 'userAdminDeleteSelf'],
    [
      'Cannot delete the last active administrator.',
      'userAdminLastAdminDelete'
    ],
    ['Invalid email.', 'userAdminInvalidEmail'],
    ['Password must be at least 8 characters.', 'userAdminPasswordTooShort'],
    ['Cannot change your own active status.', 'userAdminOwnStatus'],
    [
      'Cannot deactivate the last active administrator.',
      'userAdminLastAdminDeactivate'
    ]
  ] as const)('maps "%s" to %s', (message, key) => {
    expect(userAdminErrorKey('role', { code: 'P0001', message })).toBe(key)
    expect(vi[key]).not.toContain(message)
  })

  test('maps error codes for missing privileges and taken emails', () => {
    expect(
      userAdminErrorKey('status', {
        code: '42501',
        message: 'permission denied for function set_user_active_status'
      })
    ).toBe('userAdminAccessDenied')
    expect(
      userAdminErrorKey('create', {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      })
    ).toBe('userAdminEmailTaken')
  })

  test('falls back to the generic message of each action', () => {
    const error = { code: 'XX000', message: 'connection reset' }
    expect(knownUserAdminErrorKey(error)).toBeNull()
    expect(userAdminErrorKey('role', error)).toBe('adminUnknownRoleError')
    expect(userAdminErrorKey('status', error)).toBe('adminUnknownStatusError')
    expect(userAdminErrorKey('delete', error)).toBe('adminUnknownDeleteError')
    expect(userAdminErrorKey('create', error)).toBe('adminUnknownCreateError')
    expect(userAdminErrorKey('create', {})).toBe('adminUnknownCreateError')
  })
})

// Server actions in app/actions/user.ts, with Supabase, translations and the
// Next.js cache replaced.
let isAdmin = false
let rpcResult: { error: { code?: string; message: string } | null } = {
  error: null
}
const rpc = mock((fn: string, args: Record<string, unknown>) => {
  void fn
  void args
  return Promise.resolve(rpcResult)
})
const revalidatePath = mock((path: string) => {
  void path
})

mock.module('@/utils/supabase/queries', () => ({
  getIsAdmin: async () => isAdmin,
  getSupabase: async () => ({ rpc })
}))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'vi',
    dictionary: vi,
    t: (key: TranslationKey, values?: TranslationValues) => {
      void values
      return vi[key]
    }
  })
}))
mock.module('next/cache', () => ({ revalidatePath }))

const { adminCreateUser, changeUserRole, deleteUser, toggleUserStatus } =
  await import('@/app/actions/user')

function createForm() {
  const form = new FormData()
  form.set('email', 'new@example.com')
  form.set('password', 'secret-password')
  form.set('role', 'member')
  return form
}

const actions = {
  changeUserRole: () => changeUserRole('user-1', 'editor'),
  deleteUser: () => deleteUser('user-1'),
  toggleUserStatus: () => toggleUserStatus('user-1', false),
  adminCreateUser: () => adminCreateUser(createForm())
}

describe('user management actions', () => {
  beforeEach(() => {
    isAdmin = false
    rpcResult = { error: null }
    rpc.mockClear()
    revalidatePath.mockClear()
  })

  test.each(Object.entries(actions))(
    '%s refuses a non-admin without calling the database',
    async (_name, run) => {
      expect(await run()).toEqual({ error: vi.userAdminAccessDenied })
      expect(rpc).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    }
  )

  test.each(Object.entries(actions))(
    '%s runs for an admin',
    async (_name, run) => {
      isAdmin = true
      expect(await run()).toEqual({ success: true })
      expect(rpc).toHaveBeenCalledTimes(1)
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/users')
    }
  )

  test('passes the arguments to the database functions', async () => {
    isAdmin = true
    await changeUserRole('user-1', 'editor')
    expect(rpc).toHaveBeenLastCalledWith('set_user_role', {
      target_user_id: 'user-1',
      new_role: 'editor'
    })
    await adminCreateUser(createForm())
    expect(rpc).toHaveBeenLastCalledWith('admin_create_user', {
      new_email: 'new@example.com',
      new_password: 'secret-password',
      new_role: 'member',
      new_active: true
    })
  })

  test('translates the last admin error instead of showing it raw', async () => {
    isAdmin = true
    rpcResult = {
      error: {
        code: 'P0001',
        message: 'Cannot remove the last active administrator.'
      }
    }
    expect(await changeUserRole('admin-1', 'member')).toEqual({
      error: vi.userAdminLastAdminRole
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('shows the generic message and logs an unknown error', async () => {
    isAdmin = true
    rpcResult = { error: { code: 'XX000', message: 'connection reset' } }
    const originalError = console.error
    const logged = mock((...args: unknown[]) => {
      void args
    })
    console.error = logged
    try {
      expect(await deleteUser('user-1')).toEqual({
        error: vi.adminUnknownDeleteError
      })
    } finally {
      console.error = originalError
    }
    expect(logged).toHaveBeenCalledTimes(1)
  })
})
