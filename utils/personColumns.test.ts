import { describe, expect, test } from 'bun:test'

import { PERSON_LIST_COLUMNS, RELATIONSHIP_COLUMNS } from './personColumns'

const columns = (list: string) => list.split(',').map((c) => c.trim())

describe('column lists', () => {
  test('relationship columns keep the link and drop note and timestamps', () => {
    expect(columns(RELATIONSHIP_COLUMNS)).toEqual([
      'id',
      'type',
      'person_a',
      'person_b'
    ])
  })
  test('person list columns drop note and timestamps', () => {
    const cols = columns(PERSON_LIST_COLUMNS)
    for (const c of ['note', 'created_at', 'updated_at'])
      expect(cols).not.toContain(c)
  })
})
