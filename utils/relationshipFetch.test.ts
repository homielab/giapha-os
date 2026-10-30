import { beforeEach, describe, expect, test } from 'bun:test'

import type { Person } from '@/types'

import { NO_SIGNED_AVATAR_URLS } from './avatar'
import { clearSignedAvatarCache } from './avatarSigning'
import { PERSON_LIST_COLUMNS } from './personColumns'
import {
  fetchRelationshipData,
  signRelationshipAvatars
} from './relationshipFetch'
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
  fail?: 'a' | 'b' | 'marriages' | 'grandchildren'
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
      return opts.fail === 'marriages'
        ? { error: { message: 'marriages failed' } }
        : { data: opts.marriages ?? [] }
    }
    if (opts.fail === 'grandchildren')
      return { error: { message: 'grandchildren failed' } }
    // a head-only count query: answer with the number of matching links
    const parents = filter(call, 'person_a')?.[2] as string[]
    const rows = (opts.grandchildren ?? []) as { person_a: string }[]
    return { count: rows.filter((g) => parents.includes(g.person_a)).length }
  })
}

const isCount = (call: FakeCall) => call.selectOptions?.head === true

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

  test('throws when the in-law or grandchildren query fails', async () => {
    const asA = [
      {
        id: 'r1',
        type: 'biological_child',
        target: person('kid', 'male'),
        note: null
      }
    ]
    for (const fail of ['marriages', 'grandchildren'] as const) {
      const { client } = setup({ asA, fail })
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

  test('counts grandchildren without downloading the rows', async () => {
    const { client, calls } = setup({
      asA: [
        {
          id: 'r1',
          type: 'biological_child',
          target: person('son', 'male'),
          note: null
        }
      ],
      grandchildren: [{ id: 'g1', person_a: 'son' }]
    })
    const { stats } = await fetchRelationshipData(client, me, t)
    expect(stats.paternalGrandchildren).toBe(1)
    const counts = calls.filter(isCount)
    // no daughters, so only the paternal side is queried
    expect(counts).toHaveLength(1)
    expect(counts[0].selectOptions).toEqual({ count: 'exact', head: true })
    expect(filter(counts[0], 'person_a')?.[2]).toEqual(['son'])
  })

  test('sends the in-law and grandchildren queries before any of them answers', async () => {
    let open = () => {}
    const gate = new Promise<void>((resolve) => (open = resolve))
    const { client, calls } = fakeSupabase(async (call) => {
      if (filter(call, 'person_a')?.[0] === 'eq') {
        return {
          data: [
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
            }
          ]
        }
      }
      if (filter(call, 'person_b')?.[0] === 'eq') return { data: [] }
      await gate
      return isCount(call) ? { count: 0 } : { data: [] }
    })

    const pending = fetchRelationshipData(client, me, t)
    for (let i = 0; i < 10; i++) await Promise.resolve()
    // 2 own-link queries + marriages + paternal and maternal counts
    expect(calls).toHaveLength(5)
    open()
    await pending
  })

  test('selects named columns only, never the whole person row', async () => {
    const kid = person('kid', 'male')
    const { client, calls } = setup({
      asA: [{ id: 'r1', type: 'biological_child', target: kid, note: null }]
    })
    await fetchRelationshipData(client, me, t)
    expect(calls).toHaveLength(4)
    for (const call of calls) {
      expect(call.columns).toBeDefined()
      expect(call.columns).not.toContain('*')
    }
    const embeds = calls
      .flatMap((c) => c.columns?.match(/persons![a-z_]+\(([^)]*)\)/g) ?? [])
      .map((e) => e.slice(e.indexOf('(') + 1, -1))
    expect(embeds).toHaveLength(4)
    for (const columns of embeds) {
      expect(columns).toBe(PERSON_LIST_COLUMNS)
      expect(columns).not.toContain('note')
    }
  })
})

