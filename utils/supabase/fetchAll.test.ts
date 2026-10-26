import { describe, expect, test } from 'bun:test'

import { fetchAllRows, fetchAllRowsOrThrow } from './fetchAll'

// Pages of 2 rows; page `failAt` (0-based) answers with an error.
function pages(total: number, failAt = -1) {
  return async (from: number, to: number) => {
    if (Math.floor(from / 2) === failAt) {
      return { data: null, error: { message: 'network' } }
    }
    const data = Array.from({ length: total }, (_, i) => i).slice(from, to + 1)
    return { data, error: null }
  }
}

describe('fetchAllRowsOrThrow', () => {
  test('returns every row when all pages load', async () => {
    const { data } = await fetchAllRowsOrThrow(pages(5), 2)
    expect(data).toEqual([0, 1, 2, 3, 4])
  })

  test('throws when page 2 fails instead of returning the first page', async () => {
    const partial = await fetchAllRows(pages(5, 1), 2)
    expect(partial.data).toEqual([0, 1])
    expect(partial.error?.message).toBe('network')

    await expect(fetchAllRowsOrThrow(pages(5, 1), 2)).rejects.toThrow('network')
  })

  test('throws when a page request rejects', async () => {
    const build = async () => {
      throw new Error('offline')
    }
    await expect(fetchAllRowsOrThrow(build, 2)).rejects.toThrow('offline')
  })
})
