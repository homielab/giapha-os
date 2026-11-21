// Any value Postgres' uuid type accepts in its canonical form. No version or
// variant check: the demo seed uses ids such as 40000000-0000-0000-0000-…001.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/** True when the value is a canonical UUID other than the nil UUID (any letter case). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value) && value !== NIL_UUID
}
