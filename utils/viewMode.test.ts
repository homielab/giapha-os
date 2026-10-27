import { describe, expect, it } from 'bun:test'

import { parseViewMode } from './viewMode'

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
