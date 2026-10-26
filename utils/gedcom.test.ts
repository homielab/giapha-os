import { describe, expect, test } from 'bun:test'

import {
  exportToGedcom,
  GedcomPerson,
  GedcomRelationship,
  parseGedcom
} from './gedcom'

function person(
  id: string,
  gender: GedcomPerson['gender'],
  extra: Partial<GedcomPerson> = {}
): GedcomPerson {
  return { id, full_name: id, gender, ...extra }
}

const child = (parent: string, kid: string): GedcomRelationship => ({
  type: 'biological_child',
  person_a: parent,
  person_b: kid
})
const adopted = (parent: string, kid: string): GedcomRelationship => ({
  type: 'adopted_child',
  person_a: parent,
  person_b: kid
})
const marriage = (a: string, b: string): GedcomRelationship => ({
  type: 'marriage',
  person_a: a,
  person_b: b
})

/** Export, re-import, and describe relationships by full name. */
function roundTrip(data: {
  persons: GedcomPerson[]
  relationships: GedcomRelationship[]
}) {
  const parsed = parseGedcom(exportToGedcom(data))
  const nameOf = new Map(parsed.persons.map((p) => [p.id, p.full_name]))
  const rels = parsed.relationships
    .map((r) => `${r.type} ${nameOf.get(r.person_a)} ${nameOf.get(r.person_b)}`)
    .sort()
  const byName = new Map(parsed.persons.map((p) => [p.full_name, p]))
  return { parsed, rels, byName }
}

describe('exportToGedcom', () => {
  test('writes a GEDCOM 7.0 header and trailer', () => {
    const ged = exportToGedcom({ persons: [], relationships: [] })
    expect(ged.startsWith('0 HEAD\n1 GEDC\n2 VERS 7.0\n')).toBe(true)
    expect(ged.endsWith('0 TRLR\n')).toBe(true)
  })

  test('uses short INDI and FAM ids', () => {
    const ged = exportToGedcom({
      persons: [
        person('3f2b8c1e-0000-4000-8000-000000000001', 'male'),
        person('3f2b8c1e-0000-4000-8000-000000000002', 'female')
      ],
      relationships: [
        marriage(
          '3f2b8c1e-0000-4000-8000-000000000001',
          '3f2b8c1e-0000-4000-8000-000000000002'
        )
      ]
    })
    expect(ged).toContain('0 @I1@ INDI')
    expect(ged).toContain('0 @I2@ INDI')
    expect(ged).toContain('0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n')
  })

  test('writes sex as M, F or U', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male'),
        person('b', 'female'),
        person('c', 'other')
      ],
      relationships: []
    })
    expect(ged.match(/1 SEX \w/g)).toEqual(['1 SEX M', '1 SEX F', '1 SEX U'])
  })

  test('writes full dates as DD MON YYYY', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          birth_year: 1945,
          birth_month: 8,
          birth_day: 2,
          is_deceased: true,
          death_year: 2010,
          death_month: 12,
          death_day: 31
        })
      ],
      relationships: []
    })
    expect(ged).toContain('1 BIRT\n2 DATE 02 AUG 1945\n')
    expect(ged).toContain('1 DEAT Y\n2 DATE 31 DEC 2010\n')
  })

  test('writes multi-line notes with CONT', () => {
    const ged = exportToGedcom({
      persons: [person('a', 'male', { note: 'Dòng 1\nDòng 2' })],
      relationships: []
    })
    expect(ged).toContain('1 NOTE Dòng 1\n2 CONT Dòng 2\n')
  })
})

