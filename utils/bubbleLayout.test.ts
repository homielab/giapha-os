import { describe, expect, test } from 'bun:test'

import { Person } from '@/types'

import { GraphNode } from './bubbleGraph'
import {
  alphaDecayFor,
  avatarOffsets,
  bubbleNodeLabel,
  pinRootNodes,
  shortNodeName
} from './bubbleLayout'

const person = (name: string, birthYear: number | null = null): Person =>
  ({
    id: name,
    full_name: name,
    gender: 'male',
    birth_year: birthYear
  }) as Person

function node(
  people: Person[],
  { isRoot = false, radius = 30 } = {}
): GraphNode {
  return {
    id: people[0].id,
    people,
    radius,
    width: radius * 2 + (people.length - 1) * radius * 1.5,
    isRoot
  }
}

describe('pinRootNodes', () => {
  test('a single root sits at the centre', () => {
    const root = node([person('A')], { isRoot: true })
    const other = node([person('B')])
    pinRootNodes([root, other], 800, 600)
    expect([root.fx, root.fy]).toEqual([400, 300])
    expect(other.fx).toBeUndefined()
  })

  test('several roots are spread 150 px apart around the centre', () => {
    const roots = [
      node([person('A')], { isRoot: true }),
      node([person('B')], { isRoot: true }),
      node([person('C')], { isRoot: true })
    ]
    pinRootNodes(roots, 800, 600)
    expect(roots.map((r) => r.fx)).toEqual([250, 400, 550])
    expect(roots.every((r) => r.fy === 300)).toBe(true)
  })

  test('no roots changes nothing', () => {
    const n = node([person('A')])
    pinRootNodes([n], 800, 600)
    expect(n.fx).toBeUndefined()
  })
})

describe('alphaDecayFor', () => {
  test('keeps the default for up to 300 nodes', () => {
    expect(alphaDecayFor(0)).toBeNull()
    expect(alphaDecayFor(300)).toBeNull()
  })

  test('settles faster for large and huge families', () => {
    expect(alphaDecayFor(301)).toBe(0.04)
    expect(alphaDecayFor(1000)).toBe(0.04)
    expect(alphaDecayFor(1001)).toBe(0.06)
  })
})

describe('avatarOffsets', () => {
  test('one person is centred', () => {
    expect(avatarOffsets(node([person('A')]))).toEqual([0])
  })

  test('two people sit at the two ends of the pill', () => {
    // radius 30, width 60 + 45 = 105 -> spacing 45
    expect(avatarOffsets(node([person('A'), person('B')]))).toEqual([
      -22.5, 22.5
    ])
  })

  test('three people are evenly spaced and symmetric', () => {
    const offsets = avatarOffsets(node([person('A'), person('B'), person('C')]))
    expect(offsets).toHaveLength(3)
    expect(offsets[1]).toBe(0)
    expect(offsets[0]).toBe(-offsets[2])
  })
})

describe('shortNodeName', () => {
  test('uses the last word of each name', () => {
    expect(shortNodeName(node([person('Nguyễn Văn An')]))).toBe('An')
    expect(
      shortNodeName(node([person('Nguyễn Văn An'), person('Trần Thị Bình')]))
    ).toBe('An & Bình')
  })

  test('a single-word name is shown whole', () => {
    expect(shortNodeName(node([person('Bình')]))).toBe('Bình')
  })
})

describe('bubbleNodeLabel', () => {
  const born = (name: string, year: number) => `${name}, born ${year}`

  test('full name, with the birth year when known', () => {
    expect(bubbleNodeLabel(node([person('Nguyễn Văn An', 1950)]), born)).toBe(
      'Nguyễn Văn An, born 1950'
    )
    expect(bubbleNodeLabel(node([person('Nguyễn Văn An')]), born)).toBe(
      'Nguyễn Văn An'
    )
  })

  test('lists every person of the family unit', () => {
    expect(
      bubbleNodeLabel(
        node([person('Nguyễn Văn An', 1950), person('Trần Thị Bình')]),
        born
      )
    ).toBe('Nguyễn Văn An, born 1950 & Trần Thị Bình')
  })
})
