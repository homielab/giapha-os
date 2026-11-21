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
  const documented = process.env.SUPABASE_DB_URL?.trim()
  if (documented) return documented
  // POSTGRES_URL_NON_POOLING may come from another database integration on
  // the same Vercel project (Neon, the old Vercel Postgres): use it only when
  // it names this Supabase project (postgres.<ref>@… or db.<ref>.supabase.co).
  const integration = process.env.POSTGRES_URL_NON_POOLING?.trim()
  const ref = supabaseProjectRef()
  return integration && ref && integration.includes(ref)
    ? integration
    : undefined
}

function supabaseProjectRef(): string | null {
  try {
    const host = new URL(supabaseUrl() ?? '').hostname
    return host.endsWith('.supabase.co') ? host.split('.')[0] : null
  } catch {
    return null
  }
}
