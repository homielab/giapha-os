import { describe, expect, test } from 'bun:test'

import { Person, Relationship } from '@/types'

import {
  buildAdjacencyLists,
  computeAutoCollapsed,
  getFilteredTreeData,
  TreeFilterOptions
} from './treeHelpers'

function person(
  id: string,
  gender: Person['gender'],
  extra: Partial<Person> = {}
): Person {
  return { id, full_name: id, gender, ...extra } as Person
}

function rel(
  type: Relationship['type'],
  a: string,
  b: string,
  note: string | null = null
): Relationship {
  return {
    id: `${type}-${a}-${b}`,
    type,
    person_a: a,
    person_b: b,
    note,
    created_at: '',
    updated_at: ''
  }
}

const noFilters: TreeFilterOptions = {
  hideDaughtersInLaw: false,
  hideSonsInLaw: false,
  hideDaughters: false,
  hideSons: false,
  hideMales: false,
  hideFemales: false
}

const persons = [
  person('dad', 'male'),
  person('mom', 'female'),
  person('second', 'female'),
  person('son', 'male', { birth_order: 2, birth_year: 1990 }),
  person('daughter', 'female', { birth_order: 1, birth_year: 1995 }),
  person('adopted', 'male', { birth_order: null, birth_year: 1985 }),
  person('late', 'male', { birth_order: null, birth_year: null })
]
const personsMap = new Map(persons.map((p) => [p.id, p]))
const relationships = [
  rel('marriage', 'dad', 'mom', 'first marriage'),
  rel('marriage', 'dad', 'second'),
  rel('biological_child', 'dad', 'late'),
  rel('biological_child', 'dad', 'son'),
  rel('adopted_child', 'dad', 'adopted'),
  rel('biological_child', 'dad', 'daughter'),
  rel('biological_child', 'dad', 'missing-person')
]

describe('buildAdjacencyLists', () => {
  const adj = buildAdjacencyLists(relationships, personsMap)

  test('links spouses in both directions and keeps the note', () => {
    const dadSpouses = adj.spousesByPersonId.get('dad')!
    expect(dadSpouses.map((s) => s.person.id)).toEqual(['mom', 'second'])
    expect(dadSpouses[0].note).toBe('first marriage')
    expect(adj.spousesByPersonId.get('mom')![0].person.id).toBe('dad')
  })

  test('sorts children by birth order, then birth year, unknowns last', () => {
    const ids = adj.childrenByPersonId.get('dad')!.map((c) => c.id)
    expect(ids).toEqual(['daughter', 'son', 'adopted', 'late'])
  })

  test('counts adopted children and skips unknown people', () => {
    const ids = adj.childrenByPersonId.get('dad')!.map((c) => c.id)
    expect(ids).toContain('adopted')
    expect(ids).not.toContain('missing-person')
  })
})

describe('getFilteredTreeData', () => {
  const adj = buildAdjacencyLists(relationships, personsMap)

  test('returns the person, spouses and children without filters', () => {
    const data = getFilteredTreeData('dad', personsMap, adj, noFilters)
    expect(data.person.id).toBe('dad')
    expect(data.spouses).toHaveLength(2)
    expect(data.children).toHaveLength(4)
  })

  test('hides daughters-in-law and daughters', () => {
    const data = getFilteredTreeData('dad', personsMap, adj, {
      ...noFilters,
      hideDaughtersInLaw: true,
      hideDaughters: true
    })
    expect(data.spouses).toHaveLength(0)
    expect(data.children.map((c) => c.id)).toEqual(['son', 'adopted', 'late'])
  })

  test('hideMales removes sons but keeps daughters', () => {
    const data = getFilteredTreeData('dad', personsMap, adj, {
      ...noFilters,
      hideMales: true
    })
    expect(data.children.map((c) => c.id)).toEqual(['daughter'])
  })

  test('a person with no relations gets empty lists', () => {
    const data = getFilteredTreeData('late', personsMap, adj, noFilters)
    expect(data.spouses).toEqual([])
    expect(data.children).toEqual([])
  })
})

describe('computeAutoCollapsed', () => {
  const tree = new Map<string, { id: string }[]>([
    ['root', [{ id: 'a' }, { id: 'b' }]],
    ['a', [{ id: 'a1' }]],
    ['a1', [{ id: 'a2' }]]
  ])

  test('level 0 or below collapses nothing', () => {
    expect(computeAutoCollapsed([{ id: 'root' }], tree, 0).size).toBe(0)
  })

  test('collapses people with children at or below the level', () => {
    expect([...computeAutoCollapsed([{ id: 'root' }], tree, 1)]).toEqual([
      'a',
      'a1'
    ])
    expect([...computeAutoCollapsed([{ id: 'root' }], tree, 2)]).toEqual(['a1'])
  })

  test('survives cycles in the data', () => {
    const cyclic = new Map([
      ['x', [{ id: 'y' }]],
      ['y', [{ id: 'x' }]]
    ])
    expect([...computeAutoCollapsed([{ id: 'x' }], cyclic, 1)]).toEqual(['y'])
  })
})
