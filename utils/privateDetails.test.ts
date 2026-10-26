import { describe, expect, test } from 'bun:test'

import { fetchPrivateDetails } from '@/utils/privateDetails'
import { fakeSupabase } from '@/utils/testing/fakeSupabase'

describe('fetchPrivateDetails', () => {
  test('returns the stored row', async () => {
    const { client, calls } = fakeSupabase(() => ({
      data: { person_id: 'p1', phone_number: '0901' }
    }))
    expect(await fetchPrivateDetails(client, 'p1')).toEqual({
      person_id: 'p1',
      phone_number: '0901'
    })
    expect(calls[0].table).toBe('person_details_private')
    expect(calls[0].filters).toEqual([['eq', 'person_id', 'p1']])
  })

  test('no row is null, not an error', async () => {
    const { client } = fakeSupabase(() => ({ data: null }))
    expect(await fetchPrivateDetails(client, 'p1')).toBeNull()
  })

  test('a failed read throws instead of looking empty', async () => {
    const { client } = fakeSupabase(() => ({
      data: null,
      error: { message: 'network down' }
    }))
    await expect(fetchPrivateDetails(client, 'p1')).rejects.toMatchObject({
      message: 'network down'
    })
  })
})
