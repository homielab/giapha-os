import { createServerClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { supabaseUrl as readSupabaseUrl, supabasePublishableKey } from './env'

const supabaseUrl = readSupabaseUrl()
const supabaseKey = supabasePublishableKey()

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client to avoid crashing the render if accessed before redirect
    return {
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) }),
          order: () => ({ data: null, error: null })
        }),
        insert: () => ({ error: null }),
        delete: () => ({ neq: () => ({ error: null }) })
      }),
      auth: {
        getUser: async () => ({ data: { user: null }, error: null })
      }
    } as unknown as SupabaseClient
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}
