const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** True when the value is a UUID of version 1-5 (any letter case). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}
