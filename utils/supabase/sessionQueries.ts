import type { SupabaseClient } from '@supabase/supabase-js'

import type { Profile } from '@/types'

// Memoizes a function for the current request. In the app this is React's
// `cache`, which keys the result by the call's arguments: every caller must
// use the same arguments (none here) to share a single result.
export type RequestCache = <A extends unknown[], R>(
  fn: (...args: A) => R
) => (...args: A) => R

// The per-request session helpers, built on an injected cache and client
// factory so they can be tested without Next.js.
export function createSessionQueries(
  cache: RequestCache,
  createSupabase: () => Promise<SupabaseClient>
) {
  // One Supabase client per request.
  const getSupabase = cache(createSupabase)

  const getUser = cache(async () => {
    const supabase = await getSupabase()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    return user
  })

  // No arguments on purpose: the layout and every page share one cache entry,
  // so a dashboard render reads the profile once.
  const getProfile = cache(async () => {
    const user = await getUser()
    if (!user) return null

    const supabase = await getSupabase()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error(`Cannot load profile for user ${user.id}:`, error.message)
    }

    return profile as Profile | null
  })

  const getIsAdmin = cache(async () => {
    const profile = await getProfile()
    return profile?.role === 'admin' && profile.is_active
  })

  return { getSupabase, getUser, getProfile, getIsAdmin }
}
