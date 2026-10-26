'use client'

import { createContext, useCallback, useContext } from 'react'

import {
  NO_SIGNED_AVATAR_URLS,
  resolveAvatarUrl,
  type SignedAvatarUrls
} from '@/utils/avatar'

const AvatarUrlContext = createContext<SignedAvatarUrls>(NO_SIGNED_AVATAR_URLS)

// Hands the avatar URLs a server page signed in one request to every avatar
// below it. Outside a provider avatars load through `/api/avatar`.
export function AvatarUrlProvider({
  signedUrls,
  children
}: {
  signedUrls: SignedAvatarUrls
  children: React.ReactNode
}) {
  return (
    <AvatarUrlContext.Provider value={signedUrls}>
      {children}
    </AvatarUrlContext.Provider>
  )
}

/** Returns a function mapping a stored `avatar_url` to a displayable URL. */
export function useAvatarUrl() {
  const signedUrls = useContext(AvatarUrlContext)
  return useCallback(
    (value: string | null | undefined) => resolveAvatarUrl(value, signedUrls),
    [signedUrls]
  )
}
