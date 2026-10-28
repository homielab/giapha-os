import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { removeMergedAvatar } from './mergeAvatarCleanup'
import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from './testing/fakeSupabase'

const originalError = console.error
let logged: unknown[][] = []

beforeEach(() => {
  logged = []
  console.error = (...args: unknown[]) => {
    logged.push(args)
  }
})
afterEach(() => {
  console.error = originalError
})

function client(answers: { lookup?: FakeResult; remove?: FakeResult }) {
  return fakeSupabase((call: FakeCall) => {
    if (call.table === 'persons') return answers.lookup ?? { data: [] }
    if (call.table === 'storage:avatars') return answers.remove ?? {}
    throw new Error(`unexpected call ${call.table}`)
  })
}

const removals = (calls: FakeCall[]) => calls.filter((c) => c.op === 'remove')

describe('removeMergedAvatar', () => {
  test('does nothing for a URL outside the avatars bucket', async () => {
    const { client: supabase, calls } = client({})
    const result = await removeMergedAvatar(
      supabase,
      'https://x.supabase.co/storage/v1/object/public/gallery/a.jpg'
    )
    expect(result).toEqual({ fileRemoved: false })
    expect(calls).toHaveLength(0)

    expect(
      await removeMergedAvatar(supabase, 'https://example.com/photo.jpg')
    ).toEqual({ fileRemoved: false })
    expect(await removeMergedAvatar(supabase, null)).toEqual({
      fileRemoved: false
    })
    expect(calls).toHaveLength(0)
  })

  test('keeps a file another member still references', async () => {
    const { client: supabase, calls } = client({
      lookup: { data: [{ id: 'kept' }] }
    })
    expect(await removeMergedAvatar(supabase, 'shared.jpg')).toEqual({
      fileRemoved: false
    })
    expect(calls).toHaveLength(1)
    expect(removals(calls)).toHaveLength(0)
  })

  test('removes a file nobody references any more', async () => {
    const { client: supabase, calls } = client({})
    expect(
      await removeMergedAvatar(
        supabase,
        'https://x.supabase.co/storage/v1/object/public/avatars/abc/photo.jpg'
      )
    ).toEqual({ fileRemoved: true })
    expect(calls[0].filters).toEqual([
      ['like', 'avatar_url', '%abc/photo.jpg%']
    ])
    expect(removals(calls)).toHaveLength(1)
    expect(removals(calls)[0].payload).toEqual([['abc/photo.jpg']])
  })

  test('a lookup or remove error keeps the file and does not throw', async () => {
    const lookupFails = client({
      lookup: { error: { message: 'lookup failed' } }
    })
    expect(await removeMergedAvatar(lookupFails.client, 'a.jpg')).toEqual({
      fileRemoved: false
    })
    expect(removals(lookupFails.calls)).toHaveLength(0)

    const removeFails = client({ remove: { error: { message: 'denied' } } })
    expect(await removeMergedAvatar(removeFails.client, 'a.jpg')).toEqual({
      fileRemoved: false
    })
    expect(removals(removeFails.calls)).toHaveLength(1)
    expect(logged).toHaveLength(2)
  })

  test('escapes LIKE wildcards in the path', async () => {
    const { client: supabase, calls } = client({})
    await removeMergedAvatar(supabase, 'id_1/100%_photo.jpg')
    expect(calls[0].filters).toEqual([
      ['like', 'avatar_url', '%id\\_1/100\\%\\_photo.jpg%']
    ])
  })
})
