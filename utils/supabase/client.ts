import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

import { supabaseUrl as readSupabaseUrl, supabasePublishableKey } from './env'

const supabaseUrl = readSupabaseUrl()
const supabaseKey = supabasePublishableKey()

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client to avoid crashing the render if accessed before redirect
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({
          data: null,
          error: new Error('Missing Supabase configuration')
        }),
        signUp: async () => ({
          data: null,
          error: new Error('Missing Supabase configuration')
        })
      }
    } as unknown as SupabaseClient
  }
  return createBrowserClient(supabaseUrl, supabaseKey)
}
