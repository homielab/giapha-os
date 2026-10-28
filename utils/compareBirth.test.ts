import { describe, expect, test } from 'bun:test'

import { compareBirth } from './compareBirth'

const p = (
  id: string,
  extra: Partial<Parameters<typeof compareBirth>[0]> = {}
) => ({ id, full_name: id, ...extra })

const sorted = (
  list: ReturnType<typeof p>[],
  opts?: Parameters<typeof compareBirth>[2]
) => [...list].sort((a, b) => compareBirth(a, b, opts)).map((x) => x.id)

describe('compareBirth', () => {
  test('birth_order wins over the birth year', () => {
    const list = [
      p('young', { birth_order: 1, birth_year: 2005 }),
      p('old', { birth_order: 2, birth_year: 1990 })
    ]
    expect(sorted(list)).toEqual(['young', 'old'])
    expect(sorted(list, { useOrder: false })).toEqual(['old', 'young'])
  })

  test('same year: month, then day decide', () => {
    expect(
      sorted([
        p('An', { birth_year: 2000, birth_month: 6 }),
        p('Bình', { birth_year: 2000, birth_month: 1 })
      ])
    ).toEqual(['Bình', 'An'])
    expect(
      sorted([
        p('An', { birth_year: 2000, birth_month: 6, birth_day: 20 }),
        p('Bình', { birth_year: 2000, birth_month: 6, birth_day: 3 })
      ])
    ).toEqual(['Bình', 'An'])
  })

  test('a missing month or day sorts after a known one', () => {
    expect(
      sorted([
        p('An', { birth_year: 2000 }),
        p('Bình', { birth_year: 2000, birth_month: 12 })
      ])
    ).toEqual(['Bình', 'An'])
    expect(sorted([p('x'), p('y', { birth_year: 1900 })])).toEqual(['y', 'x'])
  })

  test('identical dates: name, then id for a stable order', () => {
    const same = { birth_year: 2000, birth_month: 3, birth_day: 3 }
    expect(sorted([p('Bình', same), p('An', same)])).toEqual(['An', 'Bình'])
    const twins = [
      { id: 'b', full_name: 'Cùng tên', ...same },
      { id: 'a', full_name: 'Cùng tên', ...same }
    ]
    expect(sorted(twins)).toEqual(['a', 'b'])
  })

  test('desc reverses dates but keeps unknown dates last', () => {
    expect(
      sorted(
        [
          p('none'),
          p('old', { birth_year: 1980 }),
          p('new', { birth_year: 1990 })
        ],
        { useOrder: false, direction: 'desc' }
      )
    ).toEqual(['new', 'old', 'none'])
  })
})
