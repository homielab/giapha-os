import { describe, expect, test } from 'bun:test'

import {
  findPossibleDuplicates,
  groupPossibleDuplicates,
  type DuplicateScanPerson,
  type DuplicateScanRelationship
} from './duplicatePeople'
import { fakeSupabase } from './testing/fakeSupabase'

const rows = [
  { id: '1', full_name: 'Nguyễn Văn A', birth_year: 1950 },
  { id: '2', full_name: 'Nguyễn Văn B', birth_year: 1950 },
  { id: '3', full_name: '  nguyen  van a ', birth_year: 1950 }
]

describe('findPossibleDuplicates', () => {
  test('matches the name without accents, case and extra spaces', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    const found = await findPossibleDuplicates(client, 'Nguyen Van A', 1950)
    expect(found.map((p) => p.id)).toEqual(['1', '3'])
    expect(calls[0].filters).toEqual([['eq', 'birth_year', 1950]])
  })

  test('without a birth year it looks at members without one', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    await findPossibleDuplicates(client, 'Nguyễn Văn A', null)
    expect(calls[0].filters).toEqual([['is', 'birth_year', null]])
  })

  test('an empty name matches nothing and asks nothing', async () => {
    const { client, calls } = fakeSupabase(() => ({ data: rows }))
    expect(await findPossibleDuplicates(client, '   ', 1950)).toEqual([])
    expect(calls).toEqual([])
  })

  test('a failed query throws', async () => {
    const { client } = fakeSupabase(() => ({ error: { message: 'offline' } }))
    await expect(findPossibleDuplicates(client, 'A', 1950)).rejects.toEqual({
      message: 'offline'
    })
  })
})

function p(
  id: string,
  full_name: string,
  birth_year: number | null = null
): DuplicateScanPerson {
  return { id, full_name, birth_year, death_year: null }
}

function child(parent: string, kid: string): DuplicateScanRelationship {
  return { type: 'biological_child', person_a: parent, person_b: kid }
}

const ids = (g: { members: { id: string }[] }) => g.members.map((m) => m.id)

describe('groupPossibleDuplicates', () => {
  test('groups the same name and birth year, ignoring accents and case', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Nguyễn Văn An', 1950),
        p('2', ' nguyen  van an', 1950),
        p('3', 'Lê Bình', 1950)
      ],
      []
    )
    expect(groups.map(ids)).toEqual([['1', '2']])
  })

  test('groups the same name under the same parent', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Trần Cường', 1980),
        p('2', 'Tran Cuong', 1982),
        p('f', 'Trần Dũng', 1950)
      ],
      [child('f', '1'), child('f', '2')]
    )
    expect(groups.map(ids)).toEqual([['1', '2']])
  })

  test('does not group a different birth year without a shared parent', () => {
    const groups = groupPossibleDuplicates(
      [
        p('1', 'Trần Cường', 1980),
        p('2', 'Trần Cường', 1981),
        p('3', 'Trần Cường')
      ],
      [child('a', '1'), child('b', '2')]
    )
    expect(groups).toEqual([])
  })

  test('does not group members without a birth year on the name alone', () => {
    expect(groupPossibleDuplicates([p('1', 'An'), p('2', 'An')], [])).toEqual(
      []
    )
  })

  test('chains matches and counts relationships', () => {
    const groups = groupPossibleDuplicates(
      [p('1', 'An', 1990), p('2', 'An', 1990), p('3', 'An', 1991)],
      [
        child('f', '2'),
        child('f', '3'),
        { type: 'marriage', person_a: '2', person_b: 'w' }
      ]
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].members.map((m) => [m.id, m.relationshipCount])).toEqual([
      ['1', 0],
      ['2', 2],
      ['3', 1]
    ])
  })
})