describe('signRelationshipAvatars', () => {
  beforeEach(clearSignedAvatarCache)

  const relative = (id: string, avatar_url: string | null) => ({
    id: `r-${id}`,
    type: 'biological_child' as const,
    direction: 'child' as const,
    note: null,
    targetPerson: { ...person(id, 'male'), avatar_url }
  })

  test('signs every relative avatar in one createSignedUrls call', async () => {
    const relationships = [
      relative('p1', 'a/1.jpg'),
      relative('p2', 'a/2.jpg'),
      relative('p3', 'a/3.jpg'),
      relative('p4', 'a/4.jpg'),
      relative('p5', 'a/5.jpg'),
      relative('p6', null),
      // the same person twice (parent and spouse of a parent…)
      relative('p1', 'a/1.jpg')
    ]
    const { client, calls } = fakeSupabase((call) => ({
      data: (call.payload as [string[]])[0].map((path) => ({
        path,
        signedUrl: `https://cdn.test/${path}`,
        error: null
      }))
    }))
    const signed = await signRelationshipAvatars(client, relationships)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('storage:avatars')
    expect(calls[0].op).toBe('createSignedUrls')
    expect(Object.keys(signed.urls)).toEqual([
      'a/1.jpg',
      'a/2.jpg',
      'a/3.jpg',
      'a/4.jpg',
      'a/5.jpg'
    ])
  })

  test('falls back to /api/avatar when signing fails', async () => {
    const { client } = fakeSupabase(() => ({
      error: { message: 'denied by RLS' }
    }))
    const signed = await signRelationshipAvatars(client, [
      relative('p1', 'a/1.jpg')
    ])
    expect(signed.urls).toEqual({})
  })

  test('never throws when the storage request rejects', async () => {
    const { client } = fakeSupabase(() => {
      throw new Error('offline')
    })
    const signed = await signRelationshipAvatars(client, [
      relative('p1', 'a/1.jpg')
    ])
    expect(signed).toBe(NO_SIGNED_AVATAR_URLS)
  })
})

describe('fetchRelationshipData children in-law', () => {
  test('300 children with 1200 marriages load in chunks and pages', async () => {
    const children = Array.from({ length: 300 }, (_, i) =>
      person(`c${i}`, 'male')
    )
    const marriages = Array.from({ length: 1200 }, (_, i) => ({
      id: `m${i}`,
      type: 'marriage',
      note: null,
      person_a: `c${i % 300}`,
      person_b: `s${i}`,
      person_a_data: children[i % 300],
      person_b_data: person(`s${i}`, 'female')
    }))
    const { client, calls } = fakeSupabase((call) => {
      if (filter(call, 'person_a')?.[0] === 'eq') {
        return {
          data: children.map((c, i) => ({
            id: `r${i}`,
            type: 'biological_child',
            note: null,
            target: c
          }))
        }
      }
      if (filter(call, 'person_b')?.[0] === 'eq') return { data: [] }
      const or = call.filters.find(([op]) => op === 'or')
      if (or) {
        const ids = new Set(
          String(or[2])
            .match(/person_a\.in\.\(([^)]*)\)/)![1]
            .split(',')
        )
        // the fake cuts the rows to the requested range (≤ 1000)
        return { data: marriages.filter((m) => ids.has(m.person_a)) }
      }
      return { count: 0 }
    })

    const result = await fetchRelationshipData(client, me, t)
    const inLaws = result.relationships.filter(
      (r) => r.direction === 'child_in_law'
    )
    expect(inLaws).toHaveLength(1200)
    expect(result.stats.daughterInLaw).toBe(1200)
    const orCalls = calls.filter((c) => c.filters.some(([op]) => op === 'or'))
    // 200 + 100 children per chunk; every .or() list stays short.
    expect(orCalls.length).toBeGreaterThanOrEqual(2)
    for (const c of orCalls) {
      const expr = String(c.filters.find(([op]) => op === 'or')?.[2])
      expect(expr.split(',').length).toBeLessThanOrEqual(400)
    }
  })

  test('a marriage between two children is listed once', async () => {
    const a = person('ca', 'male')
    const b = person('cb', 'female')
    const marriage = {
      id: 'm1',
      type: 'marriage',
      note: null,
      person_a: 'ca',
      person_b: 'cb',
      person_a_data: a,
      person_b_data: b
    }
    const kids = Array.from({ length: 250 }, (_, i) => person(`k${i}`, 'male'))
    const all = [a, ...kids, b]
    const { client } = fakeSupabase((call) => {
      if (filter(call, 'person_a')?.[0] === 'eq') {
        return {
          data: all.map((c, i) => ({
            id: `r${i}`,
            type: 'biological_child',
            note: null,
            target: c
          }))
        }
      }
      if (filter(call, 'person_b')?.[0] === 'eq') return { data: [] }
      if (call.filters.some(([op]) => op === 'or')) {
        return { data: [marriage] }
      }
      return { count: 0 }
    })
    const result = await fetchRelationshipData(client, me, t)
    expect(
      result.relationships.filter((r) => r.direction === 'child_in_law')
    ).toHaveLength(1)
  })
})
