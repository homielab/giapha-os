import { describe, expect, test } from 'bun:test'

import { validateImportPayload } from './backupPayload'
import {
  decodeGedcom,
  exportToGedcom,
  GedcomPerson,
  GedcomRelationship,
  parseGedcom
} from './gedcom'
import { lunarToSolar } from './lunarCalendar'

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
    const [p] = parseGedcom(ged, { surnameFirst: false }).persons
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
      const { persons } = parseGedcom(lines.join(sep), {
        surnameFirst: false
      })
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

  test('turns a slash inside a name into a space', () => {
    const data = {
      persons: [
        person('a', 'male', { full_name: 'Nguyễn Văn A/B' }),
        person('b', 'female', { full_name: 'Hoa/Huệ' }),
        person('c', 'male', { full_name: ' / ' })
      ],
      relationships: []
    }
    const ged = exportToGedcom(data)
    const nameLine = ged.split('\n').find((l) => l.includes('Nguyễn'))
    expect(nameLine).toBe('1 NAME /Nguyễn/ Văn A B')
    expect(nameLine?.split('/')).toHaveLength(3)
    expect(ged).toContain(
      '1 NAME /Nguyễn/ Văn A B\n2 GIVN Văn A B\n2 SURN Nguyễn\n'
    )
    expect(ged).toContain('1 NAME /Hoa/ Huệ\n2 GIVN Huệ\n2 SURN Hoa\n')
    expect(ged).toContain('1 NAME Unknown /Unknown/\n')
    expect(
      roundTrip(data)
        .parsed.persons.map((p) => p.full_name)
        .slice(0, 2)
    ).toEqual(['Nguyễn Văn A B', 'Hoa Huệ'])
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
      '1 SOUR Giapha_OS',
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
    expect(
      parseGedcom(ged, { surnameFirst: false }).persons.map((p) => p.full_name)
    ).toEqual(['John Smith', 'Lê Thị Mai', 'Phạm Hùng'])
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

  test('drops a day that does not exist and keeps the text in the note', () => {
    const { persons, relationships } = parseGedcom(
      indi('1 BIRT', '2 DATE 31 APR 1850', '1 DEAT', '2 DATE 29 FEB 1900')
    )
    const p = persons[0]
    expect([p.birth_day, p.birth_month, p.birth_year]).toEqual([null, 4, 1850])
    expect([p.death_day, p.death_month, p.death_year]).toEqual([null, 2, 1900])
    expect(p.note).toBe('BIRT: 31 APR 1850\nDEAT: 29 FEB 1900')
    const t = (key: string) => key
    expect(validateImportPayload({ persons, relationships }, t)).toBeNull()
  })

  test('keeps 29 FEB of a leap year', () => {
    const { persons } = parseGedcom(indi('1 BIRT', '2 DATE 29 FEB 1904'))
    const p = persons[0]
    expect([p.birth_day, p.birth_month, p.birth_year]).toEqual([29, 2, 1904])
    expect(p.note).toBeNull()
  })

  test('keeps a whole range in the note when its first day does not exist', () => {
    const { persons } = parseGedcom(
      indi('1 BIRT', '2 DATE BET 30 FEB 1850 AND 1855')
    )
    const p = persons[0]
    expect([p.birth_day, p.birth_month, p.birth_year]).toEqual([null, 2, 1850])
    expect(p.note).toBe('BIRT: BET 30 FEB 1850 AND 1855')
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
    expect(p.note).toBe('DEAT: ABT MAR 1790')
  })

  test('keeps estimated dates in the note, once on re-import', () => {
    const quals = [
      'ABT 1950',
      'BEF 1950',
      'AFT 5 JUN 1950',
      'EST 1950',
      'CAL 1950'
    ]
    for (const q of quals) {
      const [p] = parseGedcom(
        indi('1 BIRT', `2 DATE ${q}`, '1 DEAT', `2 DATE ${q}`)
      ).persons
      expect(p.birth_year).toBe(1950)
      expect(p.note).toBe(`BIRT: ${q}\nDEAT: ${q}`)
      const [again] = parseGedcom(
        indi(
          '1 BIRT',
          `2 DATE ${q}`,
          '1 NOTE BIRT: ' + q,
          '2 CONT DEAT: ' + q,
          '1 DEAT',
          `2 DATE ${q}`
        )
      ).persons
      expect(again.note).toBe(`BIRT: ${q}\nDEAT: ${q}`)
    }
    const [p] = parseGedcom(indi('1 BIRT', '2 DATE AFT 5 JUN 1950')).persons
    expect([p.birth_day, p.birth_month]).toEqual([5, 6])
  })

  test('reads PEDI foster, step and sealing as adopted with a note', () => {
    for (const pedi of ['foster', 'STEP', 'Sealing']) {
      const ged = [
        '0 @I1@ INDI',
        '0 @I2@ INDI',
        '1 FAMC @F1@',
        `2 PEDI ${pedi}`,
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 CHIL @I2@'
      ].join('\n')
      const { persons, relationships } = parseGedcom(ged)
      expect(relationships).toEqual([
        {
          type: 'adopted_child',
          person_a: persons[0].id,
          person_b: persons[1].id
        }
      ])
      expect(persons[1].note).toBe(`Con nuôi (${pedi.toLowerCase()})`)
      const again = parseGedcom(
        ged.replace('0 @F1@', `1 NOTE Con nuôi (${pedi.toLowerCase()})\n0 @F1@`)
      )
      expect(again.persons[1].note).toBe(`Con nuôi (${pedi.toLowerCase()})`)
    }
  })

  test('reads later NAME records as other names', () => {
    const { persons } = parseGedcom(
      indi('1 NAME Bình /Lê/', '2 TYPE aka', '1 NAME Ba Bình')
    )
    expect(persons[0].full_name).toBe('Lê Văn Bình')
    expect(persons[0].other_names).toBe('Lê Bình, Ba Bình')
  })
})

