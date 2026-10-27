import { describe, expect, test } from 'bun:test'

import { fakeSupabase } from '@/utils/testing/fakeSupabase'

import { loadAllPersons } from './useAllPersons'

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), full_name: `P${i}` }))

describe('loadAllPersons', () => {
  test('pages past 1000 rows', async () => {
    let page = 0
    const { client, calls } = fakeSupabase(() => ({
      data: page++ === 0 ? rows(1000) : rows(5)
    }))
    const { data, error } = await loadAllPersons(client as never)
    expect(error).toBeNull()
    expect(data).toHaveLength(1005)
    expect(calls).toHaveLength(2)
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
