import { describe, expect, test } from 'bun:test'

import { emptyBulkChildRow } from '@/components/relationship/relationshipTypes'
import { Person } from '@/types'
import { MAX_NAME, MAX_NOTE, TextTooLongError } from '@/utils/limits'
import { memberSearchCache } from '@/utils/memberSearchCache'
import {
  addRelationshipWithTargetSync,
  bulkCreateChildren,
  createSpouseWithMarriage,
  deleteRelationship
} from '@/utils/relationshipMutations'
import { RelationshipValidationError } from '@/utils/relationshipValidation'
import {
  FakeCall,
  FakeResult,
  fakeSupabase
} from '@/utils/testing/fakeSupabase'
import {
  PersonNotCreatedError,
  PersonNotUpdatedError,
  PersonOrphanedError,
  RelationshipNotDeletedError
} from '@/utils/writeErrors'

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

describe('bulkCreateChildren row checks', () => {
  const year = new Date().getFullYear()
  const cases: [string, string, string, string][] = [
    ['12abc', '12abc', '', 'invalidBirthYear'],
    ['-5', '-5', '', 'invalidBirthYear'],
    ['1990.5', '1990.5', '', 'invalidBirthYear'],
    ['0', '0', '', 'invalidBirthYear'],
    ['2099', '2099', '', 'birthYearInFuture'],
    ['order 0', '', '0', 'invalidBirthOrder'],
    ['order -1', '', '-1', 'invalidBirthOrder'],
    ['order 2x', '', '2x', 'invalidBirthOrder']
  ]
  for (const [label, birthYear, birthOrder, code] of cases) {
    test(`${label} is refused and nothing is saved`, async () => {
      const { client, calls } = fakeSupabase(respondWith())
      const input = bulkInput(['An', 'Bình'])
      input.children[1] = { ...input.children[1], birthYear, birthOrder }
      const error = await bulkCreateChildren(client, input).catch((e) => e)
      expect(error).toBeInstanceOf(RelationshipValidationError)
      expect(error.code).toBe(code)
      expect(error.subject).toBe('Bình')
      expect(calls).toHaveLength(0)
    })
  }

  test('a name over the backup limit is refused and nothing is saved', async () => {
    const { client, calls } = fakeSupabase(respondWith())
    const input = bulkInput(['An', 'a'.repeat(MAX_NAME + 1)])
    const error = await bulkCreateChildren(client, input).catch((e) => e)
    expect(error).toBeInstanceOf(TextTooLongError)
    expect(error).toMatchObject({ label: 'fullName', max: MAX_NAME })
    expect(calls).toHaveLength(0)
  })

  test('a name of exactly the limit (spaces around trimmed) is saved', async () => {
    const { client } = fakeSupabase(respondWith())
    const input = bulkInput([` ${'a'.repeat(MAX_NAME)} `])
    const result = await bulkCreateChildren(client, input)
    expect(result.created).toBe(1)
  })

  test('empty and valid values are saved', async () => {
    const { client, calls } = fakeSupabase(respondWith())
    const input = bulkInput(['An', 'Bình'])
    input.children[0] = { ...input.children[0], birthYear: ' 1990 ' }
    input.children[1] = {
      ...input.children[1],
      birthYear: String(year),
      birthOrder: '2'
    }
    const result = await bulkCreateChildren(client, input)
    expect(result.created).toBe(2)
    const inserts = calls.filter(
      (c) => c.table === 'persons' && c.op === 'insert'
    )
    expect(inserts[0].payload).toMatchObject({ birth_year: 1990 })
    expect(inserts[1].payload).toMatchObject({
      birth_year: year,
      birth_order: 2
    })
  })
})

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
    expect(result).toEqual({
      targetUpdateError: new PersonNotUpdatedError()
    })
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

