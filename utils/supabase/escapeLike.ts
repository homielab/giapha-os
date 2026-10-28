/**
 * Escapes the LIKE wildcards `%` and `_` (and the escape character `\`) so a
 * value is matched literally inside a `.like()` / `.ilike()` pattern, e.g.
 * `.like('avatar_url', `%${escapeLike(path)}%`)`. Postgres uses `\` as the
 * default LIKE escape character.
 *
 * PostgREST turns every `*` of a like/ilike value into `%` before Postgres
 * sees it, and `\*` would become `\%` (a literal percent sign, never a
 * star), so a `*` cannot be escaped. It becomes `_` instead: one character,
 * which still matches the star itself. The match can only get slightly
 * wider, never miss the value, so "is this file still used?" checks stay on
 * the safe side.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_')
}
