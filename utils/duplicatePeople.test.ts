import { describe, expect, test } from 'bun:test'

import { findPossibleDuplicates } from './duplicatePeople'
import { fakeSupabase } from './testing/fakeSupabase'

const rows = [
  { id: '1', full_name: 'Nguyễn Văn A', birth_year: 1950 },
  { id: '2', full_name: 'Nguyễn Văn B', birth_year: 1950 },
  { id: '3', full_name: '  nguyen  van a ', birth_year: 1950 }
]

describe('findPossibleDuplicates', () => {
  test('matches the name without accents, case and extra spaces', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    const found = await findPossibleDuplicates(client, 'Nguyen Van A', 1950)
    expect(found.map((p) => p.id)).toEqual(['1', '3'])
    expect(calls[0].filters).toEqual([['eq', 'birth_year', 1950]])
  })

  test('without a birth year it looks at members without one', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    await findPossibleDuplicates(client, 'Nguyễn Văn A', null)
    expect(calls[0].filters).toEqual([['is', 'birth_year', null]])
  })

  test('an empty name matches nothing and asks nothing', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    expect(await findPossibleDuplicates(client, '   ', 1950)).toEqual([])
    expect(calls).toEqual([])
  })

  test('a failed query throws', async () => {
    const { client } = fakeSupabase(() => ({ error: { message: 'offline' } }))
    await expect(findPossibleDuplicates(client, 'A', 1950)).rejects.toEqual({
      message: 'offline'
    })
  })
})
