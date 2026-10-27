'use client'

import { createContext } from 'react'

import type { ViewMode } from '@/utils/viewMode'

export interface MemberListViewState {
  memberModalId: string | null
  setMemberModalId: (id: string | null) => void
  showCreateMember: boolean
  setShowCreateMember: (show: boolean) => void
  showAvatar: boolean
  setShowAvatar: (show: boolean) => void
  view: ViewMode
  setView: (view: ViewMode) => void
  rootId: string | null
  setRootId: (id: string | null) => void
}

export const MemberListContext = createContext<MemberListViewState | undefined>(
  undefined
)
