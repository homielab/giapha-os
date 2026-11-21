// Supabase settings, under the names this app documents or, when those are
// empty, the names the Supabase integration of Vercel sets on a one-click
// deploy. Read on each call so tests can change process.env.

// NEXT_PUBLIC_* stay written out in full: Next.js inlines them in the
// browser bundle only when the code names them literally.
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined
}

export function supabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  )
}

/** Server only. */
export function supabaseSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    undefined
  )
}

/** Server only: the connection that runs setup and migrations (session mode). */
export function databaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    undefined
  )
}
