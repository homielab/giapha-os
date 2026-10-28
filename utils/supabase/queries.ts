import { cookies } from 'next/headers'
import { cache } from 'react'

import { createClient } from '@/utils/supabase/server'
import { createSessionQueries } from '@/utils/supabase/sessionQueries'

// Cached per request by React: one Supabase client, one auth check and one
// profile query however many server components ask for them; one person row
// per id.
export const { getSupabase, getUser, getProfile, getIsAdmin, getPersonById } =
  createSessionQueries(cache, async () => createClient(await cookies()))
