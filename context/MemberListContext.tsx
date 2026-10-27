'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { parseViewMode, type ViewMode } from '@/utils/viewMode'

import { MemberListContext } from './memberListViewContext'

function setUrlParam(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  const newUrl = new URL(window.location.href)
  if (value) {
    newUrl.searchParams.set(key, value)
  } else {
    newUrl.searchParams.delete(key)
  }
  window.history.replaceState(null, '', newUrl.toString())
}

export function MemberListProvider({
  children,
  initialView,
  initialRootId,
  initialShowAvatar
}: {
  children: React.ReactNode
  initialView?: ViewMode
  initialRootId?: string | null
  initialShowAvatar?: boolean
}) {
  const searchParams = useSearchParams()

  // Initialize state directly from URL to avoid flash of wrong view
  const [memberModalId, setMemberModalId] = useState<string | null>(
    () => searchParams.get('memberModalId') ?? null
  )
  const [showCreateMember, setShowCreateMember] = useState(false)
  const [showAvatar, setShowAvatar] = useState<boolean>(
    () => initialShowAvatar ?? searchParams.get('avatar') !== 'hide'
  )
  const [view, setViewState] = useState<ViewMode>(
    () => initialView ?? parseViewMode(searchParams.get('view'))
  )
  const [rootId, setRootIdState] = useState<string | null>(
    () => initialRootId ?? searchParams.get('rootId') ?? null
  )

  // Initialize from URL and listen to Next.js route changes
  useEffect(() => {
    const syncFromURL = () => {
      if (typeof window === 'undefined') return

      const sp = new URLSearchParams(window.location.search)

      const avatarParam = sp.get('avatar')
      setShowAvatar(avatarParam !== 'hide')

      const viewParam = sp.get('view')
      if (viewParam) setViewState(parseViewMode(viewParam))

      const rootIdParam = sp.get('rootId')
      setRootIdState(rootIdParam)

      const modalId = sp.get('memberModalId')
      setMemberModalId(modalId)
    }

    syncFromURL()
  }, [searchParams])

  // Sync to URL silently. Callbacks are stable so memoized consumers
  // (tree nodes, person cards) don't re-render when unrelated state changes.
  const updateModalId = useCallback((id: string | null) => {
    setMemberModalId(id)
    setUrlParam('memberModalId', id)
  }, [])

  const updateAvatar = useCallback((show: boolean) => {
    setShowAvatar(show)
    setUrlParam('avatar', show ? null : 'hide')
  }, [])

  const setView = useCallback((v: ViewMode) => {
    setViewState(v)
    setUrlParam('view', v)
  }, [])

  const setRootId = useCallback((id: string | null) => {
    setRootIdState(id)
    setUrlParam('rootId', id)
  }, [])

  const value = useMemo(
    () => ({
      memberModalId,
      setMemberModalId: updateModalId,
      showCreateMember,
      setShowCreateMember,
      showAvatar,
      setShowAvatar: updateAvatar,
      view,
      setView,
      rootId,
      setRootId
    }),
    [
      memberModalId,
      updateModalId,
      showCreateMember,
      showAvatar,
      updateAvatar,
      view,
      setView,
      rootId,
      setRootId
    ]
  )

  return (
    <MemberListContext.Provider value={value}>
      {children}
    </MemberListContext.Provider>
  )
}
