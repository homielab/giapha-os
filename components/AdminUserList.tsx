'use client'

import { useEffect, useRef, useState } from 'react'

import {
  adminCreateUser,
  changeUserRole,
  deleteUser,
  toggleUserStatus
} from '@/app/actions/user'
import config from '@/app/config'
import AdminCreateUserModal from '@/components/admin/AdminCreateUserModal'
import AdminNotificationToast, {
  AdminNotification
} from '@/components/admin/AdminNotificationToast'
import AdminUserRow from '@/components/admin/AdminUserRow'
import { useI18n } from '@/lib/i18n/useI18n'
import { AdminUserData, UserRole } from '@/types'

interface AdminUserListProps {
  initialUsers: AdminUserData[]
  currentUserId: string
}

export default function AdminUserList({
  initialUsers,
  currentUserId
}: AdminUserListProps) {
  const { t } = useI18n()
  const isDemo =
    typeof window !== 'undefined' &&
    window.location.hostname === config.demoDomain
  const [users, setUsers] = useState<AdminUserData[]>(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [notification, setNotification] = useState<AdminNotification | null>(
    null
  )

  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current)
    },
    []
  )

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setNotification({ message, type })
    if (notificationTimer.current) clearTimeout(notificationTimer.current)
    notificationTimer.current = setTimeout(() => setNotification(null), 5000)
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (isDemo) {
      showNotification(t('adminDemoNotice'), 'info')
      return
    }
    try {
      setLoadingId(userId)
      const result = await changeUserRole(userId, newRole)

      if (result?.error) {
        showNotification(result.error, 'error')
        return
      }

      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      showNotification(t('adminRoleUpdated'), 'success')
    } catch (error: unknown) {
      console.error(error)
      showNotification(t('adminUnknownRoleError'), 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    if (isDemo) {
      showNotification(t('adminDemoNotice'), 'info')
      return
    }
    try {
      setLoadingId(userId)
      const result = await toggleUserStatus(userId, newStatus)

      if (result?.error) {
        showNotification(result.error, 'error')
        return
      }

      setUsers(
        users.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
      )
      showNotification(
        t(newStatus ? 'adminStatusUpdated' : 'adminStatusLocked'),
        'success'
      )
    } catch (error: unknown) {
      console.error(error)
      showNotification(t('adminUnknownStatusError'), 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (userId: string) => {
    if (isDemo) {
      showNotification(t('adminDemoNotice'), 'info')
      return
    }
    if (!confirm(t('adminConfirmDelete'))) return
    try {
      setLoadingId(userId)
      const result = await deleteUser(userId)

      if (result?.error) {
        showNotification(result.error, 'error')
        return
      }

      setUsers(users.filter((u) => u.id !== userId))
      showNotification(t('adminDeleted'), 'success')
    } catch (error: unknown) {
      console.error(error)
      showNotification(t('adminUnknownDeleteError'), 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isDemo) {
      showNotification(t('adminDemoCreateNotice'), 'info')
      setIsCreateModalOpen(false)
      return
    }
    setIsCreating(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await adminCreateUser(formData)

      if (result?.error) {
        showNotification(result.error, 'error')
        return
      }

      showNotification(t('adminCreated'), 'success')
      setIsCreateModalOpen(false)
      setTimeout(() => window.location.reload(), 1500)
    } catch (error: unknown) {
      console.error(error)
      showNotification(t('adminUnknownCreateError'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className='relative space-y-6'>
      <AdminNotificationToast notification={notification} />

      <div className='flex justify-end'>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className='btn-primary'>
          <svg
            className='size-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
          {t('adminAddUser')}
        </button>
      </div>

      <div className='overflow-hidden rounded-2xl border border-stone-200/60 bg-white/60 backdrop-blur-xl'>
        <div className='custom-scrollbar overflow-x-auto'>
          <table className='w-full text-left text-sm whitespace-nowrap'>
            <thead className='border-b border-stone-200/60 bg-stone-50/50'>
              <tr>
                <th className='px-6 py-4 text-sm font-medium text-stone-500'>
                  {t('adminEmail')}
                </th>
                <th className='px-6 py-4 text-sm font-medium text-stone-500'>
                  {t('adminRole')}
                </th>
                <th className='px-6 py-4 text-sm font-medium text-stone-500'>
                  {t('adminStatus')}
                </th>
                <th className='px-6 py-4 text-sm font-medium text-stone-500'>
                  {t('adminCreatedAt')}
                </th>
                <th className='px-6 py-4 text-right text-sm font-medium text-stone-500'>
                  {t('adminActions')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-stone-100'>
              {users.map((user) => (
                <AdminUserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                  loadingId={loadingId}
                  onRoleChange={handleRoleChange}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className='px-6 py-8 text-center text-stone-500'>
                    {t('adminNoUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <AdminCreateUserModal
          isCreating={isCreating}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateUser}
        />
      )}
    </div>
  )
}