describe('parseGedcom', () => {
  test('reads names, sex, qualified dates and CRLF line endings', () => {
    const ged = [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME Phạm Thị /Hoa/',
      '1 SEX F',
      '1 BIRT',
      '2 DATE ABT 1900',
      '1 DEAT',
      '2 DATE MAR 1980',
      '0 TRLR'
    ].join('\r\n')
    const [p] = parseGedcom(ged).persons
    expect(p.full_name).toBe('Phạm Thị Hoa')
    expect(p.gender).toBe('female')
    expect(p.birth_year).toBe(1900)
    expect(p.is_deceased).toBe(true)
    expect(p.death_month).toBe(3)
    expect(p.death_year).toBe(1980)
    expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/)
  })

  test('drops duplicate relationships', () => {
    const ged = [
      '0 @I1@ INDI',
      '0 @I2@ INDI',
      '0 @I3@ INDI',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      '1 CHIL @I3@',
      '0 @F2@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      '1 CHIL @I3@'
    ].join('\n')
    expect(parseGedcom(ged).relationships).toHaveLength(3)
  })

  test('ignores references to unknown individuals', () => {
    const ged = ['0 @I1@ INDI', '0 @F1@ FAM', '1 HUSB @I1@', '1 CHIL @I9@']
    expect(parseGedcom(ged.join('\n')).relationships).toEqual([])
  })
})