describe('createSpouseWithMarriage', () => {
  const person = { id: 'p1', gender: 'male' } as Person
  const input = { person, name: 'Lan', birthYear: '', note: '' }

  test('an insert that returns no row and no error throws PersonNotCreatedError', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: null, error: null }))
    await expect(
      createSpouseWithMarriage(client, input)
    ).rejects.toBeInstanceOf(PersonNotCreatedError)
    expect(calls.some((c) => c.table === 'relationships')).toBe(false)
  })

  test('a database error is rethrown as is', async () => {
    const { client } = fakeSupabase(() => ({ data: null, error: denied }))
    await expect(createSpouseWithMarriage(client, input)).rejects.toEqual(
      denied
    )
  })

  test('a failed marriage insert removes the new person and rethrows', async () => {
    const { client, calls } = fakeSupabase((call) => {
      if (call.table === 'relationships') return { error: denied }
      if (call.op === 'delete') return { data: [{ id: 's1' }] }
      return { data: { id: 's1' } }
    })
    await expect(createSpouseWithMarriage(client, input)).rejects.toEqual(
      denied
    )
    const removed = calls.find(
      (c) => c.table === 'persons' && c.op === 'delete'
    )
    expect(removed?.filters).toContainEqual(['eq', 'id', 's1'])
  })

  test.each([
    ['refused by RLS (no row removed)', { data: [] }],
    ['failing', { error: { message: 'offline' } }]
  ])(
    'a person that could not be removed again (%s) is reported as orphaned',
    async (_case, deleteResult) => {
      const { client } = fakeSupabase((call) => {
        if (call.table === 'relationships') return { error: denied }
        if (call.op === 'delete') return deleteResult
        return { data: { id: 's1' } }
      })
      const error = await createSpouseWithMarriage(client, input).catch(
        (e) => e
      )
      expect(error).toBeInstanceOf(PersonOrphanedError)
      expect(error).toMatchObject({ personId: 's1', reason: denied.message })
    }
  )

  test('a name over the backup limit is refused and nothing is saved', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: { id: 's1' } }))
    const error = await createSpouseWithMarriage(client, {
      ...input,
      name: 'a'.repeat(MAX_NAME + 1)
    }).catch((e) => e)
    expect(error).toBeInstanceOf(TextTooLongError)
    expect(error).toMatchObject({ label: 'fullName', max: MAX_NAME })
    expect(calls).toHaveLength(0)
  })

  test('a note over the backup limit is refused and nothing is saved', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: { id: 's1' } }))
    const error = await createSpouseWithMarriage(client, {
      ...input,
      note: 'n'.repeat(MAX_NOTE + 1)
    }).catch((e) => e)
    expect(error).toMatchObject({ label: 'note', max: MAX_NOTE })
    expect(calls).toHaveLength(0)
  })

  test.each([
    ['2099', 'birthYearInFuture'],
    ['-5', 'invalidBirthYear'],
    ['12abc', 'invalidBirthYear'],
    ['1.5', 'invalidBirthYear'],
    ['1e3', 'invalidBirthYear'],
    ['0', 'invalidBirthYear']
  ])(
    'birth year %p is refused with %p and nothing is saved',
    async (birthYear, code) => {
      const { client, calls } = fakeSupabase(() => ({ data: { id: 's1' } }))
      const error = await createSpouseWithMarriage(client, {
        ...input,
        birthYear
      }).catch((e) => e)
      expect(error).toBeInstanceOf(RelationshipValidationError)
      expect(error).toMatchObject({ code })
      expect(calls).toHaveLength(0)
    }
  )

  test.each([
    ['', undefined],
    ['1950', 1950],
    [' 1950 ', 1950]
  ])('birth year %p saves %p', async (birthYear, saved) => {
    const { client, calls } = fakeSupabase(() => ({ data: { id: 's1' } }))
    await expect(
      createSpouseWithMarriage(client, { ...input, birthYear })
    ).resolves.toBe('s1')
    const insert = calls.find((c) => c.table === 'persons')
    expect(insert?.payload).toMatchObject({ full_name: 'Lan' })
    expect((insert?.payload as { birth_year?: number }).birth_year).toBe(saved)
  })
})

describe('member search cache', () => {
  const cached = () => memberSearchCache.set([{ id: 'old' } as never])

  test('adding a spouse clears it', async () => {
    cached()
    const { client } = fakeSupabase(() => ({ data: { id: 's1' } }))
    await createSpouseWithMarriage(client, {
      person: { id: 'p1', gender: 'male' } as Person,
      name: 'Lan',
      birthYear: '',
      note: ''
    })
    expect(memberSearchCache.get()).toBeNull()
  })

  test('adding several children clears it', async () => {
    cached()
    const { client } = fakeSupabase(respondWith())
    const result = await bulkCreateChildren(client, bulkInput(['An', 'Bình']))
    expect(result.created).toBe(2)
    expect(memberSearchCache.get()).toBeNull()
  })
})

describe('cycle check on a large tree', () => {
  test('finds the person among more than 1000 descendants of one parent', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      person_a: 'target',
      person_b: i === 1200 ? 'me' : `c${i}`,
      type: 'biological_child'
    }))
    const { client } = fakeSupabase((call) => {
      const parents = call.filters.find(
        ([op, col]) => op === 'in' && col === 'person_a'
      )?.[2] as string[] | undefined
      if (call.table === 'relationships' && call.range && parents) {
        // the fake cuts the rows to the requested range (≤ 1000)
        return { data: rows.filter((r) => parents.includes(r.person_a)) }
      }
      if (call.table === 'persons' && call.single) {
        return { data: { generation: null, is_in_law: null } }
      }
      if (call.op === 'update') return { data: [{ id: 'target' }] }
      return { data: [] }
    })
    await expect(
      addRelationshipWithTargetSync(client, {
        personId: 'me',
        selectedTargetId: 'target',
        direction: 'child',
        relType: 'biological_child',
        note: '',
        person: { id: 'me', generation: 4, is_in_law: false } as Person
      })
    ).rejects.toBeInstanceOf(RelationshipValidationError)
  })
})
