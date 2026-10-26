import { describe, expect, test } from 'bun:test'

import { Person, Relationship } from '@/types'

import { buildBubbleGraph } from './bubbleGraph'

function person(id: string, gender: Person['gender'] = 'male'): Person {
  return { id, full_name: id, gender } as Person
}

function rel(type: Relationship['type'], a: string, b: string): Relationship {
  return {
    id: `${type}-${a}-${b}`,
    type,
    person_a: a,
    person_b: b,
    created_at: '',
    updated_at: ''
  }
}

function mapOf(...people: Person[]) {
  return new Map(people.map((p) => [p.id, p]))
}

describe('buildBubbleGraph', () => {
  test('returns an empty graph without roots', () => {
    const dad = person('dad')
    expect(buildBubbleGraph(mapOf(dad), [], [])).toEqual({
      nodes: [],
      links: []
    })
  })

  test('a lone root is one root node without links', () => {
    const dad = person('dad')
    const { nodes, links } = buildBubbleGraph(mapOf(dad), [], [dad])
    expect(links).toEqual([])
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: 'dad',
      isRoot: true,
      radius: 40,
      width: 80
    })
    expect(nodes[0].people).toEqual([dad])
  })

  test('builds a node per person and a link per parent-child edge', () => {
    const dad = person('dad')
    const son = person('son')
    const daughter = person('daughter', 'female')
    const grandson = person('grandson')
    const { nodes, links } = buildBubbleGraph(
      mapOf(dad, son, daughter, grandson),
      [
        rel('biological_child', 'dad', 'son'),
        rel('adopted_child', 'dad', 'daughter'),
        rel('biological_child', 'son', 'grandson')
      ],
      [dad]
    )
    expect(nodes.map((n) => n.id).sort()).toEqual([
      'dad',
      'daughter',
      'grandson',
      'son'
    ])
    expect(nodes.find((n) => n.id === 'son')).toMatchObject({
      isRoot: false,
      radius: 30,
      width: 60
    })
    expect(links).toHaveLength(3)
    expect(links).toContainEqual({
      source: 'dad',
      target: 'son',
      type: 'child'
    })
    expect(links).toContainEqual({
      source: 'son',
      target: 'grandson',
      type: 'child'
    })
  })

  test('spouses share the main person node and widen it', () => {
    const dad = person('dad')
    const mom = person('mom', 'female')
    const second = person('second', 'female')
    const { nodes } = buildBubbleGraph(
      mapOf(dad, mom, second),
      [rel('marriage', 'dad', 'mom'), rel('marriage', 'dad', 'second')],
      [dad]
    )
    expect(nodes).toHaveLength(1)
    expect(nodes[0].people.map((p) => p.id)).toEqual(['dad', 'mom', 'second'])
    expect(nodes[0].width).toBe(80 + 2 * 60)
  })

  test('terminates on a parent-child cycle', () => {
    const a = person('a')
    const b = person('b')
    const { nodes, links } = buildBubbleGraph(
      mapOf(a, b),
      [rel('biological_child', 'a', 'b'), rel('biological_child', 'b', 'a')],
      [a]
    )
    expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(links).toHaveLength(2)
  })

  test('a person reached from two parents is one node with a link from each', () => {
    const dad = person('dad')
    const mom = person('mom', 'female')
    const kid = person('kid')
    const { nodes, links } = buildBubbleGraph(
      mapOf(dad, mom, kid),
      [
        rel('biological_child', 'dad', 'kid'),
        rel('biological_child', 'mom', 'kid')
      ],
      [dad, mom]
    )
    expect(nodes.filter((n) => n.id === 'kid')).toHaveLength(1)
    expect(links.filter((l) => l.target === 'kid')).toHaveLength(2)
  })
})
