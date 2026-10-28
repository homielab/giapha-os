import { describe, expect, test } from 'bun:test'

import {
  decodeGedcom,
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

  test('reads files with CR-only, LF and CRLF line endings the same', () => {
    const lines = [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME An /Nguyễn/',
      '0 @I2@ INDI',
      '1 NAME Bình /Trần/',
      '0 TRLR'
    ]
    for (const sep of ['\r', '\n', '\r\n']) {
      const { persons } = parseGedcom(lines.join(sep))
      expect(persons.map((p) => p.full_name)).toEqual([
        'An Nguyễn',
        'Bình Trần'
      ])
    }
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

describe('GEDCOM notes, dates and other names from other programs', () => {
  const indi = (...lines: string[]) =>
    ['0 HEAD', '0 @I1@ INDI', '1 NAME /Lê/ Văn Bình', ...lines, '0 TRLR'].join(
      '\n'
    )

  test('joins CONC lines without a line break and keeps CONT breaks', () => {
    const { persons } = parseGedcom(
      indi(
        '1 NOTE Born in a small vil ',
        '2 CONC lage near the river and ',
        '2 CONC moved north.',
        '2 CONT Second paragraph'
      )
    )
    expect(persons[0].note).toBe(
      'Born in a small vil lage near the river and moved north.\nSecond paragraph'
    )
  })

  test('keeps the first date of BET ... AND and FROM ... TO ranges', () => {
    const { persons } = parseGedcom(
      indi(
        '1 BIRT',
        '2 DATE BET 12 MAR 1850 AND 1855',
        '1 DEAT Y',
        '2 DATE FROM 1920 TO 1925'
      )
    )
    const p = persons[0]
    expect([p.birth_day, p.birth_month, p.birth_year]).toEqual([12, 3, 1850])
    expect([p.death_day, p.death_month, p.death_year]).toEqual([
      null,
      null,
      1920
    ])
    expect(p.note).toBe(
      'BIRT: BET 12 MAR 1850 AND 1855\nDEAT: FROM 1920 TO 1925'
    )
  })

  test('ignores calendar escapes and qualifiers', () => {
    const { persons } = parseGedcom(
      indi(
        '1 BIRT',
        '2 DATE @#DJULIAN@ 5 JAN 1700',
        '1 DEAT',
        '2 DATE ABT @#DGREGORIAN@ MAR 1790'
      )
    )
    const p = persons[0]
    expect([p.birth_day, p.birth_month, p.birth_year]).toEqual([5, 1, 1700])
    expect([p.death_month, p.death_year]).toEqual([3, 1790])
    expect(p.note).toBeNull()
  })

  test('reads later NAME records as other names', () => {
    const { persons } = parseGedcom(
      indi('1 NAME Bình /Lê/', '2 TYPE aka', '1 NAME Ba Bình')
    )
    expect(persons[0].full_name).toBe('Lê Văn Bình')
    expect(persons[0].other_names).toBe('Bình Lê, Ba Bình')
  })
})

describe('GEDCOM other names and lunar death date', () => {
  test('writes other names as NAME with TYPE aka and the lunar date under DEAT', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn Bình',
          other_names: 'Ba Bình, Cậu Tư',
          is_deceased: true,
          death_year: 1990,
          death_month: 2,
          death_day: 3,
          death_lunar_day: 8,
          death_lunar_month: 1,
          death_lunar_year: 1990,
          death_lunar_leap: true
        })
      ],
      relationships: []
    })
    expect(ged).toContain('1 NAME Ba Bình\n2 TYPE aka\n')
    expect(ged).toContain('1 NAME Cậu Tư\n2 TYPE aka\n')
    expect(ged).toContain('2 DATE 03 FEB 1990\n2 _LUNAR 8 1 1990 LEAP\n')
  })

  test('keeps other names and the lunar death date', () => {
    const { persons } = parseGedcom(
      exportToGedcom({
        persons: [
          person('a', 'female', {
            full_name: 'Trần Thị Hoa',
            other_names: 'Hoa Nhỏ; Cô Hai',
            is_deceased: true,
            death_year: 2001,
            death_month: 7,
            death_day: 1,
            death_lunar_day: 11,
            death_lunar_month: 5,
            death_lunar_year: 2001
          }),
          person('b', 'male', { full_name: 'Phạm Văn An' })
        ],
        relationships: []
      })
    )
    expect(persons[0].other_names).toBe('Hoa Nhỏ, Cô Hai')
    expect(persons[0].death_lunar_day).toBe(11)
    expect(persons[0].death_lunar_month).toBe(5)
    expect(persons[0].death_lunar_year).toBe(2001)
    expect(persons[0].death_lunar_leap).toBeUndefined()
    expect(persons[1].other_names).toBeNull()
    expect(persons[1].death_lunar_day).toBeNull()
  })

  test('keeps the leap flag and ignores an invalid _LUNAR', () => {
    const lunar = (v: string) =>
      parseGedcom(
        ['0 @I1@ INDI', '1 DEAT Y', '2 DATE 1 JAN 2000', `2 _LUNAR ${v}`].join(
          '\n'
        )
      ).persons[0]
    expect(lunar('4 6 1999 LEAP').death_lunar_leap).toBe(true)
    expect(lunar('40 6 1999').death_lunar_day).toBeNull()
    expect(lunar('abc').death_lunar_month).toBeNull()
  })

  test('round-trips generation, birth order and the in-law flag', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn An',
          generation: 3,
          birth_order: 2,
          is_in_law: true
        }),
        person('b', 'female', {
          full_name: 'Lê Thị Bé',
          generation: 0,
          birth_order: 0
        }),
        person('c', 'male', { full_name: 'Lê Văn Cả' })
      ],
      relationships: []
    })
    expect(ged).toContain('1 _GEN 3\n1 _ORDER 2\n1 _INLAW Y\n')
    expect(ged.match(/_INLAW/g)).toHaveLength(1)
    expect(ged.match(/_GEN/g)).toHaveLength(2)
    const { persons } = parseGedcom(ged)
    expect(persons[0]).toMatchObject({
      generation: 3,
      birth_order: 2,
      is_in_law: true
    })
    expect(persons[1]).toMatchObject({
      generation: 0,
      birth_order: 0,
      is_in_law: false
    })
    expect(persons[2]).toMatchObject({
      generation: null,
      birth_order: null,
      is_in_law: false
    })
  })

  test('files without the custom tags import as before; bad values are ignored', () => {
    const [plain, bad] = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME An',
        '1 _MYTAG foo',
        '0 @I2@ INDI',
        '1 NAME Bé',
        '1 _GEN x',
        '1 _ORDER -1',
        '1 _INLAW N'
      ].join('\n')
    ).persons
    for (const p of [plain, bad]) {
      expect(p.generation).toBeNull()
      expect(p.birth_order).toBeNull()
      expect(p.is_in_law).toBe(false)
    }
  })
})

