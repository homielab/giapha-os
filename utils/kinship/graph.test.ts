import { describe, expect, test } from 'bun:test'

import { buildKinshipGraph, findLca, getAncestryData } from './graph'
import type { PersonNode, RelEdge } from './types'

const node = (id: string): PersonNode => ({
  id,
  full_name: id,
  gender: 'male',
  birth_year: null,
  birth_order: null,
  generation: null,
  is_in_law: false
})
const child = (a: string, b: string, type = 'biological_child'): RelEdge => ({
  type,
  person_a: a,
  person_b: b
})

const persons = ['g', 'p', 'q', 'a', 'b', 'x'].map(node)
const rels = [
  child('g', 'p'),
  child('g', 'q', 'adopted_child'),
  child('p', 'a'),
  child('q', 'b'),
  { type: 'marriage', person_a: 'a', person_b: 'x' }
]

describe('buildKinshipGraph', () => {
  test('maps children to parents (adopted too) and spouses both ways', () => {
    const { parentMap, spouseMap } = buildKinshipGraph(persons, rels)
    expect(parentMap.get('q')).toEqual(['g'])
    expect(parentMap.get('a')).toEqual(['p'])
    expect(spouseMap.get('a')).toEqual(['x'])
    expect(spouseMap.get('x')).toEqual(['a'])
  })
})

describe('getAncestryData and findLca', () => {
  const { personsMap, parentMap } = buildKinshipGraph(persons, rels)
  const ancA = getAncestryData('a', parentMap, personsMap)
  const ancB = getAncestryData('b', parentMap, personsMap)

  test('depth and path (ancestor excluded) for each ancestor', () => {
    expect(ancA.get('a')).toEqual({ depth: 0, path: [] })
    expect(ancA.get('g')!.depth).toBe(2)
    expect(ancA.get('g')!.path.map((p) => p.id)).toEqual(['a', 'p'])
  })

  test('the common ancestor of cousins and its distance', () => {
    expect(findLca(ancA, ancB)).toEqual({ id: 'g', distance: 4 })
  })

  test('no common ancestor', () => {
    const ancX = getAncestryData('x', parentMap, personsMap)
    expect(findLca(ancA, ancX)).toBeNull()
  })

  test('the nearest common ancestor wins', () => {
    const more = [...persons, node('m')]
    const edges = [...rels, child('p', 'm'), child('m', 'b')]
    const g = buildKinshipGraph(more, edges)
    const near = findLca(
      getAncestryData('a', g.parentMap, g.personsMap),
      getAncestryData('b', g.parentMap, g.personsMap)
    )
    expect(near).toEqual({ id: 'p', distance: 3 })
  })
})
