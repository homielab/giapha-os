/**
 * True when the database does not have the called function yet (its
 * migration was not run): PostgREST answers PGRST202, Postgres itself 42883.
 */
export function isMissingDatabaseFunction(
  error: { code?: string | null } | null | undefined
) {
  if (!error) return false
  return error.code === 'PGRST202' || error.code === '42883'
}
