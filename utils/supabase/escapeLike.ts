/**
 * Escapes the LIKE wildcards `%` and `_` (and the escape character `\`) so a
 * value is matched literally inside a `.like()` / `.ilike()` pattern, e.g.
 * `.like('avatar_url', `%${escapeLike(path)}%`)`. Postgres uses `\` as the
 * default LIKE escape character.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
