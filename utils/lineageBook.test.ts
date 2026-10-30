import { describe, expect, test } from 'bun:test'

import { Person } from '@/types'

import {
  buildLineageBook,
  burialPlaceOf,
  deathLunarDate,
  mostCommonSurname,
  type BookRelationshipRow,
  type LineageBookPerson
} from './lineageBook'
import { solarToLunar } from './lunarCalendar'
import { buildAdjacencyLists } from './treeHelpers'

const person = (over: Partial<LineageBookPerson>): LineageBookPerson => ({
  id: 'p',
  full_name: 'Nguyễn Văn An',
  gender: 'male',
  birth_year: null,
  birth_month: null,
  birth_day: null,
  death_year: null,
  death_month: null,
  death_day: null,
  death_lunar_year: null,
  death_lunar_month: null,
  death_lunar_day: null,
  is_deceased: false,
  is_in_law: false,
  birth_order: null,
  generation: null,
  other_names: null,
  note: null,
  ...over
})

const rel = (type: string, a: string, b: string): BookRelationshipRow => ({
  id: `${type}-${a}-${b}`,
  type,
  person_a: a,
  person_b: b
})

describe('mostCommonSurname', () => {
  test('the most common first token, only with two or more bearers', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Nguyễn A' }),
        person({ full_name: 'Nguyễn B' }),
        person({ full_name: 'Trần C' })
      ])
    ).toBe('Nguyễn')
    expect(mostCommonSurname([person({ full_name: 'Nguyễn A' })])).toBeNull()
  })

  test('in-laws are not counted', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Nguyễn A' }),
        person({ full_name: 'Nguyễn B' }),
        person({ full_name: 'Trần C', is_in_law: true }),
        person({ full_name: 'Trần D', is_in_law: true }),
        person({ full_name: 'Trần E', is_in_law: true })
      ])
    ).toBe('Nguyễn')
  })

  test('NFC and NFD spellings count as one surname', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Nguyễn A'.normalize('NFC') }),
        person({ full_name: 'Nguyễn B'.normalize('NFD') }),
        person({ full_name: 'Trần C' })
      ])
    ).toBe('Nguyễn')
  })

  test('a tie goes to the earliest generation', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Trần A', generation: 2 }),
        person({ full_name: 'Trần B', generation: 3 }),
        person({ full_name: 'Nguyễn C', generation: 1 }),
        person({ full_name: 'Nguyễn D', generation: 2 })
      ])
    ).toBe('Nguyễn')
  })

  test('a tie with no generation goes to the first surname by name', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Trần C' }),
        person({ full_name: 'Trần D' }),
        person({ full_name: 'Nguyễn A' }),
        person({ full_name: 'Nguyễn B' })
      ])
    ).toBe('Nguyễn')
  })

  test('a tie within the earliest generation goes to the first surname by name', () => {
    expect(
      mostCommonSurname([
        person({ full_name: 'Trần A', generation: 1 }),
        person({ full_name: 'Trần B', generation: 2 }),
        person({ full_name: 'Lê C', generation: 1 }),
        person({ full_name: 'Lê D', generation: 2 }),
        person({ full_name: 'Đỗ E', generation: 3 }),
        person({ full_name: 'Đỗ F', generation: 3 })
      ])
    ).toBe('Lê')
  })
})

