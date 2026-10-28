import { describe, expect, test } from 'bun:test'

import { dedupeRelationships } from './relationships'

describe('dedupeRelationships', () => {
  test('keeps the first of repeated relationships, in order', () => {
    const first = { type: 'marriage', person_a: 'a', person_b: 'b', note: '1' }
    const result = dedupeRelationships([
      first,
      { type: 'biological_child', person_a: 'a', person_b: 'c' },
      { type: 'marriage', person_a: 'a', person_b: 'b', note: '2' },
      { type: 'biological_child', person_a: 'a', person_b: 'c' }
    ])
    expect(result).toEqual([
      first,
      { type: 'biological_child', person_a: 'a', person_b: 'c' }
    ])
  })

  test('a marriage has no direction', () => {
    const result = dedupeRelationships([
      { type: 'marriage', person_a: 'b', person_b: 'a' },
      { type: 'marriage', person_a: 'a', person_b: 'b' }
    ])
    expect(result).toEqual([{ type: 'marriage', person_a: 'b', person_b: 'a' }])
  })

  test('parent links keep their direction and type', () => {
    const rels = [
      { type: 'biological_child', person_a: 'a', person_b: 'c' },
      { type: 'biological_child', person_a: 'c', person_b: 'a' },
      { type: 'adopted_child', person_a: 'a', person_b: 'c' }
    ]
    expect(dedupeRelationships(rels)).toEqual(rels)
  })
})
