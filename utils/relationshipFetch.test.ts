import { describe, expect, test } from 'bun:test'

import type { Person } from '@/types'

import { fetchRelationshipData } from './relationshipFetch'
import { fakeSupabase, type FakeCall } from './testing/fakeSupabase'

const t = (key: string, values?: Record<string, string | number>) =>
  values?.name ? `${key}:${values.name}` : key

function person(id: string, gender: Person['gender'], name = id): Person {
  return { id, full_name: name, gender } as Person
}

const me = 'me'
const filter = (call: FakeCall, column: string) =>
  call.filters.find(([, c]) => c === column)

function setup(opts: {
  asA?: unknown[]
  asB?: unknown[]
  marriages?: unknown[]
  grandchildren?: unknown[]
  fail?: 'a' | 'b'
}) {
  return fakeSupabase((call) => {
    if (call.table !== 'relationships') return {}
    if (filter(call, 'person_a')?.[0] === 'eq') {
      return opts.fail === 'a'
        ? { error: { message: 'a failed' } }
        : { data: opts.asA ?? [] }
    }
    if (filter(call, 'person_b')?.[0] === 'eq') {
      return opts.fail === 'b'
        ? { error: { message: 'b failed' } }
        : { data: opts.asB ?? [] }
    }
    if (call.filters.some(([op]) => op === 'or')) {
      return { data: opts.marriages ?? [] }
    }
    return { data: opts.grandchildren ?? [] }
  })
}

describe('fetchRelationshipData', () => {
  test('gives a person with no relationships empty stats and no extra queries', async () => {
    const { client, calls } = setup({})
    const result = await fetchRelationshipData(client, me, t)
    expect(result.relationships).toEqual([])
    expect(result.stats).toEqual({
      biologicalChildren: 0,
      maleBiologicalChildren: 0,
      femaleBiologicalChildren: 0,
      paternalGrandchildren: 0,
      maternalGrandchildren: 0,
      sonInLaw: 0,
      daughterInLaw: 0
    })
    expect(calls).toHaveLength(2)
  })

  test('maps the direction from the side the person is on', async () => {
    const { client } = setup({
      asA: [
        {
          id: 'r1',
          type: 'biological_child',
          target: person('kid', 'male'),
          note: null
        },
        {
          id: 'r2',
          type: 'marriage',
          target: person('wife', 'female'),
          note: 'm. 1990'
        }
      ],
      asB: [
        {
          id: 'r3',
          type: 'adopted_child',
          target: person('dad', 'male'),
          note: null
        }
      ]
    })
    const { relationships } = await fetchRelationshipData(client, me, t)
    expect(
      relationships.map((r) => [r.id, r.direction, r.targetPerson.id, r.note])
    ).toEqual([
      ['r1', 'child', 'kid', null],
      ['r2', 'spouse', 'wife', 'm. 1990'],
      ['r3', 'parent', 'dad', null]
    ])
  })

  test('throws when either query fails', async () => {
    for (const fail of ['a', 'b'] as const) {
      const { client } = setup({ fail })
      await expect(fetchRelationshipData(client, me, t)).rejects.toMatchObject({
        message: `${fail} failed`
      })
    }
  })

  test('adds the spouses of children as in-laws with a translated note', async () => {
    const son = person('son', 'male', 'Son')
    const daughter = person('daughter', 'female', 'Daughter')
    const { client, calls } = setup({
      asA: [
        { id: 'r1', type: 'biological_child', target: son, note: null },
        { id: 'r2', type: 'biological_child', target: daughter, note: null }
      ],
      marriages: [
        {
          id: 'm1',
          type: 'marriage',
          person_a: 'son',
          person_b: 'sonwife',
          person_a_data: son,
          person_b_data: person('sonwife', 'female'),
          note: '1 year'
        },
        {
          // child stored as person_b
          id: 'm2',
          type: 'marriage',
          person_a: 'daughterhusband',
          person_b: 'daughter',
          person_a_data: person('daughterhusband', 'male'),
          person_b_data: daughter,
          note: null
        },
        {
          id: 'm3',
          type: 'marriage',
          person_a: 'son',
          person_b: 'other',
          person_a_data: son,
          person_b_data: null,
          note: null
        }
      ]
    })
    const { relationships, stats } = await fetchRelationshipData(client, me, t)

    const inLaws = relationships.filter((r) => r.direction === 'child_in_law')
    expect(inLaws.map((r) => [r.id, r.targetPerson.id, r.note])).toEqual([
      ['m1_inlaw', 'sonwife', 'daughterInLawOf:Son - 1 year'],
      ['m2_inlaw', 'daughterhusband', 'sonInLawOf:Daughter']
    ])
    expect(stats.daughterInLaw).toBe(1)
    expect(stats.sonInLaw).toBe(1)

    const orCall = calls.find((c) => c.filters.some(([op]) => op === 'or'))
    expect(orCall?.filters.find(([op]) => op === 'or')?.[2]).toBe(
      'person_a.in.(son,daughter),person_b.in.(son,daughter)'
    )
  })

  test('uses a plain spouse note when the in-law has no male/female gender', async () => {
    const kid = person('kid', 'male', 'Kid')
    const { client } = setup({
      asA: [{ id: 'r1', type: 'biological_child', target: kid, note: null }],
      marriages: [
        {
          id: 'm1',
          type: 'marriage',
          person_a: 'kid',
          person_b: 'partner',
          person_a_data: kid,
          person_b_data: person('partner', 'other'),
          note: null
        }
      ]
    })
    const { relationships } = await fetchRelationshipData(client, me, t)
    expect(relationships.at(-1)?.note).toBe('spouseOf:Kid')
  })

  test('counts biological children by gender and grandchildren by line', async () => {
    const { client } = setup({
      asA: [
        {
          id: 'r1',
          type: 'biological_child',
          target: person('son', 'male'),
          note: null
        },
        {
          id: 'r2',
          type: 'biological_child',
          target: person('daughter', 'female'),
          note: null
        },
        {
          id: 'r3',
          type: 'adopted_child',
          target: person('adopted', 'male'),
          note: null
        }
      ],
      grandchildren: [
        { id: 'g1', person_a: 'son' },
        { id: 'g2', person_a: 'son' },
        { id: 'g3', person_a: 'daughter' },
        { id: 'g4', person_a: 'adopted' }
      ]
    })
    const { stats } = await fetchRelationshipData(client, me, t)
    expect(stats).toMatchObject({
      biologicalChildren: 2,
      maleBiologicalChildren: 1,
      femaleBiologicalChildren: 1,
      // the adopted son is a male child, so his child counts on the paternal side
      paternalGrandchildren: 3,
      maternalGrandchildren: 1
    })
  })
})