describe('buildLineageBook', () => {
  const grandfather = person({
    id: 'ong',
    full_name: 'Nguyễn Văn Cả',
    generation: 1,
    birth_year: 1920
  })
  const grandmother = person({
    id: 'ba',
    full_name: 'Trần Thị Bà',
    gender: 'female',
    generation: 1,
    birth_year: 1923
  })
  const father = person({
    id: 'cha',
    full_name: 'Nguyễn Văn Hai',
    generation: 2,
    birth_order: 1,
    birth_year: 1945
  })
  const uncle = person({
    id: 'chau',
    full_name: 'Nguyễn Văn Ba',
    generation: 2,
    birth_order: 2,
    birth_year: 1950
  })
  const mother = person({
    id: 'me',
    full_name: 'Lê Thị Mẹ',
    gender: 'female',
    is_in_law: true,
    generation: 2,
    birth_year: 1948
  })
  const child1 = person({
    id: 'con1',
    full_name: 'Nguyễn Thị Con Gái',
    gender: 'female',
    generation: 3,
    birth_order: 2,
    birth_year: 1972
  })
  const child2 = person({
    id: 'con2',
    full_name: 'Nguyễn Văn Con Trai',
    generation: 3,
    birth_order: 1,
    birth_year: 1970
  })
  const child3 = person({
    id: 'con3',
    full_name: 'Đặng Văn Nuôi',
    gender: 'male',
    is_in_law: true,
    generation: 3,
    birth_year: 1971
  })
  const stranger = person({
    id: 'lac',
    full_name: 'Vô Danh',
    birth_year: 1980
  })

  const persons = [
    child1,
    child2,
    child3,
    stranger,
    father,
    uncle,
    mother,
    grandmother,
    grandfather
  ]
  const relationships = [
    rel('marriage', 'ong', 'ba'),
    rel('marriage', 'cha', 'me'),
    rel('biological_child', 'ong', 'cha'),
    rel('biological_child', 'ba', 'cha'),
    rel('biological_child', 'ong', 'chau'),
    rel('biological_child', 'ba', 'chau'),
    rel('biological_child', 'cha', 'con1'),
    rel('biological_child', 'cha', 'con2'),
    rel('adopted_child', 'cha', 'con3')
  ]

  const book = buildLineageBook(persons, relationships)

  test('generations are sorted and members follow their parents', () => {
    expect(book.generations.map((g) => g.generation)).toEqual([1, 2, 3])
    const [gen1, gen2, gen3] = book.generations.map((g) =>
      g.entries.map((e) => e.person.id)
    )
    expect(gen1).toEqual(['ong', 'ba'])
    expect(gen2).toEqual(['cha', 'chau', 'me'])
    expect(gen3).toEqual(['con2', 'con1', 'con3'])
  })

  test('siblings born in the same year follow month and day', () => {
    const b = buildLineageBook(
      [
        person({ id: 'p', generation: 1 }),
        person({
          id: 'an',
          full_name: 'An',
          generation: 2,
          birth_year: 2000,
          birth_month: 6
        }),
        person({
          id: 'binh',
          full_name: 'Bình',
          generation: 2,
          birth_year: 2000,
          birth_month: 1
        })
      ],
      [rel('biological_child', 'p', 'an'), rel('biological_child', 'p', 'binh')]
    )
    expect(b.generations[1].entries.map((e) => e.person.id)).toEqual([
      'binh',
      'an'
    ])
  })

  test('ordinals are 1-based inside each section', () => {
    expect(book.generations.map((g) => g.entries[0].ordinal)).toEqual([1, 1, 1])
    expect(book.generations[1].entries[1].ordinal).toBe(2)
  })

  test('entries carry parents, spouses and children in birth order', () => {
    const cha = book.generations[1].entries[0]
    expect(cha.parents.map((p) => p.person.id)).toEqual(['ong', 'ba'])
    expect(cha.parents.map((p) => p.label)).toEqual(['father', 'mother'])
    expect(cha.spouses.map((s) => s.person.id)).toEqual(['me'])
    expect(cha.spouses[0].label).toBe('wife')
    expect(cha.spouses[0].inLaw).toBe(true)
    // birth order first; a sibling without one sorts after those who have it
    expect(cha.children.map((c) => c.person.id)).toEqual([
      'con2',
      'con1',
      'con3'
    ])
    expect(cha.children.map((c) => c.adopted)).toEqual([false, false, true])
  })

  test('members without a generation go to the unknown section, by birth', () => {
    expect(book.unknown.map((e) => e.person.id)).toEqual(['lac'])
    expect(book.unknown[0].ordinal).toBe(1)
  })

  test('the spouse of an entry is marked in-law from the other side', () => {
    // "me" is married in: her entry lists "cha" as husband, not in-law herself
    const me = book.generations[1].entries[2]
    expect(me.spouses[0].label).toBe('husband')
    expect(me.spouses[0].inLaw).toBe(false)
  })

  test('missing birth order falls back to the birth year and name', () => {
    const a = person({
      id: 'a',
      full_name: 'Nguyễn Ả',
      generation: 4,
      birth_year: 1980
    })
    const b = person({
      id: 'b',
      full_name: 'Nguyễn B',
      generation: 4,
      birth_year: 1979
    })
    const noGenParent = person({
      id: 'gp',
      full_name: 'Nguyễn Gốc',
      generation: 3,
      birth_year: 1950
    })
    const book2 = buildLineageBook(
      [b, a, noGenParent],
      [rel('biological_child', 'gp', 'a'), rel('biological_child', 'gp', 'b')]
    )
    expect(book2.generations[0].entries.map((e) => e.person.id)).toEqual(['gp'])
    expect(book2.generations[1].entries.map((e) => e.person.id)).toEqual([
      'b',
      'a'
    ])
  })

  test('no members at all', () => {
    const empty = buildLineageBook([], [])
    expect(empty.generations).toEqual([])
    expect(empty.unknown).toEqual([])
    expect(empty.surname).toBeNull()
  })
})

