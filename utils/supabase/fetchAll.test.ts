import { describe, expect, test } from 'bun:test'

import { fetchAllRows, fetchAllRowsOrThrow, PARALLEL_PAGES } from './fetchAll'

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

// Pages of 2 rows that resolve after a tick; records calls and peak in-flight.
function trackedPages(total: number, failAt = -1) {
  const calls: number[] = []
  let inFlight = 0
  let maxInFlight = 0
  const build = async (from: number, to: number) => {
    const page = Math.floor(from / 2)
    calls.push(page)
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    // Later pages answer first, so the result order cannot follow arrival.
    await new Promise((resolve) => setTimeout(resolve, 10 - (page % 5)))
    inFlight--
    if (page === failAt) return { data: null, error: { message: 'network' } }
    const data = Array.from({ length: total }, (_, i) => i).slice(from, to + 1)
    return { data, error: null }
  }
  return { build, calls, peak: () => maxInFlight }
}

describe('fetchAllRows paging', () => {
  test('a short first page takes one more request to confirm the end', async () => {
    const src = trackedPages(1)
    const { data, error } = await fetchAllRows(src.build, 2)
    expect(data).toEqual([0])
    expect(error).toBeNull()
    expect(src.calls).toEqual([0, 0])
  })

  test('a server capped at 500 rows per page still returns all 1200 rows', async () => {
    const all = Array.from({ length: 1200 }, (_, i) => i)
    const ranges: [number, number][] = []
    const build = async (from: number, to: number) => {
      ranges.push([from, to])
      return {
        data: all.slice(from, Math.min(to + 1, from + 500)),
        error: null
      }
    }
    const { data, error } = await fetchAllRows(build, 1000)
    expect(error).toBeNull()
    expect(data).toEqual(all)
    expect(ranges[0]).toEqual([0, 999])
    expect(ranges[1]).toEqual([500, 999])
  })

  test('a full first page and a short second page take two rounds', async () => {
    const src = trackedPages(3)
    const { data } = await fetchAllRows(src.build, 2)
    expect(data).toEqual([0, 1, 2])
    // Page 0 alone, then one parallel batch starting at page 1.
    expect(src.calls[0]).toBe(0)
    expect(src.calls.slice(1)).toEqual(
      Array.from({ length: PARALLEL_PAGES }, (_, i) => i + 1)
    )
  })

  test('nine pages load in parallel batches, in page order', async () => {
    const src = trackedPages(17)
    const { data, error } = await fetchAllRows(src.build, 2)
    expect(error).toBeNull()
    expect(data).toEqual(Array.from({ length: 17 }, (_, i) => i))
    expect(src.calls).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(src.peak()).toBeGreaterThanOrEqual(2)
    expect(src.peak()).toBeLessThanOrEqual(PARALLEL_PAGES)
  })

  test('an exact multiple of the page size stops at the empty page', async () => {
    const src = trackedPages(4)
    const { data, error } = await fetchAllRows(src.build, 2)
    expect(data).toEqual([0, 1, 2, 3])
    expect(error).toBeNull()
  })

  test('a failed page in a parallel batch keeps only the pages before it', async () => {
    const partial = await fetchAllRows(trackedPages(17, 3).build, 2)
    expect(partial.data).toEqual([0, 1, 2, 3, 4, 5])
    expect(partial.error?.message).toBe('network')

    await expect(
      fetchAllRowsOrThrow(trackedPages(17, 3).build, 2)
    ).rejects.toThrow('network')
  })

  test('a rejected page in a parallel batch is reported as an error', async () => {
    const build = async (from: number, to: number) => {
      if (from === 4) throw new Error('offline')
      return { data: [from, to], error: null }
    }
    const partial = await fetchAllRows(build, 2)
    expect(partial.data).toEqual([0, 1, 2, 3])
    expect(partial.error?.message).toBe('offline')
  })
})
