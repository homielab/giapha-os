import { describe, expect, test } from 'bun:test'

import { remapImportIds } from '@/utils/appendImport'
import {
  buildRestorePayload,
  type ImportPayload,
  type PersonExport,
  type RelationshipExport
} from '@/utils/backupPayload'
import { isUuid } from '@/utils/uuid'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const EVENT = '44444444-4444-4444-8444-444444444444'

function person(id: string, full_name: string): PersonExport {
  return {
    id,
    full_name,
    gender: 'male',
    birth_year: 1950,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    death_lunar_year: null,
    death_lunar_month: null,
    death_lunar_day: null,
    is_deceased: false,
    is_in_law: false,
    birth_order: null,
    generation: 1,
    other_names: null,
    avatar_url: `${id}/avatar.jpg`,
    note: `Ghi chú ${full_name}`
  }
}

/** A branch from a relative: father A, his wife B, their son C. */
function branch(): ImportPayload {
  return {
    version: 5,
    persons: [
      person(A, 'Nguyễn Văn An'),
      { ...person(B, 'Trần Thị Bình'), gender: 'female' },
      person(C, 'Nguyễn Văn Cường')
    ],
    relationships: [
      {
        id: 'r1',
        type: 'marriage',
        person_a: A,
        person_b: B,
        note: 'Cưới 1970'
      },
      { id: 'r2', type: 'biological_child', person_a: A, person_b: C }
    ],
    person_details_private: [
      {
        person_id: C,
        phone_number: '0900',
        occupation: null,
        current_residence: null
      }
    ],
    custom_events: [
      {
        id: EVENT,
        name: 'Họp họ',
        content: null,
        event_date: '2026-01-01',
        location: null,
        created_by: null
      }
    ]
  }
}

const nameOf = (payload: ImportPayload, id: string) =>
  payload.persons.find((p) => p.id === id)?.full_name

const link = (payload: ImportPayload, r: RelationshipExport) =>
  `${r.type}:${nameOf(payload, r.person_a)}→${nameOf(payload, r.person_b)}`

describe('remapImportIds', () => {
  test('gives 3 people and 2 relationships new ids with the same links', () => {
    const file = branch()
    const result = remapImportIds(file)

    const ids = result.persons.map((p) => p.id)
    expect(ids.every(isUuid)).toBe(true)
    expect(new Set(ids).size).toBe(3)
    expect(ids.some((id) => [A, B, C].includes(id))).toBe(false)

    expect(result.relationships.map((r) => link(result, r))).toEqual([
      'marriage:Nguyễn Văn An→Trần Thị Bình',
      'biological_child:Nguyễn Văn An→Nguyễn Văn Cường'
    ])
    expect(result.relationships.every((r) => r.id === undefined)).toBe(true)
    expect(result.relationships[0].note).toBe('Cưới 1970')

    const cuong = result.persons.find((p) => p.full_name === 'Nguyễn Văn Cường')
    expect(result.person_details_private).toEqual([
      {
        person_id: cuong!.id,
        phone_number: '0900',
        occupation: null,
        current_residence: null
      }
    ])
    expect(result.custom_events![0].id).not.toBe(EVENT)
    expect(isUuid(result.custom_events![0].id)).toBe(true)
    // The file itself is left as it was.
    expect(file).toEqual(branch())
  })

  test('keeps notes and other fields, drops photos', () => {
    const result = remapImportIds(branch())
    expect(result.persons.map((p) => p.note)).toEqual([
      'Ghi chú Nguyễn Văn An',
      'Ghi chú Trần Thị Bình',
      'Ghi chú Nguyễn Văn Cường'
    ])
    expect(result.persons.every((p) => p.avatar_url === null)).toBe(true)
    expect(result.persons[1].gender).toBe('female')
    expect(result.persons[0].generation).toBe(1)
  })

  test('never reuses an id of the current tree', () => {
    // The generator first returns ids that already exist.
    const queue = [A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B, C, A]
    let n = 0
    const newId = () =>
      queue.shift() ??
      `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
    const taken = [A, B, C]
    const result = remapImportIds(branch(), { taken, newId })
    const ids = [
      ...result.persons.map((p) => p.id),
      ...result.custom_events!.map((e) => e.id)
    ]
    expect(ids.some((id) => taken.includes(id))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('adding the same file twice keeps the tree and makes two copies', () => {
    // A stand-in for the database: append_import only inserts rows.
    const existing = buildRestorePayload({
      persons: [person(A, 'Nguyễn Văn An'), person(B, 'Lê Văn Bảo')],
      relationships: [{ type: 'biological_child', person_a: A, person_b: B }]
    })
    const tree = {
      persons: [...existing.persons],
      relationships: [...existing.relationships]
    }
    const before = structuredClone(tree)

    for (let i = 0; i < 2; i++) {
      const taken = tree.persons.map((p) => p.id)
      const rows = buildRestorePayload(remapImportIds(branch(), { taken }))
      tree.persons.push(...rows.persons)
      tree.relationships.push(...rows.relationships)
    }

    expect(tree.persons.slice(0, 2)).toEqual(before.persons)
    expect(tree.relationships.slice(0, 1)).toEqual(before.relationships)
    expect(tree.persons).toHaveLength(2 + 3 * 2)
    expect(tree.relationships).toHaveLength(1 + 2 * 2)
    expect(new Set(tree.persons.map((p) => p.id)).size).toBe(8)
    expect(
      tree.persons.filter((p) => p.full_name === 'Nguyễn Văn Cường')
    ).toHaveLength(2)
    // Each copy's links stay inside that copy.
    const copyOf = new Map(
      tree.persons.map((p, index) => [p.id, index < 2 ? 0 : index < 5 ? 1 : 2])
    )
    for (const r of tree.relationships.slice(1))
      expect(copyOf.get(r.person_a)).toBe(copyOf.get(r.person_b))
  })

  test('a file without private details or events stays without them', () => {
    const { persons, relationships } = branch()
    const result = remapImportIds({ persons, relationships })
    expect('person_details_private' in result).toBe(false)
    expect('custom_events' in result).toBe(false)
  })
})
