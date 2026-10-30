import { describe, expect, test } from 'bun:test'

import { PARALLEL_PAGES } from '@/utils/supabase/fetchAll'
import { fakeSupabase } from '@/utils/testing/fakeSupabase'

import { loadAllPersons } from './useAllPersons'

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), full_name: `P${i}` }))

describe('loadAllPersons', () => {
  test('pages past 1000 rows', async () => {
    // the fake answers each page with its range of the 1005 rows
    const { client, calls } = fakeSupabase(() => ({ data: rows(1005) }))
    const { data, error } = await loadAllPersons(client as never)
    expect(error).toBeNull()
    expect(data).toHaveLength(1005)
    // The full first page, then one parallel batch.
    expect(calls).toHaveLength(1 + PARALLEL_PAGES)
  })

  test('reports the error when a later page fails', async () => {
    let page = 0
    const { client } = fakeSupabase(() =>
      page++ === 0 ? { data: rows(1000) } : { error: { message: 'boom' } }
    )
    const { error } = await loadAllPersons(client as never)
    expect(error?.message).toBe('boom')
  })
})