describe('GEDCOM burial place', () => {
  test('writes BURI/PLAC and reads the burial place back', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn An',
          is_deceased: true,
          death_year: 1990,
          burial_place: 'Nghĩa trang Văn Điển, Hà Nội'
        }),
        person('b', 'female', {
          full_name: 'Lê Thị Bé',
          is_deceased: true,
          burial_place: 'Lăng họ Lê\nxã Yên Sở'
        }),
        person('c', 'male', { full_name: 'Lê Văn Cả', burial_place: '  ' })
      ],
      relationships: []
    })
    expect(ged).toContain('1 BURI\n2 PLAC Nghĩa trang Văn Điển, Hà Nội\n')
    expect(ged).toContain('2 PLAC Lăng họ Lê, xã Yên Sở\n')
    expect(ged.match(/1 BURI/g)).toHaveLength(2)
    const { byName } = roundTrip({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn An',
          is_deceased: true,
          burial_place: 'Nghĩa trang Văn Điển, Hà Nội'
        }),
        person('c', 'male', { full_name: 'Lê Văn Cả' })
      ],
      relationships: []
    })
    expect(byName.get('Lê Văn An')).toMatchObject({
      is_deceased: true,
      burial_place: 'Nghĩa trang Văn Điển, Hà Nội'
    })
    expect(byName.get('Lê Văn Cả')?.burial_place).toBeNull()
  })

  test('a BURI with a place marks the person deceased; other PLAC lines are ignored', () => {
    const [buried, born] = parseGedcom(
      [
        '0 @I1@ INDI',
        '1 NAME An',
        '1 BURI',
        '2 DATE 1 JAN 1990',
        '2 PLAC Nghĩa trang làng',
        '0 @I2@ INDI',
        '1 NAME Bé',
        '1 BIRT',
        '2 PLAC Hà Nội',
        '1 BURI',
        '2 PLAC'
      ].join('\n')
    ).persons
    expect(buried).toMatchObject({
      is_deceased: true,
      burial_place: 'Nghĩa trang làng'
    })
    expect(born).toMatchObject({ is_deceased: false, burial_place: null })
  })
})

