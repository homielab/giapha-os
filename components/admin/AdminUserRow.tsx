'use client'

import dayjs from 'dayjs'
import { Trash } from 'lucide-react'

import { useI18n } from '@/lib/i18n/useI18n'
import { AdminUserData, UserRole } from '@/types'

interface AdminUserRowProps {
  user: AdminUserData
  currentUserId: string
  loadingId: string | null
  onRoleChange: (userId: string, newRole: UserRole) => void
  onStatusChange: (userId: string, newStatus: boolean) => void
  onDelete: (userId: string) => void
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'border border-amber-200 bg-amber-100 text-amber-800',
  editor: 'border border-sky-200 bg-sky-100 text-sky-800',
  member: 'border border-stone-200 bg-stone-100 text-stone-600'
}

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useI18n()
  const label =
    role === 'admin'
      ? t('adminAdminRole')
      : role === 'editor'
        ? t('adminEditorRole')
        : t('adminMemberRole')
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ${ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.member}`}>
      {label}
    </span>
  )
}

function RoleSelect({
  user,
  disabled,
  onRoleChange
}: {
  user: AdminUserData
  disabled: boolean
  onRoleChange: (userId: string, newRole: UserRole) => void
}) {
  const { t } = useI18n()
  return (
    <select
      aria-label={`${t('adminRole')} — ${user.email}`}
      value={user.role}
      onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
      disabled={disabled}
      className='rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-sm text-stone-700 transition-colors outline-none hover:border-stone-300 focus:border-amber-500 focus:ring-amber-500 disabled:opacity-50'>
      <option value='admin'>{t('adminAdminRole')}</option>
      <option value='editor'>{t('adminEditorRole')}</option>
      <option value='member'>{t('adminMemberRole')}</option>
    </select>
  )
}

function StatusToggle({
  user,
  isSelf,
  disabled,
  onStatusChange
}: {
  user: AdminUserData
  isSelf: boolean
  disabled: boolean
  onStatusChange: (userId: string, newStatus: boolean) => void
}) {
  const { t } = useI18n()
  const title = isSelf
    ? t('adminSelfStatusDisabled')
    : user.is_active
      ? t('adminClickToLock')
      : t('adminClickToApprove')
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onStatusChange(user.id, !user.is_active)}
      className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium transition-colors ${
        user.is_active
          ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
          : 'border border-stone-200 bg-stone-100 text-stone-800'
      } ${
        !isSelf
          ? 'cursor-pointer hover:opacity-80'
          : 'cursor-not-allowed opacity-50'
      } disabled:opacity-50`}
      title={title}>
      {user.is_active ? t('adminApproved') : t('adminPending')}
    </button>
  )
}

function RowActions({
  isSelf,
  disabled,
  onDelete
}: {
  isSelf: boolean
  disabled: boolean
  onDelete: () => void
}) {
  const { t } = useI18n()
  if (isSelf) {
    return (
      <span className='text-sm text-stone-400 italic'>{t('adminYou')}</span>
    )
  }
  return (
    <div className='flex items-center justify-end gap-2'>
      <button
        type='button'
        aria-label={t('adminDeleteUser')}
        title={t('adminDeleteUser')}
        disabled={disabled}
        onClick={onDelete}
        className='rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50'>
        <Trash className='size-4' aria-hidden='true' />
      </button>
    </div>
  )
}

export default function AdminUserRow({
  user,
  currentUserId,
  loadingId,
  onRoleChange,
  onStatusChange,
  onDelete
}: AdminUserRowProps) {
  const isSelf = user.id === currentUserId
  return (
    <tr className='transition-colors hover:bg-stone-50/80'>
      <td className='px-6 py-4 font-medium text-stone-900'>{user.email}</td>
      <td className='px-6 py-4'>
        {isSelf ? (
          <RoleBadge role={user.role} />
        ) : (
          <RoleSelect
            user={user}
            disabled={loadingId === user.id}
            onRoleChange={onRoleChange}
          />
        )}
      </td>
      <td className='px-6 py-4'>
        <StatusToggle
          user={user}
          isSelf={isSelf}
          disabled={loadingId === user.id || isSelf}
          onStatusChange={onStatusChange}
        />
      </td>
      <td className='px-6 py-4 text-stone-500'>
        {dayjs(user.created_at).format('DD/MM/YYYY')}
      </td>
      <td className='px-6 py-4 text-right'>
        <RowActions
          isSelf={isSelf}
          disabled={loadingId === user.id}
          onDelete={() => onDelete(user.id)}
        />
      </td>
    </tr>
  )
}
