import { describe, expect, test } from 'bun:test'

import { emptyBulkChildRow } from '@/components/relationship/relationshipTypes'
import { Person } from '@/types'
import {
  addRelationshipWithTargetSync,
  bulkCreateChildren,
  deleteRelationship
} from '@/utils/relationshipMutations'
import {
  FakeCall,
  FakeResult,
  fakeSupabase
} from '@/utils/testing/fakeSupabase'
import { RelationshipNotDeletedError } from '@/utils/writeErrors'

const denied = { message: 'permission denied for table relationships' }

function child(name: string) {
  return { ...emptyBulkChildRow(), name }
}

function bulkInput(names: string[], otherParentId = '') {
  return {
    children: names.map(child),
    parentId: 'parent-1',
    otherParentId,
    parentGeneration: 3,
    parents: []
  }
}

// Answers person inserts with a fresh id and everything else with success,
// unless `override` returns a result for the call.
function respondWith(override?: (call: FakeCall) => FakeResult | undefined) {
  let nextId = 0
  return (call: FakeCall): FakeResult => {
    const custom = override?.(call)
    if (custom) return custom
    if (call.table === 'persons' && call.op === 'insert') {
      return { data: { id: `child-${++nextId}` } }
    }
    if (call.table === 'persons' && call.op === 'delete') {
      return { data: [{ id: 'removed' }] }
    }
    return { data: [] }
  }
}

describe('bulkCreateChildren', () => {
  test('creates every child with one insert linking both parents', async () => {
    const { client, calls } = fakeSupabase(respondWith())
    const result = await bulkCreateChildren(
      client,
      bulkInput(['An', 'Bình'], 'parent-2')
    )

    expect(result).toEqual({ created: 2, failures: [] })
    const links = calls.filter((c) => c.table === 'relationships')
    expect(links).toHaveLength(2)
    expect(links[0].payload).toEqual([
      { person_a: 'parent-1', person_b: 'child-1', type: 'biological_child' },
      { person_a: 'parent-2', person_b: 'child-1', type: 'biological_child' }
    ])
  })

  test('a failed parent link fails that child and removes the new person', async () => {
    const { client, calls } = fakeSupabase(
      respondWith((call) => {
        const payload = call.payload as { person_b: string }[] | undefined
        if (
          call.table === 'relationships' &&
          payload?.[0].person_b === 'child-2'
        ) {
          return { error: denied }
        }
      })
    )
    const result = await bulkCreateChildren(client, bulkInput(['An', 'Bình']))

    expect(result.created).toBe(1)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].child.name).toBe('Bình')
    expect(result.failures[0].error).toBe(denied.message)
    expect(result.failures[0].orphaned).toBe(false)
    const removed = calls.find(
      (c) => c.table === 'persons' && c.op === 'delete'
    )
    expect(removed?.filters).toContainEqual(['eq', 'id', 'child-2'])
  })

  test('a child that could not be removed again is reported as orphaned', async () => {
    const { client } = fakeSupabase(
      respondWith((call) => {
        if (call.table === 'relationships') return { error: denied }
        // RLS refuses a delete by matching no rows, not with an error.
        if (call.table === 'persons' && call.op === 'delete') {
          return { data: [] }
        }
      })
    )
    const result = await bulkCreateChildren(client, bulkInput(['An']))

    expect(result.created).toBe(0)
    expect(result.failures[0].orphaned).toBe(true)
  })

  test('a failed person insert fails the row without linking it', async () => {
    const { client, calls } = fakeSupabase(
      respondWith((call) =>
        call.table === 'persons' && call.op === 'insert'
          ? { error: { message: 'insert refused' } }
          : undefined
      )
    )
    const result = await bulkCreateChildren(client, bulkInput(['An']))

    expect(result).toEqual({
      created: 0,
      failures: [
        {
          child: expect.objectContaining({ name: 'An' }),
          error: 'insert refused',
          orphaned: false
        }
      ]
    })
    expect(calls.some((c) => c.table === 'relationships')).toBe(false)
  })
})

describe('addRelationshipWithTargetSync', () => {
  const person = {
    id: 'me',
    generation: 4,
    is_in_law: false
  } as unknown as Person
  const input = {
    personId: 'me',
    selectedTargetId: 'target',
    direction: 'child' as const,
    relType: 'biological_child' as const,
    note: '',
    person
  }

  function respond(override?: (call: FakeCall) => FakeResult | undefined) {
    return (call: FakeCall): FakeResult => {
      const custom = override?.(call)
      if (custom) return custom
      if (call.table === 'persons' && call.single) {
        return { data: { generation: null, is_in_law: null } }
      }
      if (call.op === 'update') return { data: [{ id: 'target' }] }
      return { data: [] }
    }
  }

  test('fills in the target generation and in-law flag', async () => {
    const { client, calls } = fakeSupabase(respond())
    const result = await addRelationshipWithTargetSync(client, input)

    expect(result).toEqual({ targetUpdateError: null })
    const update = calls.find((c) => c.op === 'update')
    expect(update?.payload).toEqual({ generation: 5, is_in_law: false })
  })

  test('a failed target update is returned, not swallowed', async () => {
    const { client } = fakeSupabase(
      respond((call) =>
        call.op === 'update'
          ? { error: { message: 'update refused' } }
          : undefined
      )
    )
    const result = await addRelationshipWithTargetSync(client, input)
    expect(result).toEqual({ targetUpdateError: 'update refused' })
  })

  test('a target update that changed no row is returned (RLS)', async () => {
    const { client } = fakeSupabase(
      respond((call) => (call.op === 'update' ? { data: [] } : undefined))
    )
    const result = await addRelationshipWithTargetSync(client, input)
    expect(result).toEqual({ targetUpdateError: 'Person not updated' })
  })

  test('a failed target read is returned as well', async () => {
    const { client, calls } = fakeSupabase(
      respond((call) =>
        call.table === 'persons' && call.single
          ? { error: { message: 'read refused' } }
          : undefined
      )
    )
    const result = await addRelationshipWithTargetSync(client, input)
    expect(result).toEqual({ targetUpdateError: 'read refused' })
    expect(calls.some((c) => c.op === 'update')).toBe(false)
  })

  test('a failed relationship insert throws', async () => {
    const { client } = fakeSupabase(
      respond((call) =>
        call.table === 'relationships' && call.op === 'insert'
          ? { error: denied }
          : undefined
      )
    )
    await expect(addRelationshipWithTargetSync(client, input)).rejects.toEqual(
      denied
    )
  })
})

describe('deleteRelationship', () => {
  test('deletes the relationship and checks the removed row', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: [{ id: 'rel-1' }] }))
    await deleteRelationship(client, 'rel-1')
    expect(calls[0].op).toBe('delete')
    expect(calls[0].filters).toEqual([['eq', 'id', 'rel-1']])
  })

  test('zero removed rows (RLS) throws RelationshipNotDeletedError', async () => {
    const { client } = fakeSupabase(() => ({ data: [] }))
    await expect(deleteRelationship(client, 'rel-1')).rejects.toBeInstanceOf(
      RelationshipNotDeletedError
    )
  })

  test('a database error is thrown as is', async () => {
    const error = { message: 'offline' }
    const { client } = fakeSupabase(() => ({ error }))
    await expect(deleteRelationship(client, 'rel-1')).rejects.toEqual(error)
  })
})