describe('decodeGedcom', () => {
  const text = '0 HEAD\n1 CHAR UNICODE\n0 @I1@ INDI\n1 NAME An /Nguyễn/\n0 TRLR'
  const utf16 = (bom: number[], swap: boolean) => {
    const out = [...bom]
    for (const unit of text) {
      const c = unit.charCodeAt(0)
      out.push(...(swap ? [c >> 8, c & 255] : [c & 255, c >> 8]))
    }
    return Uint8Array.from(out).buffer as ArrayBuffer
  }

  test('UTF-16LE with BOM', () => {
    const r = decodeGedcom(utf16([0xff, 0xfe], false))
    expect(r.text).toBe(text)
    expect(r.encoding).toBe('utf-16le')
    expect(r.warning).toBeUndefined()
  })

  test('UTF-16BE with BOM', () => {
    expect(decodeGedcom(utf16([0xfe, 0xff], true)).text).toBe(text)
  })

  test('UTF-8 with BOM drops the BOM', () => {
    const bytes = Uint8Array.from([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode(text)
    ])
    const r = decodeGedcom(bytes.buffer as ArrayBuffer)
    expect(r.text).toBe(text)
    expect(r.warning).toBeUndefined()
  })

  test('CHAR ANSI reads windows-1252', () => {
    const src = '0 HEAD\n1 CHAR ANSI\n1 NAME José /Müller/ €'
    const bytes = Uint8Array.from(Buffer.from(src.replace('€', ''), 'latin1'))
    expect(decodeGedcom(bytes.buffer as ArrayBuffer).text).toContain(
      'José /Müller/'
    )
  })

  test('CHAR ANSEL warns', () => {
    const bytes = new TextEncoder().encode('0 HEAD\n1 CHAR ANSEL\n')
    expect(decodeGedcom(bytes.buffer as ArrayBuffer).warning).toBe('ansel')
  })

  test('invalid UTF-8 warns about replacement characters', () => {
    const r = decodeGedcom(Uint8Array.from([0x30, 0x20, 0xe1, 0x0a]).buffer)
    expect(r.warning).toBe('replacement')
  })

  test('parseGedcom ignores a leading BOM', () => {
    const r = parseGedcom('﻿0 HEAD\n0 @I1@ INDI\n1 NAME An /Lê/\n0 TRLR')
    expect(r.persons).toHaveLength(1)
  })
})

describe('GEDCOM pointer notes', () => {
  const file = (...lines: string[]) => ['0 HEAD', ...lines, '0 TRLR'].join('\n')
  const indi = (...lines: string[]) => [
    '0 @I1@ INDI',
    '1 NAME /Lê/ Văn Bình',
    ...lines
  ]

  test('resolves a NOTE pointer to the shared record', () => {
    const { persons } = parseGedcom(
      file(...indi('1 NOTE @N1@'), '0 @N1@ NOTE Sinh tại Huế')
    )
    expect(persons[0].note).toBe('Sinh tại Huế')
  })

  test('joins CONC and CONT lines of a pointed note', () => {
    const { persons } = parseGedcom(
      file(
        ...indi('1 NOTE @N1@'),
        '0 @N1@ NOTE Dòng một dài ',
        '1 CONC tiếp tục',
        '1 CONT Dòng hai',
        '1 CONT Dòng ba'
      )
    )
    expect(persons[0].note).toBe('Dòng một dài tiếp tục\nDòng hai\nDòng ba')
  })

  test('a pointer to a missing record gives no note', () => {
    const { persons } = parseGedcom(file(...indi('1 NOTE @N9@')))
    expect(persons[0].note).toBeNull()
  })

  test('reads inline and pointer notes in the same file', () => {
    const { persons } = parseGedcom(
      file(
        ...indi('1 NOTE @N1@'),
        '0 @I2@ INDI',
        '1 NAME /Lê/ Thị Hoa',
        '1 NOTE Ghi chú trực tiếp',
        '2 CONT Dòng hai',
        '0 @N1@ NOTE Tiểu sử chung'
      )
    )
    expect(persons[0].note).toBe('Tiểu sử chung')
    expect(persons[1].note).toBe('Ghi chú trực tiếp\nDòng hai')
  })

  test('reads several notes of one person and GEDCOM 7 SNOTE', () => {
    const { persons } = parseGedcom(
      file(
        ...indi('1 NOTE @N1@', '1 NOTE Thêm'),
        '0 @N1@ SNOTE Một',
        '1 CONT Hai'
      )
    )
    expect(persons[0].note).toBe('Một\nHai\n\nThêm')
  })

  test('a Gramps-style file keeps the note and later records', () => {
    const { persons, relationships } = parseGedcom(
      file(
        '0 @I1@ INDI',
        '1 NAME An /Lê/',
        '1 NOTE @N1@',
        '1 FAMS @F1@',
        '0 @N1@ NOTE Làm ruộng',
        '1 CONC  và dạy học',
        '0 @I2@ INDI',
        '1 NAME Hoa /Trần/',
        '1 FAMS @F1@',
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@'
      )
    )
    expect(persons[0].note).toBe('Làm ruộng và dạy học')
    expect(persons[1].note).toBeNull()
    expect(relationships).toHaveLength(1)
  })

  test('export splits a long note into CONC lines and round-trips', () => {
    const long = 'Tiểu sử 😀 '.repeat(120) + 'hết.\nĐoạn hai ' + 'x'.repeat(600)
    const ged = exportToGedcom({
      persons: [person('a', 'male', { note: long })],
      relationships: []
    })
    const lines = ged.split('\n')
    for (const line of lines)
      expect(Array.from(line).length).toBeLessThanOrEqual(255)
    expect(ged).toContain('\n2 CONC ')
    expect(ged).toContain('\n2 CONT Đoạn hai ')
    expect(parseGedcom(ged).persons[0].note).toBe(long)
  })
})
