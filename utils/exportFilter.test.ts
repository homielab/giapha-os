import { describe, expect, test } from 'bun:test'

import { EXPORT_IGNORE_PROPS, keepInExport } from './exportFilter'

// html-to-image passes DOM nodes; only `dataset` matters to the filter.
const node = (dataset?: Record<string, string>) =>
  ({ dataset }) as unknown as Node

describe('keepInExport', () => {
  test('drops elements marked data-export-ignore', () => {
    expect(EXPORT_IGNORE_PROPS['data-export-ignore']).toBe('true')
    expect(keepInExport(node({ exportIgnore: 'true' }))).toBe(false)
    expect(keepInExport(node({ exportIgnore: '' }))).toBe(false)
  })

  test('keeps other elements and text nodes', () => {
    expect(keepInExport(node({}))).toBe(true)
    expect(keepInExport(node({ level: '2' }))).toBe(true)
    expect(keepInExport(node())).toBe(true)
  })
})
