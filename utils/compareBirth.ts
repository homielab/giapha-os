export interface BirthSortable {
  id: string
  full_name: string
  birth_order?: number | null
  birth_year?: number | null
  birth_month?: number | null
  birth_day?: number | null
}

export interface CompareBirthOptions {
  /** Let a stored birth_order win over the birth date (default true). */
  useOrder?: boolean
  /** Newest first; unknown dates still sort last (default 'asc'). */
  direction?: 'asc' | 'desc'
}

/**
 * One order for siblings everywhere (tree, lineage recompute, member list,
 * family book): birth_order, then year, month, day, then the name, then the
 * id so the result is stable. A missing value sorts after a known one.
 */
export function compareBirth(
  a: BirthSortable,
  b: BirthSortable,
  { useOrder = true, direction = 'asc' }: CompareBirthOptions = {}
): number {
  const sign = direction === 'desc' ? -1 : 1
  const keys = [
    ...(useOrder ? [[a.birth_order, b.birth_order, 1] as const] : []),
    [a.birth_year, b.birth_year, sign] as const,
    [a.birth_month, b.birth_month, sign] as const,
    [a.birth_day, b.birth_day, sign] as const
  ]
  for (const [x, y, s] of keys) {
    if (x == null && y == null) continue
    if (x == null) return 1
    if (y == null) return -1
    if (x !== y) return (x - y) * s
  }
  return (
    a.full_name.localeCompare(b.full_name, 'vi') || a.id.localeCompare(b.id)
  )
}
