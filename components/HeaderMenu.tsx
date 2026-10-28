'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  ArrowUpCircle,
  BarChart2,
  BookOpen,
  ChevronDown,
  Database,
  GitMerge,
  Info,
  Network,
  UserCircle,
  Users
} from 'lucide-react'
import Link from 'next/link'

import { usePopupMenu } from '@/hooks/usePopupMenu'
import { useI18n } from '@/lib/i18n/useI18n'

import LogoutButton from './LogoutButton'
import { useUser } from './UserProvider'

export default function HeaderMenu() {
  const { user, isAdmin } = useUser()
  const { t } = useI18n()
  const userEmail = user?.email
  const {
    isOpen,
    close,
    toggle,
    containerRef,
    buttonRef,
    menuId,
    buttonProps
  } = usePopupMenu()

  const links = [
    {
      href: '/dashboard',
      icon: Network,
      label: t('dashboard'),
      hover: 'hover:bg-amber-50 hover:text-amber-700'
    },
    {
      href: '/dashboard/members',
      icon: Network,
      label: t('familyTree'),
      hover: 'hover:bg-amber-50 hover:text-amber-700'
    },
    {
      href: '/dashboard/kinship',
      icon: GitMerge,
      label: t('kinship'),
      hover: 'hover:bg-blue-50 hover:text-blue-700'
    },
    {
      href: '/dashboard/lineage/book',
      icon: BookOpen,
      label: t('lineageBookTitle'),
      hover: 'hover:bg-indigo-50 hover:text-indigo-700'
    },
    {
      href: '/dashboard/stats',
      icon: BarChart2,
      label: t('statistics'),
      hover: 'hover:bg-purple-50 hover:text-purple-700'
    }
  ]

  const adminLinks = [
    {
      href: '/dashboard/users',
      icon: Users,
      label: t('manageUsers'),
      hover: 'hover:bg-rose-50 hover:text-rose-700'
    },
    {
      href: '/dashboard/lineage',
      icon: Network,
      label: t('lineageOrder'),
      hover: 'hover:bg-indigo-50 hover:text-indigo-700'
    },
    {
      href: '/dashboard/data',
      icon: Database,
      label: t('backupRestore'),
      hover: 'hover:bg-teal-50 hover:text-teal-700'
    },
    {
      href: '/dashboard/upgrade',
      icon: ArrowUpCircle,
      label: t('upgrade'),
      hover: 'hover:bg-amber-50 hover:text-amber-700'
    }
  ]

  return (
    <div className='relative' ref={containerRef}>
      <button
        type='button'
        ref={buttonRef}
        {...buttonProps}
        aria-label={t('account')}
        onClick={toggle}
        className='flex items-center gap-2 rounded-full border border-transparent py-1.5 pr-4 pl-2 transition-colors duration-200 hover:border-stone-200 hover:bg-stone-100'>
        <div className='flex size-8 items-center justify-center rounded-full bg-linear-to-br from-amber-200 to-amber-100 font-medium text-amber-800 shadow-sm ring-1 ring-amber-300/50'>
          {userEmail ? (
            userEmail.charAt(0).toUpperCase()
          ) : (
            <UserCircle className='size-5' />
          )}
        </div>
        <ChevronDown
          className={`size-4 text-stone-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            id={menuId}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className='absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-3xl border border-border bg-surface py-2'>
            <div className='border-b border-stone-100 bg-stone-50/50 px-4 py-3'>
              <p className='mb-0.5 text-sm font-medium text-stone-400'>
                {t('account')}
              </p>
              <p className='truncate text-sm font-medium text-stone-900'>
                {userEmail}
              </p>
            </div>
            <div className='py-1'>
              {links.map(({ href, icon: Icon, label, hover }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors ${hover}`}>
                  <Icon className='size-4' />
                  {label}
                </Link>
              ))}

              {isAdmin && (
                <>
                  <div className='mt-1 px-4 py-2'>
                    <p className='text-sm font-medium text-rose-500'>
                      {t('admin')}
                    </p>
                  </div>
                  {adminLinks.map(({ href, icon: Icon, label, hover }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={close}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors ${hover}`}>
                      <Icon className='size-4' />
                      {label}
                    </Link>
                  ))}
                </>
              )}

              <div className='mx-4 my-1 h-px bg-stone-100' />
              <Link
                href='/about'
                onClick={close}
                className='flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-rose-50 hover:text-rose-700'>
                <Info className='size-4' />
                {t('about')}
              </Link>
              <LogoutButton />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
