import { describe, expect, it } from 'bun:test'

import {
  applyGenerationUpdates,
  buildDescendantGenerationUpdates,
  buildLineageUpdates,
  collectDescendants
} from '@/utils/generationUpdates'
import type { ComputedUpdate } from '@/utils/lineageCompute'
import { isMissingDatabaseFunction } from '@/utils/supabase/missingFunction'
import { fakeSupabase } from '@/utils/testing/fakeSupabase'

const MISSING = { message: 'Could not find the function', code: 'PGRST202' }

function lineageRow(
  id: string,
  changed: boolean,
  extra: Partial<ComputedUpdate> = {}
): ComputedUpdate {
  return {
    id,
    full_name: id,
    old_generation: 1,
    new_generation: 2,
    old_birth_order: null,
    new_birth_order: 1,
    old_is_in_law: false,
    new_is_in_law: false,
    gender: 'male',
    changed,
    ...extra
  }
}

const link = (parent: string, child: string, type = 'biological_child') => ({
  person_a: parent,
  person_b: child,
  type
})

describe('collectDescendants', () => {
  it('finds every descendant of a three-generation tree, nearest first', () => {
    const relationships = [
      link('root', 'son'),
      link('root', 'daughter'),
      link('son', 'grandson'),
      link('daughter', 'granddaughter'),
      link('other', 'stranger')
    ]
    expect(collectDescendants(relationships, 'root')).toEqual([
      'son',
      'daughter',
      'grandson',
      'granddaughter'
    ])
    expect(collectDescendants(relationships, 'grandson')).toEqual([])
  })

  it('follows adopted and biological children and lists a child of two parents once', () => {
    const relationships = [
      link('root', 'child'),
      link('wife', 'child'),
      link('root', 'adopted', 'adopted_child'),
      link('child', 'grandchild'),
      link('adopted', 'grandchild')
    ]
    expect(collectDescendants(relationships, 'root')).toEqual([
      'child',
      'adopted',
      'grandchild'
    ])
    expect(collectDescendants(relationships, 'wife')).toEqual([
      'child',
      'grandchild'
    ])
  })

  it('never includes the root when old data loops back to it', () => {
    const relationships = [
      link('root', 'child'),
      link('child', 'grandchild'),
      link('grandchild', 'root'),
      link('root', 'root')
    ]
    const ids = collectDescendants(relationships, 'root')
    expect(ids).toEqual(['child', 'grandchild'])
    expect(ids).not.toContain('root')
  })
})

describe('buildDescendantGenerationUpdates', () => {
  it('shifts generations, never below 1, and skips members without one', () => {
    expect(
      buildDescendantGenerationUpdates(
        [
          { id: 'a', generation: 3 },
          { id: 'b', generation: 1 },
          { id: 'c', generation: null }
        ],
        -1
      )
    ).toEqual([
      { id: 'a', generation: 2 },
      { id: 'b', generation: 1 }
    ])
  })

  it('only sends the generation column', () => {
    const [row] = buildDescendantGenerationUpdates(
      [{ id: 'a', generation: 2 }],
      2
    )
    expect(Object.keys(row).sort()).toEqual(['generation', 'id'])
  })
})

describe('buildLineageUpdates', () => {
  it('keeps changed rows with the three lineage columns', () => {
    expect(
      buildLineageUpdates([
        lineageRow('a', true, { new_generation: null, new_is_in_law: true }),
        lineageRow('b', false)
      ])
    ).toEqual([{ id: 'a', generation: null, birth_order: 1, is_in_law: true }])
  })
})

describe('isMissingDatabaseFunction', () => {
  it('recognises a function that does not exist yet', () => {
    expect(isMissingDatabaseFunction({ code: 'PGRST202' })).toBe(true)
    expect(isMissingDatabaseFunction({ code: '42883' })).toBe(true)
    expect(isMissingDatabaseFunction({ code: 'P0002' })).toBe(false)
    expect(isMissingDatabaseFunction(null)).toBe(false)
  })
})

describe('applyGenerationUpdates', () => {
  const rows = [
    { id: 'a', generation: 2 },
    { id: 'b', generation: 3 }
  ]

  it('sends every row in one rpc call', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: 2 }))
    const result = await applyGenerationUpdates(client, rows)
    expect(result).toEqual({ ok: true, count: 2, legacy: false })
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('rpc:update_generations')
    expect(calls[0].payload).toEqual({ updates: rows })
  })

  it('makes no call when there is nothing to update', async () => {
    const { client, calls } = fakeSupabase(() => ({}))
    expect(await applyGenerationUpdates(client, [])).toEqual({
      ok: true,
      count: 0,
      legacy: false
    })
    expect(calls).toHaveLength(0)
  })

  it('reports an rpc error without falling back to row updates', async () => {
    const { client, calls } = fakeSupabase(() => ({
      error: { message: 'Updated 1 of 2 members', code: 'P0002' }
    }))
    const result = await applyGenerationUpdates(client, rows)
    expect(result).toEqual({
      ok: false,
      error: 'Updated 1 of 2 members',
      legacy: false,
      failedIds: []
    })
    expect(calls).toHaveLength(1)
  })

  it('falls back to one update per member when the function is missing', async () => {
    const { client, calls } = fakeSupabase((call) =>
      call.op === 'rpc' ? { error: MISSING } : { data: [{ id: 'x' }] }
    )
    const result = await applyGenerationUpdates(client, rows)
    expect(result).toEqual({ ok: true, count: 2, legacy: true })
    const updates = calls.filter((c) => c.op === 'update')
    expect(updates.map((c) => c.payload)).toEqual([
      { generation: 2 },
      { generation: 3 }
    ])
    expect(updates.map((c) => c.filters)).toEqual([
      [['eq', 'id', 'a']],
      [['eq', 'id', 'b']]
    ])
  })

  it('reads the error of every fallback update', async () => {
    const { client } = fakeSupabase((call) => {
      if (call.op === 'rpc') return { error: { ...MISSING, code: '42883' } }
      return call.filters[0][2] === 'b'
        ? { error: { message: 'permission denied' } }
        : { data: [{ id: 'x' }] }
    })
    expect(await applyGenerationUpdates(client, rows)).toEqual({
      ok: false,
      error: 'permission denied',
      legacy: true,
      failedIds: ['b']
    })
  })

  it('counts an update that changed no row as failed (RLS)', async () => {
    const { client } = fakeSupabase((call) => {
      if (call.op === 'rpc') return { error: MISSING }
      return call.filters[0][2] === 'b' ? { data: [] } : { data: [{ id: 'x' }] }
    })
    expect(await applyGenerationUpdates(client, rows)).toEqual({
      ok: false,
      error: 'Person not updated',
      legacy: true,
      failedIds: ['b']
    })
  })
})