describe('GEDCOM round trip', () => {
  test('keeps Vietnamese names with diacritics', () => {
    const { byName } = roundTrip({
      persons: [
        person('a', 'male', { full_name: 'Nguyễn Văn An' }),
        person('b', 'female', { full_name: 'Đặng Thị Ngọc Ánh' }),
        person('c', 'male', { full_name: 'Tùng' })
      ],
      relationships: []
    })
    expect([...byName.keys()]).toEqual([
      'Nguyễn Văn An',
      'Đặng Thị Ngọc Ánh',
      'Tùng'
    ])
  })

  test('keeps gender, dates, death and notes', () => {
    const { parsed } = roundTrip({
      persons: [
        person('a', 'female', {
          birth_year: 1932,
          birth_month: 1,
          birth_day: 15,
          is_deceased: true,
          death_year: 2001,
          death_month: 7,
          death_day: 9,
          note: 'Con gái trưởng\nLấy chồng năm 1950'
        }),
        person('b', 'male', { birth_year: 1960, birth_month: 11 }),
        person('c', 'other', { birth_year: 1999 })
      ],
      relationships: []
    })
    const [a, b, c] = parsed.persons
    expect(a).toMatchObject({
      gender: 'female',
      birth_year: 1932,
      birth_month: 1,
      birth_day: 15,
      is_deceased: true,
      death_year: 2001,
      death_month: 7,
      death_day: 9,
      note: 'Con gái trưởng\nLấy chồng năm 1950'
    })
    expect(b).toMatchObject({
      gender: 'male',
      birth_year: 1960,
      birth_month: 11,
      birth_day: null,
      is_deceased: false
    })
    expect(c).toMatchObject({ gender: 'other', birth_year: 1999 })
  })

  test('keeps a deceased person without a death date', () => {
    const { parsed } = roundTrip({
      persons: [person('a', 'male', { is_deceased: true })],
      relationships: []
    })
    expect(parsed.persons[0].is_deceased).toBe(true)
    expect(parsed.persons[0].death_year).toBeNull()
  })

  test('keeps spouses and parents over three generations', () => {
    const { rels } = roundTrip({
      persons: [
        person('Ông', 'male'),
        person('Bà', 'female'),
        person('Bố', 'male'),
        person('Mẹ', 'female'),
        person('Con', 'female')
      ],
      relationships: [
        marriage('Ông', 'Bà'),
        child('Ông', 'Bố'),
        child('Bà', 'Bố'),
        marriage('Bố', 'Mẹ'),
        child('Bố', 'Con'),
        child('Mẹ', 'Con')
      ]
    })
    expect(rels).toEqual(
      [
        'marriage Ông Bà',
        'biological_child Ông Bố',
        'biological_child Bà Bố',
        'marriage Bố Mẹ',
        'biological_child Bố Con',
        'biological_child Mẹ Con'
      ].sort()
    )
  })

  test('keeps a wife-first marriage as husband and wife', () => {
    const { rels } = roundTrip({
      persons: [person('Vợ', 'female'), person('Chồng', 'male')],
      relationships: [marriage('Vợ', 'Chồng')]
    })
    expect(rels).toEqual(['marriage Chồng Vợ'])
  })

  test('keeps a single parent with children', () => {
    const { rels } = roundTrip({
      persons: [
        person('Mẹ', 'female'),
        person('Con 1', 'male'),
        person('Con 2', 'male')
      ],
      relationships: [child('Mẹ', 'Con 1'), child('Mẹ', 'Con 2')]
    })
    expect(rels).toEqual([
      'biological_child Mẹ Con 1',
      'biological_child Mẹ Con 2'
    ])
  })

  test('keeps the children of each wife with their own mother', () => {
    const { rels } = roundTrip({
      persons: [
        person('Chồng', 'male'),
        person('Vợ cả', 'female'),
        person('Vợ hai', 'female'),
        person('Con cả', 'male'),
        person('Con thứ', 'female')
      ],
      relationships: [
        marriage('Chồng', 'Vợ cả'),
        marriage('Chồng', 'Vợ hai'),
        child('Chồng', 'Con cả'),
        child('Vợ cả', 'Con cả'),
        child('Chồng', 'Con thứ'),
        child('Vợ hai', 'Con thứ')
      ]
    })
    expect(rels).toEqual(
      [
        'marriage Chồng Vợ cả',
        'marriage Chồng Vợ hai',
        'biological_child Chồng Con cả',
        'biological_child Vợ cả Con cả',
        'biological_child Chồng Con thứ',
        'biological_child Vợ hai Con thứ'
      ].sort()
    )
  })

  test('keeps a child linked only to the father out of his marriage', () => {
    const { rels } = roundTrip({
      persons: [
        person('Bố', 'male'),
        person('Mẹ kế', 'female'),
        person('Con riêng', 'male')
      ],
      relationships: [marriage('Bố', 'Mẹ kế'), child('Bố', 'Con riêng')]
    })
    expect(rels).toEqual(
      ['marriage Bố Mẹ kế', 'biological_child Bố Con riêng'].sort()
    )
  })

  test('keeps the children of a parent with gender other', () => {
    const { rels, parsed } = roundTrip({
      persons: [
        person('Cha mẹ', 'other'),
        person('Con 1', 'male'),
        person('Con 2', 'female')
      ],
      relationships: [child('Cha mẹ', 'Con 1'), child('Cha mẹ', 'Con 2')]
    })
    expect(rels).toEqual([
      'biological_child Cha mẹ Con 1',
      'biological_child Cha mẹ Con 2'
    ])
    expect(parsed.persons[0].gender).toBe('other')
  })

  test('keeps adopted children adopted', () => {
    const data = {
      persons: [
        person('Bố', 'male'),
        person('Mẹ', 'female'),
        person('Con ruột', 'male'),
        person('Con nuôi', 'female'),
        person('Con riêng', 'male')
      ],
      relationships: [
        marriage('Bố', 'Mẹ'),
        child('Bố', 'Con ruột'),
        child('Mẹ', 'Con ruột'),
        adopted('Bố', 'Con nuôi'),
        adopted('Mẹ', 'Con nuôi'),
        child('Bố', 'Con riêng'),
        adopted('Mẹ', 'Con riêng')
      ]
    }
    const ged = exportToGedcom(data)
    // Con nuôi: adopted by the couple (F1); Con riêng: Bố's own child (F2),
    // adopted by Mẹ alone (F3)
    expect(ged).toContain('0 @I4@ INDI\n1 NAME /Con/ nuôi\n2 GIVN nuôi\n')
    expect(ged).toContain('1 FAMC @F1@\n2 PEDI ADOPTED\n0 @I5@')
    expect(ged).toContain('1 FAMC @F2@\n1 FAMC @F3@\n2 PEDI ADOPTED\n')
    expect(roundTrip(data).rels).toEqual(
      [
        'marriage Bố Mẹ',
        'biological_child Bố Con ruột',
        'biological_child Mẹ Con ruột',
        'adopted_child Bố Con nuôi',
        'adopted_child Mẹ Con nuôi',
        'biological_child Bố Con riêng',
        'adopted_child Mẹ Con riêng'
      ].sort()
    )
  })

  test('writes the first word of a name as the surname', () => {
    const data = {
      persons: [
        person('a', 'male', { full_name: 'Nguyễn Văn An' }),
        person('b', 'female', { full_name: '  Trần   Thị Bích ' }),
        person('c', 'male', { full_name: 'Tùng' })
      ],
      relationships: []
    }
    const ged = exportToGedcom(data)
    expect(ged).toContain(
      '1 NAME /Nguyễn/ Văn An\n2 GIVN Văn An\n2 SURN Nguyễn\n'
    )
    expect(ged).toContain('1 NAME /Trần/ Thị Bích\n')
    expect(ged).toContain('1 NAME Tùng\n2 GIVN Tùng\n')
    expect(roundTrip(data).parsed.persons.map((p) => p.full_name)).toEqual([
      'Nguyễn Văn An',
      'Trần Thị Bích',
      'Tùng'
    ])
  })

  test('drops a day without a month and keeps the year', () => {
    const data = {
      persons: [
        person('a', 'male', {
          birth_year: 1950,
          birth_day: 12,
          is_deceased: true,
          death_year: 2020,
          death_day: 3
        }),
        person('b', 'female', { birth_month: 5, birth_day: 1 })
      ],
      relationships: []
    }
    const ged = exportToGedcom(data)
    expect(ged).toContain('1 BIRT\n2 DATE 1950\n')
    expect(ged).toContain('1 DEAT Y\n2 DATE 2020\n')
    expect(ged).not.toContain('2 DATE 01 MAY')
    const [a, b] = roundTrip(data).parsed.persons
    expect(a).toMatchObject({
      birth_year: 1950,
      birth_month: null,
      birth_day: null,
      death_year: 2020,
      death_day: null
    })
    expect(b.birth_year).toBeNull()
  })
})

