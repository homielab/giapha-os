export const VIEW_MODES = ['list', 'tree', 'mindmap', 'bubble'] as const

export type ViewMode = (typeof VIEW_MODES)[number]

export const DEFAULT_VIEW_MODE: ViewMode = 'list'

/** Reads a `?view=` value; anything unknown or missing opens the list. */
export function parseViewMode(value: string | null | undefined): ViewMode {
  return VIEW_MODES.find((mode) => mode === value) ?? DEFAULT_VIEW_MODE
}

/** Members page link that opens the family tree rooted at this person. */
export function treeViewHref(personId: string): string {
  const params = new URLSearchParams({ view: 'tree', rootId: personId })
  return `/dashboard/members?${params}`
}
