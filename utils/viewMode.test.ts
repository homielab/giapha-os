import { describe, expect, it } from 'bun:test'

import { parseViewMode, treeViewHref } from './viewMode'

describe('parseViewMode', () => {
  it('keeps the four valid views', () => {
    for (const view of ['list', 'tree', 'mindmap', 'bubble'] as const) {
      expect(parseViewMode(view)).toBe(view)
    }
  })

  it('falls back to the list for missing or unknown values', () => {
    expect(parseViewMode(undefined)).toBe('list')
    expect(parseViewMode(null)).toBe('list')
    expect(parseViewMode('')).toBe('list')
    expect(parseViewMode('trees')).toBe('list')
    expect(parseViewMode('TREE')).toBe('list')
    expect(parseViewMode('constructor')).toBe('list')
  })
})

describe('treeViewHref', () => {
  it('opens the tree view rooted at the person', () => {
    const id = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
    expect(treeViewHref(id)).toBe(`/dashboard/members?view=tree&rootId=${id}`)
  })

  it('reads back as the tree view and the same root', () => {
    const href = treeViewHref('a b&c')
    const params = new URL(href, 'https://example.com').searchParams
    expect(parseViewMode(params.get('view'))).toBe('tree')
    expect(params.get('rootId')).toBe('a b&c')
  })
})
