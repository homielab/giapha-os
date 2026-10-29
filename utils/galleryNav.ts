/** Index of the neighbour in direction `dir`, or null past either end. */
export function stepIndex(
  index: number,
  length: number,
  dir: -1 | 1
): number | null {
  const next = index + dir
  return index < 0 || next < 0 || next >= length ? null : next
}

/** Id to show after deleting `ids[index]`: the next one, else the previous, else null. */
export function idAfterDelete(ids: string[], index: number): string | null {
  return ids[index + 1] ?? (index > 0 ? ids[index - 1] : null) ?? null
}
