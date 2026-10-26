import { describe, expect, test } from 'bun:test'

import { fakeSupabase } from '@/utils/testing/fakeSupabase'

import { deleteMember } from './deleteMember'
import { PersonNotDeletedError } from './writeErrors'

describe('deleteMember', () => {
  test('deletes the row, then the avatar file', async () => {
    const { client, calls } = fakeSupabase((call) =>
      call.op === 'delete'
        ? { data: [{ id: 'p1' }] }
        : { data: { avatar_url: 'p1_an.jpg' } }
    )
    await expect(deleteMember(client, 'p1')).resolves.toEqual({
      fileRemoved: true
    })
    expect(calls.map((c) => c.op)).toEqual(['select', 'delete', 'remove'])
    expect(calls[2].table).toBe('storage:avatars')
    expect(calls[2].payload).toEqual([['p1_an.jpg']])
  })

  test('zero rows (RLS) throws and keeps the file', async () => {
    const { client, calls } = fakeSupabase((call) =>
      call.op === 'delete' ? { data: [] } : { data: { avatar_url: 'a.jpg' } }
    )
    await expect(deleteMember(client, 'p1')).rejects.toBeInstanceOf(
      PersonNotDeletedError
    )
    expect(calls.map((c) => c.op)).toEqual(['select', 'delete'])
  })

  test('a file error after the row is gone is only reported', async () => {
    const { client } = fakeSupabase((call) => {
      if (call.op === 'delete') return { data: [{ id: 'p1' }] }
      if (call.op === 'remove') return { error: { message: 'storage down' } }
      return { data: { avatar_url: 'a.jpg' } }
    })
    const log = console.error
    console.error = () => {}
    try {
      await expect(deleteMember(client, 'p1')).resolves.toEqual({
        fileRemoved: false
      })
    } finally {
      console.error = log
    }
  })

  test('no avatar or a path outside the avatars bucket removes nothing', async () => {
    for (const avatar_url of [
      null,
      'https://example.com/photo.jpg',
      'https://x.supabase.co/storage/v1/object/public/gallery/a.jpg'
    ]) {
      const { client, calls } = fakeSupabase((call) =>
        call.op === 'delete'
          ? { data: [{ id: 'p1' }] }
          : { data: { avatar_url } }
      )
      await deleteMember(client, 'p1')
      expect(calls.map((c) => c.op)).toEqual(['select', 'delete'])
    }
  })
})
