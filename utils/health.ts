import type { SupabaseClient } from '@supabase/supabase-js'

export interface HealthResult {
  status: 'ok' | 'error'
  database: 'ok' | 'unreachable' | 'not_configured'
}

// "permission denied": the anon role reaches Postgres but may not read the
// table, so the database is up (and the query counts as activity).
const PERMISSION_DENIED = '42501'

/**
 * Checks the database with one tiny query (no rows are returned). Called
 * daily by the Vercel cron in vercel.json, which also keeps a Supabase Free
 * project from being paused for inactivity.
 */
export async function checkHealth(
  client: SupabaseClient | null
): Promise<HealthResult> {
  if (!client) return { status: 'error', database: 'not_configured' }
  try {
    const { error } = await client
      .from('persons')
      .select('id', { head: true })
      .limit(1)
    if (error && error.code !== PERMISSION_DENIED) {
      console.error('Health check: database query failed:', error.message)
      return { status: 'error', database: 'unreachable' }
    }
    return { status: 'ok', database: 'ok' }
  } catch (err) {
    console.error('Health check: database unreachable:', err)
    return { status: 'error', database: 'unreachable' }
  }
}
