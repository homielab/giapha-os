import { describe, expect, test } from 'bun:test'

import {
  canEditCustomEvent,
  CustomEventNotAllowedError,
  deleteCustomEvent,
  saveCustomEvent
} from './customEventMutations'
import { fakeSupabase } from './testing/fakeSupabase'

const payload = {
  name: 'Họp mặt',
  event_date: '2026-12-01',
  location: null,
  content: null
}

describe('canEditCustomEvent', () => {
  test('creator and admin can edit, others cannot', () => {
    expect(canEditCustomEvent({ created_by: 'u1' }, 'u1', false)).toBe(true)
    expect(canEditCustomEvent({ created_by: 'u1' }, 'u2', true)).toBe(true)
    expect(canEditCustomEvent({ created_by: 'u1' }, 'u2', false)).toBe(false)
    expect(canEditCustomEvent({ created_by: null }, null, false)).toBe(false)
  })
})

describe('saveCustomEvent', () => {
  test('update that changes one row succeeds', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: [{ id: 'e1' }] }))
    await saveCustomEvent(client, payload, 'e1')
    expect(calls[0].op).toBe('update')
    expect(calls[0].filters).toEqual([['eq', 'id', 'e1']])
  })

  test('update that changes no row is an error', async () => {
    const { client } = fakeSupabase(() => ({ data: [] }))
    expect(saveCustomEvent(client, payload, 'e1')).rejects.toBeInstanceOf(
      CustomEventNotAllowedError
    )
  })

  test('database error is rethrown', async () => {
    const { client } = fakeSupabase(() => ({ error: { message: 'boom' } }))
    expect(saveCustomEvent(client, payload, 'e1')).rejects.toMatchObject({
      message: 'boom'
    })
  })

  test('insert needs no returned row', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: null }))
    await saveCustomEvent(client, payload)
    expect(calls[0].op).toBe('insert')
  })
})

describe('deleteCustomEvent', () => {
  test('deleted row succeeds', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: [{ id: 'e1' }] }))
    await deleteCustomEvent(client, 'e1')
    expect(calls[0].op).toBe('delete')
  })

  test('no row deleted is an error', async () => {
    const { client } = fakeSupabase(() => ({ data: [] }))
    expect(deleteCustomEvent(client, 'e1')).rejects.toBeInstanceOf(
      CustomEventNotAllowedError
    )
  })
})
