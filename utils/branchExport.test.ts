import { describe, expect, it } from 'bun:test'

import { filterBranch, subtreePersonIds } from '@/utils/branchExport'

const rel = (type: string, a: string, b: string) => ({
  type,
  person_a: a,
  person_b: b
})

const rels = [
  rel('biological_child', 'grandpa', 'root'),
  rel('marriage', 'root', 'wife'),
  rel('biological_child', 'wife-dad', 'wife'),
  rel('biological_child', 'root', 'kid'),
  rel('adopted_child', 'root', 'adopted'),
  rel('marriage', 'kid', 'kid-spouse'),
  rel('biological_child', 'kid', 'grandkid'),
  rel('marriage', 'grandpa', 'grandma')
]

describe('subtreePersonIds', () => {
  it('takes the root, descendants (adopted too) and their spouses', () => {
    expect(Array.from(subtreePersonIds(rels, 'root')).sort()).toEqual([
      'adopted',
      'grandkid',
      'kid',
      'kid-spouse',
      'root',
      'wife'
    ])
  })

  it('leaves out the root parents and the spouse family', () => {
    const ids = subtreePersonIds(rels, 'root')
    for (const id of ['grandpa', 'grandma', 'wife-dad']) {
      expect(ids.has(id)).toBe(false)
    }
  })

  it('does not hang on cyclic data', () => {
    const cyclic = [
      rel('biological_child', 'a', 'b'),
      rel('biological_child', 'b', 'a')
    ]
    expect(Array.from(subtreePersonIds(cyclic, 'a')).sort()).toEqual(['a', 'b'])
  })

  it('takes a child linked only to a spouse, but not the spouse parents', () => {
    const data = [
      rel('marriage', 'a', 'b'),
      rel('biological_child', 'b-dad', 'b'),
      rel('biological_child', 'b', 'c'),
      rel('marriage', 'c', 'c-spouse'),
      rel('biological_child', 'c-spouse', 'd')
    ]
    expect(Array.from(subtreePersonIds(data, 'a')).sort()).toEqual([
      'a',
      'b',
      'c',
      'c-spouse',
      'd'
    ])
    const persons = ['a', 'b', 'b-dad', 'c', 'c-spouse', 'd'].map((id) => ({
      id
    }))
    const out = filterBranch({ persons, relationships: data, details: [] }, 'a')
    expect(out.persons.map((p) => p.id)).not.toContain('b-dad')
    expect(out.relationships).toContainEqual(rel('biological_child', 'b', 'c'))
  })

  it('does not hang on cyclic data through spouses', () => {
    const cyclic = [
      rel('marriage', 'a', 'b'),
      rel('biological_child', 'b', 'c'),
      rel('marriage', 'c', 'a'),
      rel('biological_child', 'c', 'b')
    ]
    expect(Array.from(subtreePersonIds(cyclic, 'a')).sort()).toEqual([
      'a',
      'b',
      'c'
    ])
  })

  it('handles a very deep chain without recursion limits', () => {
    const chain = Array.from({ length: 50000 }, (_, i) =>
      rel('biological_child', `p${i}`, `p${i + 1}`)
    )
    expect(subtreePersonIds(chain, 'p0').size).toBe(50001)
  })
})

describe('filterBranch', () => {
  const persons = ['grandpa', 'root', 'wife', 'wife-dad', 'kid'].map((id) => ({
    id
  }))
  const details = persons.map((p) => ({ person_id: p.id }))
  const data = { persons, relationships: rels, details }

  it('keeps only the branch, its relationships and private details', () => {
    const out = filterBranch(data, 'root')
    expect(out.persons.map((p) => p.id)).toEqual(['root', 'wife', 'kid'])
    expect(out.details.map((d) => d.person_id)).toEqual(['root', 'wife', 'kid'])
    expect(out.relationships).toHaveLength(5)
    expect(
      out.relationships.some((r) =>
        [r.person_a, r.person_b].some((id) =>
          ['grandpa', 'wife-dad'].includes(id)
        )
      )
    ).toBe(false)
  })

  it('exports everything when the root does not exist or is empty', () => {
    expect(filterBranch(data, 'missing')).toBe(data)
    expect(filterBranch(data, null)).toBe(data)
  })
})
