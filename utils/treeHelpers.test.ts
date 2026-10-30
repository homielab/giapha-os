import { describe, expect, test } from 'bun:test'

import { Person, Relationship } from '@/types'

import {
  buildAdjacencyLists,
  buildNodeChildrenMap,
  childrenOffPath,
  computeAutoCollapsed,
  equalizeNodeHeights,
  extendPath,
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

  test('same birth year: month and day order the siblings', () => {
    const ps = [
      person('p', 'male'),
      person('An', 'male', { birth_year: 2000, birth_month: 6 }),
      person('Bình', 'male', { birth_year: 2000, birth_month: 1 })
    ]
    const a = buildAdjacencyLists(
      ['An', 'Bình'].map((c) => rel('biological_child', 'p', c)),
      new Map(ps.map((x) => [x.id, x]))
    )
    expect(a.childrenByPersonId.get('p')!.map((c) => c.id)).toEqual([
      'Bình',
      'An'
    ])
  })

  test('orders spouses by birth year, then marriage created_at, not by id', () => {
    const ps = [
      person('h', 'male'),
      person('w1', 'female', { birth_year: 1950 }),
      person('w2', 'female', { birth_year: 1960 }),
      person('w3', 'female'),
      person('w4', 'female')
    ]
    const m = (id: string, b: string, created_at: string): Relationship => ({
      ...rel('marriage', 'h', b),
      id,
      created_at
    })
    const a = buildAdjacencyLists(
      [
        m('a', 'w4', '2024-03-01'),
        m('b', 'w3', '2024-01-01'),
        m('c', 'w2', '2020-01-01'),
        m('d', 'w1', '2025-01-01')
      ],
      new Map(ps.map((x) => [x.id, x]))
    )
    const order = ['w1', 'w2', 'w3', 'w4']
    expect(a.spousesByPersonId.get('h')!.map((s) => s.person.id)).toEqual(order)
    const b = buildAdjacencyLists(
      [
        m('z', 'w1', '2025-01-01'),
        m('y', 'w3', '2024-01-01'),
        m('x', 'w4', '2024-03-01'),
        m('w', 'w2', '2020-01-01')
      ],
      new Map(ps.map((x) => [x.id, x]))
    )
    expect(b.spousesByPersonId.get('h')!.map((s) => s.person.id)).toEqual(order)
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

describe('children linked only to a spouse', () => {
  const people = [
    person('p', 'male'),
    person('s', 'female'),
    person('both', 'male', { birth_order: 1 }),
    person('onlyS', 'female', { birth_order: 2 }),
    person('onlyP', 'male', { birth_order: 3 })
  ]
  const map = new Map(people.map((x) => [x.id, x]))
  const adj = buildAdjacencyLists(
    [
      rel('marriage', 'p', 's'),
      rel('biological_child', 'p', 'both'),
      rel('biological_child', 's', 'both'),
      rel('biological_child', 's', 'onlyS'),
      rel('biological_child', 'p', 'onlyP')
    ],
    map
  )

  test('are listed under the node, once, in birth order', () => {
    const data = getFilteredTreeData('p', map, adj, noFilters)
    expect(data.children.map((c) => c.id)).toEqual(['both', 'onlyS', 'onlyP'])
  })

  test('hide filters still apply', () => {
    const data = getFilteredTreeData('p', map, adj, {
      ...noFilters,
      hideDaughters: true
    })
    expect(data.children.map((c) => c.id)).toEqual(['both', 'onlyP'])
  })

  test('are dropped with a hidden spouse', () => {
    const data = getFilteredTreeData('p', map, adj, {
      ...noFilters,
      hideDaughtersInLaw: true
    })
    expect(data.children.map((c) => c.id)).toEqual(['both', 'onlyP'])
  })

  test('buildNodeChildrenMap merges spouse children for auto-collapse', () => {
    const merged = buildNodeChildrenMap(adj)
    expect(merged.get('p')?.map((c) => c.id)).toEqual([
      'both',
      'onlyS',
      'onlyP'
    ])
    expect([...computeAutoCollapsed([{ id: 'p' }], merged, 1)].sort()).toEqual(
      []
    )
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

describe('mind map path guard', () => {
  const cyclePersons = [person('a', 'male'), person('b', 'female')]
  const cycleMap = new Map(cyclePersons.map((p) => [p.id, p]))
  const cycleAdj = buildAdjacencyLists(
    [rel('biological_child', 'a', 'b'), rel('biological_child', 'b', 'a')],
    cycleMap
  )

  // Expands every node like 'Expand all' and returns each drawn path.
  function expandAll(
    rootId: string,
    personsById: Map<string, Person>,
    adj: ReturnType<typeof buildAdjacencyLists>
  ) {
    const drawn: string[][] = []
    const walk = (id: string, ancestors: ReadonlySet<string>) => {
      if (drawn.length > 1000) throw new Error('no end')
      const path = extendPath(ancestors, id)
      drawn.push([...path])
      const data = getFilteredTreeData(id, personsById, adj, noFilters)
      childrenOffPath(data.children, path).forEach((c) => walk(c.id, path))
    }
    walk(rootId, new Set())
    return drawn
  }

  test('a two-person cycle ends and shows each person once on the path', () => {
    expect(expandAll('a', cycleMap, cycleAdj)).toEqual([['a'], ['a', 'b']])
  })

  test('a self-parent is not drawn under itself', () => {
    const self = new Map([['s', person('s', 'male')]])
    const adj = buildAdjacencyLists([rel('biological_child', 's', 's')], self)
    expect(expandAll('s', self, adj)).toEqual([['s']])
  })

  test('a tree without cycles keeps every child', () => {
    const adj = buildAdjacencyLists(relationships, personsMap)
    const children = getFilteredTreeData(
      'dad',
      personsMap,
      adj,
      noFilters
    ).children
    expect(childrenOffPath(children, new Set(['dad']))).toBe(children)
    expect(expandAll('dad', personsMap, adj)).toHaveLength(5)
  })

  test('extendPath leaves the parent path untouched', () => {
    const parent = new Set(['a'])
    expect([...extendPath(parent, 'b')]).toEqual(['a', 'b'])
    expect([...parent]).toEqual(['a'])
  })
})

describe('equalizeNodeHeights', () => {
  type LogEntry = { op: 'read' | 'write'; id: string; value?: string }

  /**
   * A container of `.node-container` nodes whose inner element logs every
   * `offsetHeight` read and `style.minHeight` write, in order.
   */
  function fakeTree(levels: Record<string, Record<string, number>>) {
    const log: LogEntry[] = []
    const inner = new Map<string, { style: { minHeight: string } }>()
    const nodes = Object.entries(levels).flatMap(([level, heights]) =>
      Object.entries(heights).map(([id, height]) => {
        let minHeight = ''
        const el = {
          style: {
            get minHeight() {
              return minHeight
            },
            set minHeight(value: string) {
              log.push({ op: 'write', id, value })
              minHeight = value
            }
          },
          get offsetHeight() {
            log.push({ op: 'read', id })
            return Math.max(height, parseFloat(minHeight) || 0)
          }
        }
        inner.set(id, el)
        return {
          getAttribute: (name: string) =>
            name === 'data-level' ? level : null,
          firstElementChild: el
        }
      })
    )
    const container = {
      querySelectorAll: (selector: string) => {
        expect(selector).toBe('.node-container')
        return nodes
      }
    } as unknown as HTMLElement
    const minHeight = (id: string) => inner.get(id)?.style.minHeight
    return { container, log, minHeight }
  }

  const threeLevels = {
    '0': { a: 80, b: 120 },
    '1': { c: 60, d: 90, e: 75 },
    '2': { f: 100 }
  }

  test('reads only after all writes of the reset: one layout per call', () => {
    const { container, log } = fakeTree(threeLevels)
    equalizeNodeHeights(container)

    // A read right after a write forces a layout; there must be only one.
    const forcedLayouts = log.filter(
      (entry, i) => entry.op === 'read' && log[i - 1]?.op === 'write'
    )
    expect(forcedLayouts).toHaveLength(1)

    const firstRead = log.findIndex((entry) => entry.op === 'read')
    const lastRead = log.findLastIndex((entry) => entry.op === 'read')
    expect(log.slice(0, firstRead).every((e) => e.value === '0px')).toBe(true)
    expect(
      log.slice(firstRead, lastRead + 1).every((e) => e.op === 'read')
    ).toBe(true)
    expect(log.slice(lastRead + 1).every((e) => e.op === 'write')).toBe(true)
  })

  test('measures each node exactly once', () => {
    const { container, log } = fakeTree(threeLevels)
    equalizeNodeHeights(container)

    const reads = log.filter((entry) => entry.op === 'read').map((e) => e.id)
    expect(reads.sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  test('sets every node to the tallest natural height of its level', () => {
    const { container, minHeight } = fakeTree(threeLevels)
    equalizeNodeHeights(container)
    // A second run starts from the stretched heights and must not grow them.
    equalizeNodeHeights(container)

    expect(['a', 'b'].map(minHeight)).toEqual(['120px', '120px'])
    expect(['c', 'd', 'e'].map(minHeight)).toEqual(['90px', '90px', '90px'])
    expect(minHeight('f')).toBe('100px')
  })

  test('leaves a level of zero height reset, not stretched', () => {
    const { container, minHeight } = fakeTree({
      '0': { a: 50 },
      '1': { hidden1: 0, hidden2: 0 }
    })
    equalizeNodeHeights(container)

    expect(minHeight('a')).toBe('50px')
    expect(minHeight('hidden1')).toBe('0px')
    expect(minHeight('hidden2')).toBe('0px')
  })
})
