import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import packageJson from '@/package.json'
import { checkHealth } from '@/utils/health'
import {
  supabasePublishableKey,
  supabaseSecretKey,
  supabaseUrl
} from '@/utils/supabase/env'

// Public on purpose (uptime monitors, the Vercel cron): it reveals only
// whether the app reaches its database, never data or error details.
export const dynamic = 'force-dynamic'

function healthClient(): SupabaseClient | null {
  const url = supabaseUrl()
  // The secret key reads the table; without it the publishable key still
  // reaches the database (and gets "permission denied").
  const key = supabaseSecretKey() ?? supabasePublishableKey()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET() {
  const result = await checkHealth(healthClient())
  return NextResponse.json(
    { ...result, version: packageJson.version },
    {
      status: result.status === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' }
    }
  )
}
