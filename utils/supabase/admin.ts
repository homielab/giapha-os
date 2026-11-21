import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { supabaseUrl as readSupabaseUrl, supabaseSecretKey } from './env'

export function getAdminSupabase(): SupabaseClient {
  const supabaseUrl = readSupabaseUrl()
  const serviceRoleKey = supabaseSecretKey()
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
