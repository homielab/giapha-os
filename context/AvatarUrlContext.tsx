'use client'

import { createContext, useCallback, useContext } from 'react'

import {
  NO_SIGNED_AVATAR_URLS,
  resolveAvatarUrl,
  type SignedAvatarUrls
} from '@/utils/avatar'

// null = no provider above: avatars load through `/api/avatar`.
const AvatarUrlContext = createContext<SignedAvatarUrls | null>(null)

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
  const signedUrls = useContext(AvatarUrlContext) ?? NO_SIGNED_AVATAR_URLS
  return useCallback(
    (value: string | null | undefined) => resolveAvatarUrl(value, signedUrls),
    [signedUrls]
  )
}

/** True below an `AvatarUrlProvider`, so a component need not sign again. */
export function useInAvatarUrlProvider() {
  return useContext(AvatarUrlContext) !== null
}