describe('GEDCOM names from other programs', () => {
  const ged = [
    '0 HEAD',
    '1 SOUR Gramps',
    '0 @I1@ INDI',
    '1 NAME /Nguyễn/ Văn An',
    '0 @I2@ INDI',
    '1 NAME Văn An /Nguyễn/',
    '0 @I3@ INDI',
    '1 NAME Văn An /Nguyễn/',
    '2 GIVN Văn An',
    '2 SURN Nguyễn',
    '0 @I4@ INDI',
    '1 NAME',
    '2 SURN Nguyễn',
    '2 GIVN Văn An',
    '0 @I5@ INDI',
    '1 NAME Tùng',
    '0 @I6@ INDI',
    '1 NAME //',
    '0 TRLR'
  ].join('\n')

  test('reads names surname first by default', () => {
    expect(parseGedcom(ged).persons.map((p) => p.full_name)).toEqual([
      'Nguyễn Văn An',
      'Nguyễn Văn An',
      'Nguyễn Văn An',
      'Nguyễn Văn An',
      'Tùng',
      'Unknown'
    ])
  })

  test('keeps the order of the file when surnameFirst is off', () => {
    expect(
      parseGedcom(ged, { surnameFirst: false }).persons.map((p) => p.full_name)
    ).toEqual([
      'Nguyễn Văn An',
      'Văn An Nguyễn',
      'Văn An Nguyễn',
      'Nguyễn Văn An',
      'Tùng',
      'Unknown'
    ])
  })

  test('keeps names on an export and import round trip', () => {
    const persons = [
      { id: 'a', full_name: 'Nguyễn Văn An', gender: 'male' },
      { id: 'b', full_name: 'Tôn Nữ Thị Hà', gender: 'female' },
      { id: 'c', full_name: 'Tùng', gender: 'other' }
    ] as unknown as GedcomPerson[]
    const exported = exportToGedcom({ persons, relationships: [] })
    for (const surnameFirst of [true, false]) {
      expect(
        parseGedcom(exported, { surnameFirst }).persons.map((p) => p.full_name)
      ).toEqual(['Nguyễn Văn An', 'Tôn Nữ Thị Hà', 'Tùng'])
    }
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
          death_lunar_year: 1990
        })
      ],
      relationships: []
    })
    expect(ged).toContain('1 NAME Ba Bình\n2 TYPE aka\n')
    expect(ged).toContain('1 NAME Cậu Tư\n2 TYPE aka\n')
    expect(ged).toContain('2 DATE 03 FEB 1990\n2 _LUNAR 8 1 1990\n')
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
    expect(persons[1].other_names).toBeNull()
    expect(persons[1].death_lunar_day).toBeNull()
  })

  test('ignores an invalid _LUNAR', () => {
    const lunar = (v: string) =>
      parseGedcom(
        ['0 @I1@ INDI', '1 DEAT Y', '2 DATE 1 JAN 2000', `2 _LUNAR ${v}`].join(
          '\n'
        )
      ).persons[0]
    expect(lunar('40 6 1999').death_lunar_day).toBeNull()
    expect(lunar('abc').death_lunar_month).toBeNull()
  })

  test('round-trips a death in a leap month (2023, leap month 2)', () => {
    const solar = lunarToSolar(2023, 2, 10, true)!
    expect(solar).not.toBeNull()
    const base = {
      full_name: 'Nguyễn Văn Nhuận',
      is_deceased: true,
      death_lunar_day: 10,
      death_lunar_month: 2,
      death_lunar_year: 2023
    }
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          ...base,
          death_year: solar.year,
          death_month: solar.month,
          death_day: solar.day
        })
      ],
      relationships: []
    })
    expect(ged).toContain('2 _LUNAR 10 2 2023 LEAP\n')
    const back = parseGedcom(ged).persons[0]
    expect(back.death_year).toBe(solar.year)
    expect(back.death_month).toBe(solar.month)
    expect(back.death_day).toBe(solar.day)

    // Same lunar numbers in the regular month 2: no LEAP, solar date differs.
    const regular = lunarToSolar(2023, 2, 10, false)!
    const plain = exportToGedcom({
      persons: [
        person('a', 'male', {
          ...base,
          death_year: regular.year,
          death_month: regular.month,
          death_day: regular.day
        })
      ],
      relationships: []
    })
    expect(plain).toContain('2 _LUNAR 10 2 2023\n')
    expect(plain).not.toContain('LEAP')
  })

  test('fills the solar death date from a LEAP lunar date without one', () => {
    const solar = lunarToSolar(2023, 2, 10, true)!
    const read = (lines: string[]) =>
      parseGedcom(['0 @I1@ INDI', '1 DEAT Y', ...lines].join('\n')).persons[0]
    const filled = read(['2 _LUNAR 10 2 2023 LEAP'])
    expect([filled.death_year, filled.death_month, filled.death_day]).toEqual([
      solar.year,
      solar.month,
      solar.day
    ])
    // A solar date in the file stays the source of truth.
    const kept = read(['2 DATE 1 JAN 2024', '2 _LUNAR 10 2 2023 LEAP'])
    expect([kept.death_year, kept.death_month, kept.death_day]).toEqual([
      2024, 1, 1
    ])
    // Not a leap month: nothing is derived.
    const plain = read(['2 _LUNAR 10 2 2023'])
    expect(plain.death_year).toBeNull()
    // A year without that leap month: nothing is derived.
    expect(read(['2 _LUNAR 10 2 2022 LEAP']).death_year).toBeNull()
  })

  test('round-trips day and month without a year (birthday, anniversary)', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn Sinh',
          birth_day: 15,
          birth_month: 3,
          is_deceased: true,
          death_day: 2,
          death_month: 9,
          death_lunar_day: 15,
          death_lunar_month: 7
        })
      ],
      relationships: []
    })
    expect(ged).toContain('1 BIRT\n2 _DATEDM 15 3\n')
    expect(ged).toContain('1 DEAT Y\n2 _DATEDM 2 9\n2 _LUNAR 15 7\n')
    const back = parseGedcom(ged).persons[0]
    expect([back.birth_day, back.birth_month, back.birth_year]).toEqual([
      15,
      3,
      null
    ])
    expect([back.death_day, back.death_month, back.death_year]).toEqual([
      2,
      9,
      null
    ])
    expect([
      back.death_lunar_day,
      back.death_lunar_month,
      back.death_lunar_year
    ]).toEqual([15, 7, null])
    expect(back.is_deceased).toBe(true)
  })

  test('writes dates with a year as before, without _DATEDM', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', {
          full_name: 'Lê Văn Năm',
          birth_day: 15,
          birth_month: 3,
          birth_year: 1950,
          is_deceased: true,
          death_year: 2000,
          death_lunar_day: 15,
          death_lunar_month: 7,
          death_lunar_year: 2000
        }),
        person('b', 'female', { full_name: 'Lê Thị Tháng', birth_month: 3 })
      ],
      relationships: []
    })
    expect(ged).toContain('1 BIRT\n2 DATE 15 MAR 1950\n')
    expect(ged).toContain('1 DEAT Y\n2 DATE 2000\n2 _LUNAR 15 7 2000\n')
    expect(ged).not.toContain('_DATEDM')
  })

  test('reads _DATEDM only when the file has no dated DATE', () => {
    const read = (...lines: string[]) =>
      parseGedcom(['0 @I1@ INDI', ...lines].join('\n')).persons[0]
    const kept = read('1 BIRT', '2 DATE 1 JAN 1960', '2 _DATEDM 15 3')
    expect([kept.birth_day, kept.birth_month, kept.birth_year]).toEqual([
      1, 1, 1960
    ])
    const yearOnly = read('1 BIRT', '2 _DATEDM 15 3', '2 DATE 1960')
    expect([yearOnly.birth_day, yearOnly.birth_month]).toEqual([null, null])
    expect(read('1 BIRT', '2 _DATEDM 31 2').birth_day).toBeNull()
    expect(read('1 BIRT', '2 _DATEDM 29 2').birth_day).toBe(29)
    expect(read('1 BIRT', '2 _DATEDM abc').birth_month).toBeNull()
    // Gramps-style file without custom tags: as before.
    const plain = read('1 BIRT', '2 DATE MAR 1960', '1 DEAT', '2 PLAC Huế')
    expect([plain.birth_day, plain.birth_month, plain.birth_year]).toEqual([
      null,
      3,
      1960
    ])
    expect(plain.is_deceased).toBe(true)
    expect(plain.death_lunar_day).toBeNull()
  })

  test('reads _LUNAR without a year and ignores LEAP there', () => {
    const read = (v: string) =>
      parseGedcom(['0 @I1@ INDI', '1 DEAT Y', `2 _LUNAR ${v}`].join('\n'))
        .persons[0]
    const noYear = read('15 7 LEAP')
    expect([noYear.death_lunar_day, noYear.death_lunar_month]).toEqual([15, 7])
    expect(noYear.death_lunar_year).toBeNull()
    expect(noYear.death_year).toBeNull()
    expect(read('15 13').death_lunar_day).toBeNull()
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

  test('a BURI with a place marks the person deceased; other PLAC lines are not burial places', () => {
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

describe('GEDCOM places of birth/death and occupation', () => {
  const indi = (...lines: string[]) =>
    ['0 HEAD', '0 @I1@ INDI', '1 NAME /Lê/ Văn Bình', ...lines, '0 TRLR'].join(
      '\n'
    )

  test('keeps BIRT/PLAC and OCCU as labelled note lines', () => {
    const { persons } = parseGedcom(
      indi('1 BIRT', '2 DATE 1950', '2 PLAC Hà Nội', '1 OCCU Thợ mộc')
    )
    expect(persons[0].note).toBe('Nơi sinh: Hà Nội\nNghề nghiệp: Thợ mộc')
    expect(persons[0].birth_year).toBe(1950)
  })

  test('appends after the existing note and range notes, in order', () => {
    const { persons } = parseGedcom(
      indi(
        '1 OCCU Nông dân',
        '1 NOTE Con trưởng',
        '1 BIRT',
        '2 DATE BET 1850 AND 1855',
        '2 PLAC Huế',
        '1 DEAT',
        '2 PLAC Sài Gòn',
        '1 OCCU Thợ mộc'
      )
    )
    const p = persons[0]
    expect(p.note).toBe(
      [
        'Con trưởng',
        'BIRT: BET 1850 AND 1855',
        'Nơi sinh: Huế',
        'Nơi mất: Sài Gòn',
        'Nghề nghiệp: Nông dân',
        'Nghề nghiệp: Thợ mộc'
      ].join('\n')
    )
    expect(p.is_deceased).toBe(true)
    expect(p.burial_place).toBeNull()
  })

  test('joins CONC/CONT of an occupation and skips empty places', () => {
    const { persons } = parseGedcom(
      indi('1 OCCU Giáo', '2 CONC  viên', '2 CONT dạy toán', '1 BIRT', '2 PLAC')
    )
    expect(persons[0].note).toBe('Nghề nghiệp: Giáo viên dạy toán')
    expect(persons[0].is_deceased).toBe(false)
  })

  test('export then import does not repeat the lines', () => {
    const first = parseGedcom(
      indi('1 NOTE Con trưởng', '1 BIRT', '2 PLAC Hà Nội', '1 OCCU Thợ mộc')
    )
    const ged = exportToGedcom(first)
    expect(ged).not.toContain('PLAC Hà Nội')
    expect(ged).not.toContain('OCCU')
    const again = parseGedcom(ged).persons[0]
    expect(again.note).toBe(first.persons[0].note)
    // A program that kept the note and wrote the place again: no duplicate.
    const edited = ged.replace(
      '1 NAME',
      '1 BIRT\n2 PLAC Hà Nội\n1 OCCU Thợ mộc\n1 NAME'
    )
    expect(parseGedcom(edited).persons[0].note).toBe(first.persons[0].note)
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

describe("GEDCOM '@@' escape", () => {
  const file = (...lines: string[]) => ['0 HEAD', ...lines, '0 TRLR'].join('\n')

  test("writes a note starting with '@' as '@@' and reads it back", () => {
    const ged = exportToGedcom({
      persons: [person('a', 'male', { note: '@home\n@office' })],
      relationships: []
    })
    expect(ged).toContain('1 NOTE @@home\n2 CONT @@office\n')
    expect(parseGedcom(ged).persons[0].note).toBe('@home\n@office')
  })

  test('keeps a note that looks like a pointer as text', () => {
    const ged = exportToGedcom({
      persons: [person('a', 'male', { note: '@N1@' })],
      relationships: []
    })
    expect(ged).toContain('1 NOTE @@N1@\n')
    const { persons, stats } = parseGedcom(ged)
    expect(persons[0].note).toBe('@N1@')
    expect(stats.missingNotes).toBe(0)
  })

  test("reads '@@' inside a value as '@'", () => {
    const { persons } = parseGedcom(
      file(
        '0 @I1@ INDI',
        '1 NAME /Lê/ Văn Bình',
        '1 NOTE Email a@@b.com',
        '2 CONT Nhà @@ Huế',
        '1 NOTE @N1@',
        '0 @N1@ NOTE Liên hệ c@@d.vn'
      )
    )
    expect(persons[0].note).toBe('Email a@b.com\nNhà @ Huế\n\nLiên hệ c@d.vn')
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

describe('GEDCOM duplicate marriages', () => {
  const ged = (fams: string[]) =>
    [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME An /Nguyễn/',
      '1 SEX M',
      '0 @I2@ INDI',
      '1 NAME Bình /Trần/',
      '1 SEX F',
      '0 @I3@ INDI',
      '1 NAME Cúc /Lê/',
      '1 SEX F',
      ...fams,
      '0 TRLR'
    ].join('\n')

  test('two families with husband and wife swapped give one marriage that passes validation', () => {
    const { persons, relationships } = parseGedcom(
      ged([
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '0 @F2@ FAM',
        '1 HUSB @I2@',
        '1 WIFE @I1@'
      ])
    )
    expect(relationships.filter((r) => r.type === 'marriage')).toHaveLength(1)
    const t = (key: string) => key
    expect(validateImportPayload({ persons, relationships }, t)).toBeNull()
  })

  test('different couples keep all their marriages', () => {
    const { relationships } = parseGedcom(
      ged([
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '0 @F2@ FAM',
        '1 HUSB @I3@',
        '1 WIFE @I1@'
      ])
    )
    expect(relationships.filter((r) => r.type === 'marriage')).toHaveLength(2)
  })
})

describe('GEDCOM sources and missing notes', () => {
  const file = (...lines: string[]) => ['0 HEAD', ...lines, '0 TRLR'].join('\n')

  test('a dangling note pointer is counted and adds no empty note', () => {
    const { persons, stats } = parseGedcom(
      file('0 @I1@ INDI', '1 NAME An /Lê/', '1 NOTE @N9@', '1 NOTE Có thật')
    )
    expect(persons[0].note).toBe('Có thật')
    expect(stats).toEqual({
      missingNotes: 1,
      sources: 0,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
  })

  test('cited sources become "Nguồn: …" notes of the person and the marriage', () => {
    const { persons, relationships, stats } = parseGedcom(
      file(
        '0 @I1@ INDI',
        '1 NAME An /Lê/',
        '1 NOTE Làm ruộng',
        '1 SOUR @S1@',
        '2 PAGE tr. 12',
        '1 BIRT',
        '2 DATE 1900',
        '2 SOUR @S2@',
        '0 @I2@ INDI',
        '1 NAME Hoa /Trần/',
        '1 SOUR @S1@',
        '1 SOUR @S9@',
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '1 SOUR @S2@',
        '0 @S1@ SOUR',
        '1 TITL Gia phả họ Lê',
        '2 CONC  bản 1950',
        '1 REPO @R1@',
        '0 @S2@ SOUR',
        '1 ABBR Sổ hộ tịch',
        '1 TEXT Trang ',
        '2 CONC 3',
        '2 CONT dòng hai',
        '0 @R1@ REPO',
        '1 NAME Nhà thờ họ'
      )
    )
    expect(persons[0].note).toBe(
      'Làm ruộng\n\nNguồn: Gia phả họ Lê bản 1950\n\nNguồn: Sổ hộ tịch\nTrang 3\ndòng hai'
    )
    expect(persons[1].note).toBe('Nguồn: Gia phả họ Lê bản 1950')
    expect(relationships[0].note).toBe('Nguồn: Sổ hộ tịch\nTrang 3\ndòng hai')
    expect(stats).toEqual({
      missingNotes: 0,
      sources: 3,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
  })

  test('the header SOUR of the app does not become a note', () => {
    const { persons, relationships, stats } = parseGedcom(
      [
        '0 HEAD',
        '1 SOUR Giapha_OS',
        '2 NAME Giapha OS',
        '0 @I1@ INDI',
        '1 NAME An /Lê/',
        '0 TRLR'
      ].join('\n')
    )
    expect(persons[0].note).toBeNull()
    expect(relationships).toEqual([])
    expect(stats).toEqual({
      missingNotes: 0,
      sources: 0,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
  })

  test('a file exported by the app imports without warnings', () => {
    const ged = exportToGedcom({
      persons: [
        person('a', 'male', { note: 'Tiểu sử' }),
        person('b', 'female')
      ],
      relationships: [{ type: 'marriage', person_a: 'a', person_b: 'b' }]
    })
    const { persons, relationships, stats } = parseGedcom(ged)
    expect(stats).toEqual({
      missingNotes: 0,
      sources: 0,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
    expect(persons[0].note).toBe('Tiểu sử')
    expect(relationships[0]).not.toHaveProperty('note')
  })
})

describe('roundtrip', () => {
  const t = (key: string) => key

  /** Export one person, import it back and check it passes validation. */
  function again(extra: Partial<GedcomPerson>) {
    const data = { persons: [person('a', 'male', extra)], relationships: [] }
    const parsed = parseGedcom(exportToGedcom(data))
    expect(validateImportPayload(parsed, t)).toBeNull()
    expect(parsed.persons).toHaveLength(1)
    return parsed.persons[0]
  }

  test('keeps a date with only a year', () => {
    const p = again({ birth_year: 1850, is_deceased: true, death_year: 1920 })
    expect(p).toMatchObject({
      birth_day: null,
      birth_month: null,
      birth_year: 1850,
      death_day: null,
      death_month: null,
      death_year: 1920,
      note: null
    })
  })

  test('keeps a date with a month and a year', () => {
    const p = again({
      birth_month: 4,
      birth_year: 1850,
      is_deceased: true,
      death_month: 2,
      death_year: 1900
    })
    expect(p).toMatchObject({
      birth_day: null,
      birth_month: 4,
      birth_year: 1850,
      death_day: null,
      death_month: 2,
      death_year: 1900,
      note: null
    })
  })

  test('keeps a note of several lines with LF or CRLF breaks', () => {
    const lines = ['Con trưởng', 'Lấy vợ năm 1950', '', 'Mất ở quê']
    expect(again({ note: lines.join('\n') }).note).toBe(lines.join('\n'))
    expect(again({ note: lines.join('\r\n') }).note).toBe(lines.join('\n'))
  })

  test('keeps a one-word name', () => {
    expect(again({ full_name: 'Tùng' }).full_name).toBe('Tùng')
  })
})

describe('GEDCOM family notes without both spouses', () => {
  const file = (...lines: string[]) => ['0 HEAD', ...lines, '0 TRLR'].join('\n')
  const people = [
    '0 @I1@ INDI',
    '1 NAME An /Lê/',
    '0 @I2@ INDI',
    '1 NAME Bình /Trần/',
    '0 @I3@ INDI',
    '1 NAME Cúc /Lê/'
  ]

  test('a single-parent family with a note is counted and its note is not given to anyone', () => {
    const { persons, relationships, stats } = parseGedcom(
      file(
        ...people,
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 CHIL @I3@',
        '1 NOTE Vợ không rõ'
      )
    )
    expect(stats.droppedFamilyNotes).toBe(1)
    expect(relationships).toEqual([
      {
        type: 'biological_child',
        person_a: persons[0].id,
        person_b: persons[2].id
      }
    ])
    expect(persons.every((p) => p.note === null)).toBe(true)
  })

  test('a single-parent family citing a source is counted', () => {
    const { stats } = parseGedcom(
      file(
        ...people,
        '0 @F1@ FAM',
        '1 WIFE @I2@',
        '1 SOUR @S1@',
        '0 @S1@ SOUR',
        '1 TITL Gia phả'
      )
    )
    expect(stats.droppedFamilyNotes).toBe(1)
  })

  test('families with both spouses, or without notes, are not counted', () => {
    const { stats } = parseGedcom(
      file(
        ...people,
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '1 NOTE Cưới năm 1950',
        '0 @F2@ FAM',
        '1 HUSB @I1@',
        '1 CHIL @I3@'
      )
    )
    expect(stats.droppedFamilyNotes).toBe(0)
  })
})

describe('GEDCOM marriage notes', () => {
  const file = (...lines: string[]) => ['0 HEAD', ...lines, '0 TRLR'].join('\n')
  const couple = [
    '0 @I1@ INDI',
    '1 NAME An /Lê/',
    '0 @I2@ INDI',
    '1 NAME Hoa /Trần/'
  ]

  test('export writes the marriage note on its FAM record', () => {
    const ged = exportToGedcom({
      persons: [person('a', 'male'), person('b', 'female')],
      relationships: [
        {
          type: 'marriage',
          person_a: 'a',
          person_b: 'b',
          note: 'Cưới năm 1950\nỞ làng Đông'
        }
      ]
    })
    expect(ged).toContain(
      '0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 NOTE Cưới năm 1950\n2 CONT Ở làng Đông\n'
    )
  })

  test('a marriage note survives export and import', () => {
    const note = 'Nguồn: Sổ hộ tịch\nTrang 3'
    const ged = exportToGedcom({
      persons: [person('a', 'female'), person('b', 'male')],
      relationships: [{ type: 'marriage', person_a: 'a', person_b: 'b', note }]
    })
    const { relationships, stats } = parseGedcom(ged)
    expect(relationships).toHaveLength(1)
    expect(relationships[0].note).toBe(note)
    expect(stats).toEqual({
      missingNotes: 0,
      sources: 0,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
  })

  test('import reads inline FAM notes with CONC/CONT before cited sources', () => {
    const { relationships } = parseGedcom(
      file(
        ...couple,
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '1 NOTE Cưới ',
        '2 CONC năm 1950',
        '2 CONT Ở làng Đông',
        '1 CHIL @I3@',
        '2 CONT không thuộc ghi chú',
        '1 SOUR @S1@',
        '0 @S1@ SOUR',
        '1 TITL Gia phả họ Lê'
      )
    )
    expect(relationships[0].note).toBe(
      'Cưới năm 1950\nỞ làng Đông\n\nNguồn: Gia phả họ Lê'
    )
  })

  test('import resolves FAM note pointers and counts missing ones', () => {
    const { relationships, stats } = parseGedcom(
      file(
        ...couple,
        '0 @F1@ FAM',
        '1 HUSB @I1@',
        '1 WIFE @I2@',
        '1 NOTE @N1@',
        '1 NOTE @N9@',
        '0 @N1@ NOTE Hôn thú',
        '1 CONT số 12'
      )
    )
    expect(relationships[0].note).toBe('Hôn thú\nsố 12')
    expect(stats).toEqual({
      missingNotes: 1,
      sources: 0,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
  })
})

describe('GEDCOM marriage and divorce events', () => {
  const fam = (...lines: string[]) =>
    [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME /Lê/ Văn Bình',
      '0 @I2@ INDI',
      '1 NAME /Trần/ Thị Mai',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      ...lines,
      '0 TRLR'
    ].join('\n')
  const marriageNote = (ged: string) =>
    parseGedcom(ged).relationships.find((r) => r.type === 'marriage')?.note

  test('keeps MARR date and place and DIV as note lines', () => {
    expect(
      marriageNote(
        fam(
          '1 NOTE Cưới ở quê',
          '1 MARR',
          '2 DATE 12 MAR 1950',
          '2 PLAC Huế',
          '1 DIV Y'
        )
      )
    ).toBe('Cưới ở quê\n\nKết hôn: 12 MAR 1950, Huế\nLy hôn')
    expect(marriageNote(fam('1 DIV', '2 DATE 1970'))).toBe('Ly hôn: 1970')
  })

  test('a bare MARR adds nothing', () => {
    expect(marriageNote(fam('1 MARR Y'))).toBeUndefined()
  })

  test('export then import does not repeat the lines', () => {
    const first = parseGedcom(
      fam('1 MARR', '2 DATE 1950', '2 PLAC Huế', '1 DIV Y')
    )
    const note = first.relationships.find((r) => r.type === 'marriage')?.note
    expect(note).toBe('Kết hôn: 1950, Huế\nLy hôn')
    const ged = exportToGedcom(first)
    expect(marriageNote(ged)).toBe(note)
    // A program that kept the note and wrote the events again: no duplicate.
    const edited = ged.replace(
      '1 WIFE @I2@',
      '1 WIFE @I2@\n1 MARR\n2 DATE 1950\n2 PLAC Huế\n1 DIV Y'
    )
    expect(marriageNote(edited)).toBe(note)
  })
})

describe('GEDCOM person without a name', () => {
  const ged = '0 @I1@ INDI\n1 SEX M\n0 @I2@ INDI\n1 NAME /Lê/ Hoa\n'

  test('gets the placeholder passed in and is counted', () => {
    const { persons, stats } = parseGedcom(ged, { unnamedName: 'Chưa rõ tên' })
    expect(persons.map((p) => p.full_name)).toEqual(['Chưa rõ tên', 'Lê Hoa'])
    expect(stats.unnamed).toBe(1)
  })

  test('defaults to Unknown', () => {
    expect(parseGedcom(ged).persons[0].full_name).toBe('Unknown')
  })

  test('an empty other name is not kept', () => {
    const { persons, stats } = parseGedcom(
      '0 @I1@ INDI\n1 NAME /An/\n1 NAME //\n'
    )
    expect(persons[0].other_names).toBeNull()
    expect(stats.unnamed).toBe(0)
  })
})