describe('parseGedcom with other name and family formats', () => {
  test('reads files written by earlier versions as before', () => {
    const ged = [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME Nguyễn Văn /An/',
      '1 SEX M',
      '1 FAMS @F1@',
      '0 @I2@ INDI',
      '1 NAME Trần Thị /Bích/',
      '1 SEX F',
      '1 FAMS @F1@',
      '0 @I3@ INDI',
      '1 NAME Tùng //',
      '1 SEX U',
      '1 BIRT',
      '2 DATE 02 AUG 1945',
      '1 FAMC @F1@',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      '1 CHIL @I3@',
      '0 TRLR'
    ].join('\n')
    const { persons, relationships } = parseGedcom(ged)
    expect(persons.map((p) => p.full_name)).toEqual([
      'Nguyễn Văn An',
      'Trần Thị Bích',
      'Tùng'
    ])
    expect(persons[2]).toMatchObject({
      birth_day: 2,
      birth_month: 8,
      birth_year: 1945
    })
    const [an, bich, tung] = persons.map((p) => p.id)
    expect(relationships).toEqual([
      { type: 'marriage', person_a: an, person_b: bich },
      { type: 'biological_child', person_a: an, person_b: tung },
      { type: 'biological_child', person_a: bich, person_b: tung }
    ])
  })

  test('prefers SURN and GIVN in the order the NAME writes them', () => {
    const ged = [
      '0 @I1@ INDI',
      '1 NAME John /Smith/',
      '2 GIVN John',
      '2 SURN Smith',
      '0 @I2@ INDI',
      '1 NAME',
      '2 GIVN Thị Mai',
      '2 SURN Lê',
      '0 @I3@ INDI',
      '1 NAME /Phạm/ Hùng',
      '1 NAME Bí danh /Khác/'
    ].join('\n')
    expect(parseGedcom(ged).persons.map((p) => p.full_name)).toEqual([
      'John Smith',
      'Lê Thị Mai',
      'Phạm Hùng'
    ])
  })

  test('reads PEDI ADOPTED per family', () => {
    const ged = [
      '0 @I1@ INDI',
      '0 @I2@ INDI',
      '0 @I3@ INDI',
      '1 FAMC @F1@',
      '2 PEDI ADOPTED',
      '1 FAMC @F2@',
      '2 PEDI BIRTH',
      '0 @F1@ FAM',
      '1 WIFE @I1@',
      '1 CHIL @I3@',
      '0 @F2@ FAM',
      '1 HUSB @I2@',
      '1 CHIL @I3@'
    ].join('\n')
    const { persons, relationships } = parseGedcom(ged)
    const [p1, p2, p3] = persons.map((p) => p.id)
    expect(relationships).toEqual([
      { type: 'adopted_child', person_a: p1, person_b: p3 },
      { type: 'biological_child', person_a: p2, person_b: p3 }
    ])
  })
})
