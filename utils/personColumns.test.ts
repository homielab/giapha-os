import { describe, expect, test } from 'bun:test'

import { Person } from '@/types'

import { sortPersonsByGeneration, sortPersonsFlat } from './memberSorting'
import { PERSON_LIST_COLUMNS, RELATIONSHIP_COLUMNS } from './personColumns'

const columns = (list: string) => list.split(',').map((c) => c.trim())

describe('column lists', () => {
  test('relationship columns keep the link and created_at (spouse order), drop note', () => {
    expect(columns(RELATIONSHIP_COLUMNS)).toEqual([
      'id',
      'type',
      'person_a',
      'person_b',
      'created_at'
    ])
  })
  test('person list columns drop note and created_at', () => {
    const cols = columns(PERSON_LIST_COLUMNS)
    for (const c of ['note', 'created_at']) expect(cols).not.toContain(c)
  })
  test('person list columns carry every field the member sorting reads', () => {
    const read = new Set<string>()
    const make = (id: string, extra: Partial<Person> = {}) =>
      new Proxy({ id, full_name: id, ...extra } as Person, {
        get(target, key, receiver) {
          if (typeof key === 'string') read.add(key)
          return Reflect.get(target, key, receiver)
        }
      })
    const persons = [
      make('a', { is_in_law: false }),
      make('b', { is_in_law: true }),
      make('c', { is_in_law: false })
    ]
    const map = new Map(persons.map((p) => [p.id, p]))
    const parentsOf = new Map([['c', ['a']]])
    const spousesOf = new Map([
      ['a', ['b']],
      ['b', ['a']]
    ])
    for (const option of [
      'birth_asc',
      'birth_desc',
      'name_asc',
      'name_desc',
      'updated_desc',
      'updated_asc'
    ])
      sortPersonsFlat(persons, option)
    for (const option of ['birth_asc', 'name_asc', 'updated_desc'])
      sortPersonsByGeneration(persons, option, map, parentsOf, spousesOf)

    const cols = columns(PERSON_LIST_COLUMNS)
    for (const field of ['updated_at', 'birth_year', 'full_name'])
      expect(read).toContain(field)
    for (const field of read) expect(cols).toContain(field)
  })
})