describe('deathLunarDate', () => {
  test('stored lunar values win; the leap flag comes from the solar date', () => {
    const p = person({
      is_deceased: true,
      death_year: 2023,
      death_month: 4,
      death_day: 5,
      death_lunar_year: 2023,
      death_lunar_month: 2,
      death_lunar_day: 15
    })
    // 15/2 nhuận 2023 is 5/4/2023 (see the lunar calendar tests)
    expect(deathLunarDate(p)).toEqual({
      day: 15,
      month: 2,
      year: 2023,
      leap: true
    })
  })

  test('without stored lunar values the solar date is converted', () => {
    const p = person({
      is_deceased: true,
      death_year: 2020,
      death_month: 1,
      death_day: 10
    })
    const lunar = solarToLunar(2020, 1, 10)
    if (!lunar) throw new Error('solarToLunar returned null for a real date')
    expect(deathLunarDate(p)).toEqual(lunar)
  })

  test('a year alone gives none, a partial date too', () => {
    expect(
      deathLunarDate(person({ is_deceased: true, death_year: 2020 }))
    ).toBeNull()
    expect(
      deathLunarDate(
        person({ is_deceased: true, death_year: 2020, death_month: 3 })
      )
    ).toBeNull()
  })

  test('the leap flag needs the stored day and month to match the solar date', () => {
    const p = person({
      is_deceased: true,
      death_year: 2023,
      death_month: 4,
      death_day: 5,
      death_lunar_year: 2023,
      death_lunar_month: 10,
      death_lunar_day: 3
    })
    expect(deathLunarDate(p)).toEqual({
      day: 3,
      month: 10,
      year: 2023,
      leap: false
    })
  })

  test('a stored lunar date without a solar one is kept', () => {
    expect(
      deathLunarDate(
        person({
          is_deceased: true,
          death_lunar_month: 7,
          death_lunar_day: 9
        })
      )
    ).toMatchObject({ day: 9, month: 7, leap: false })
  })

  test('a living member or a member without dates has none', () => {
    expect(deathLunarDate(person({}))).toBeNull()
    expect(deathLunarDate(person({ is_deceased: true }))).toBeNull()
  })
})

describe('burialPlaceOf', () => {
  test('a deceased member with a burial place, trimmed', () => {
    expect(
      burialPlaceOf(
        person({ is_deceased: true, burial_place: '  Nghĩa trang X, xã Y ' })
      )
    ).toBe('Nghĩa trang X, xã Y')
  })

  test('none for the living, blank values or rows without the column', () => {
    expect(burialPlaceOf(person({ burial_place: 'Nghĩa trang X' }))).toBeNull()
    expect(
      burialPlaceOf(person({ is_deceased: true, burial_place: '  ' }))
    ).toBeNull()
    expect(burialPlaceOf(person({ is_deceased: true }))).toBeNull()
  })

  test('the book entry carries it', () => {
    const book = buildLineageBook(
      [
        person({
          id: 'a',
          generation: 1,
          is_deceased: true,
          burial_place: 'Nghĩa trang X'
        })
      ],
      []
    )
    expect(book.generations[0].entries[0].burialPlace).toBe('Nghĩa trang X')
  })
})

describe('spouse order', () => {
  test('same order as the tree: birth year, then created_at, not id', () => {
    const ps = [
      person({ id: 'h', generation: 1 }),
      person({ id: 'w1', gender: 'female', birth_year: 1950, is_in_law: true }),
      person({ id: 'w2', gender: 'female', is_in_law: true }),
      person({ id: 'w3', gender: 'female', is_in_law: true })
    ]
    const rels: BookRelationshipRow[] = [
      { ...rel('marriage', 'h', 'w3'), id: 'a', created_at: '2024-05-01' },
      { ...rel('marriage', 'h', 'w2'), id: 'b', created_at: '2020-01-01' },
      { ...rel('marriage', 'w1', 'h'), id: 'c', created_at: '2025-01-01' }
    ]
    const book = buildLineageBook(ps, rels)
    const entry = book.generations
      .flatMap((g) => g.entries)
      .find((e) => e.person.id === 'h')!
    const bookOrder = entry.spouses.map((s) => s.person.id)
    expect(bookOrder).toEqual(['w1', 'w2', 'w3'])
    const adj = buildAdjacencyLists(
      rels.map((r) => ({
        ...r,
        type: 'marriage',
        note: null,
        created_at: r.created_at ?? '',
        updated_at: ''
      })),
      new Map(ps.map((p) => [p.id, p as unknown as Person]))
    )
    expect(adj.spousesByPersonId.get('h')!.map((s) => s.person.id)).toEqual(
      bookOrder
    )
  })
})
