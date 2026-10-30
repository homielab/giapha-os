// Vercel rejects a function request body over 4.5 MB with a bare 413 before
// the server action runs, whatever `bodySizeLimit` says. The payload is sent
// as JSON, so its encoded size is what counts; a margin covers the
// server-action envelope.
export const VERCEL_RESTORE_MAX_BYTES = 4_400_000

/** Byte limit for a restore payload on this host, or null for none. */
export function restoreMaxBytes(
  env: Record<string, string | undefined> = process.env
): number | null {
  return env.VERCEL ? VERCEL_RESTORE_MAX_BYTES : null
}

/** True when `payload` is too large to send to a host limited to `maxBytes`. */
export function restorePayloadTooLarge(
  payload: unknown,
  maxBytes: number | null
): boolean {
  if (maxBytes == null) return false
  return new TextEncoder().encode(JSON.stringify(payload)).length > maxBytes
}
