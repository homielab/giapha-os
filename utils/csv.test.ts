import { describe, expect, test } from 'bun:test'
import JSZip from 'jszip'

import { exportToCsvZip, parseCsvZip } from './csv'
import { CsvParseError, CsvZipInvalidError } from './csvErrors'

const persons = [
  {
    id: 'p1',
    full_name: 'Nguyễn Văn An',
    gender: 'male' as const,
    birth_year: 1950,
    birth_month: 3,
    birth_day: null,
    is_deceased: true,
    is_in_law: false,
    birth_order: 1,
    generation: 1,
    note: 'Trưởng họ, "cụ An"\nsống ở Hà Nội, Việt Nam',
    created_at: '2024-01-02T03:04:05.000Z'
  },
  {
    id: 'p2',
    full_name: 'Trần Thị Bình',
    gender: 'female' as const,
    birth_year: null,
    birth_month: null,
    birth_day: null,
    is_deceased: false,
    is_in_law: true,
    birth_order: null,
    generation: 1,
    note: '',
    created_at: '2024-01-02T03:04:05.000Z'
  }
]

const relationships = [
  { id: 'r1', type: 'marriage' as const, person_a: 'p1', person_b: 'p2' }
]

async function zipWith(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, content)
  return zip.generateAsync({ type: 'blob' })
}

describe('exportToCsvZip', () => {
  test('writes persons.csv and relationships.csv with a UTF-8 BOM', async () => {
    const blob = await exportToCsvZip({ persons, relationships })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual([
      'persons.csv',
      'relationships.csv'
    ])
    const csv = await zip.file('persons.csv')!.async('text')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  test('quotes cells that contain commas, quotes and newlines', async () => {
    const blob = await exportToCsvZip({ persons, relationships })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const csv = await zip.file('persons.csv')!.async('text')
    expect(csv).toContain('"Trưởng họ, ""cụ An""\nsống ở Hà Nội, Việt Nam"')
  })

  test('adds optional files only when they have rows', async () => {
    const empty = await exportToCsvZip({
      persons,
      relationships,
      person_details_private: [],
      custom_events: []
    })
    const zip = await JSZip.loadAsync(await empty.arrayBuffer())
    expect(zip.file('person_details_private.csv')).toBeNull()
    expect(zip.file('custom_events.csv')).toBeNull()
  })
})

describe('parseCsvZip', () => {
  test('a ZIP without the CSV files throws CsvZipInvalidError', async () => {
    const zip = new JSZip()
    zip.file('other.txt', 'x')
    const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
    await expect(parseCsvZip(blob)).rejects.toBeInstanceOf(CsvZipInvalidError)
  })

  test('round-trips persons and relationships', async () => {
    const result = await parseCsvZip(
      await exportToCsvZip({ persons, relationships })
    )
    expect(result.persons).toHaveLength(2)
    expect(result.persons[0].full_name).toBe('Nguyễn Văn An')
    expect(result.persons[0].note).toBe(persons[0].note)
    expect(result.relationships).toEqual(relationships)
    expect(result.person_details_private).toBeUndefined()
    expect(result.custom_events).toBeUndefined()
  })

  test('turns number and boolean columns back into numbers and booleans', async () => {
    const [an, binh] = (
      await parseCsvZip(await exportToCsvZip({ persons, relationships }))
    ).persons
    expect(an.birth_year).toBe(1950)
    expect(an.birth_month).toBe(3)
    expect(an.is_deceased).toBe(true)
    expect(an.birth_order).toBe(1)
    expect(binh.is_in_law).toBe(true)
    expect(binh.is_deceased).toBe(false)
  })

  test('turns empty cells into null', async () => {
    const [an, binh] = (
      await parseCsvZip(await exportToCsvZip({ persons, relationships }))
    ).persons
    expect(an.birth_day).toBeNull()
    expect(binh.birth_year).toBeNull()
    expect(binh.note).toBeNull()
  })

  test('keeps text columns as strings (timestamps, ids)', async () => {
    const result = await parseCsvZip(
      await zipWith({
        'persons.csv': 'id,full_name,created_at\n123,2024,2024-01-02T03:04:05Z',
        'relationships.csv': 'id,type,person_a,person_b\n1,marriage,123,456'
      })
    )
    expect(result.persons[0]).toEqual({
      id: '123',
      full_name: '2024',
      created_at: '2024-01-02T03:04:05Z'
    })
    expect(result.relationships[0].person_a).toBe('123')
  })

  test('keeps the leading zero of phone numbers', async () => {
    const blob = await exportToCsvZip({
      persons,
      relationships,
      person_details_private: [
        {
          person_id: 'p1',
          phone_number: '0912345678',
          occupation: 'Giáo viên',
          current_residence: 'Huế'
        }
      ]
    })
    const result = await parseCsvZip(blob)
    expect(result.person_details_private).toEqual([
      {
        person_id: 'p1',
        phone_number: '0912345678',
        occupation: 'Giáo viên',
        current_residence: 'Huế'
      }
    ])
  })

  test('reads custom events with dates as text', async () => {
    const event = {
      id: 'e1',
      name: 'Giỗ tổ',
      content: 'Họp họ, ăn cỗ',
      event_date: '2025-04-10',
      location: null,
      created_by: null
    }
    const result = await parseCsvZip(
      await exportToCsvZip({ persons, relationships, custom_events: [event] })
    )
    expect(result.custom_events).toEqual([event])
  })

  test('keeps the recurrence of custom events', async () => {
    const event = {
      id: 'e2',
      name: 'Họp họ',
      content: null,
      event_date: '2020-04-02',
      location: null,
      created_by: null,
      recurrence: 'yearly_lunar'
    }
    const result = await parseCsvZip(
      await exportToCsvZip({ persons, relationships, custom_events: [event] })
    )
    expect(result.custom_events?.[0].recurrence).toBe('yearly_lunar')
  })

  test('keeps the burial place of members as text', async () => {
    const result = await parseCsvZip(
      await exportToCsvZip({
        persons: [
          { ...persons[0], burial_place: 'Nghĩa trang Văn Điển, lô 12' },
          { ...persons[1], burial_place: null }
        ],
        relationships
      })
    )
    expect(result.persons[0].burial_place).toBe('Nghĩa trang Văn Điển, lô 12')
    expect(result.persons[1].burial_place).toBeNull()
  })

  test('accepts files without a BOM', async () => {
    const result = await parseCsvZip(
      await zipWith({
        'persons.csv': 'id,full_name\np1,Lê Văn Cường',
        'relationships.csv': 'id,type,person_a,person_b'
      })
    )
    expect(result.persons[0].id).toBe('p1')
    expect(result.relationships).toEqual([])
  })

  test('rejects a zip without persons.csv', async () => {
    const blob = await zipWith({ 'relationships.csv': 'id' })
    await expect(parseCsvZip(blob)).rejects.toThrow('persons.csv')
  })
})

describe('formula escaping', () => {
  const risky = [
    '=SUM(1)',
    '+84 912 345 678',
    '-1+1',
    '@cmd',
    '\tTabbed',
    '\rReturn',
    "'=already quoted",
    "'+84 912",
    "'Văn An",
    "O'Neil",
    "'",
    '=1+1,"x"'
  ]

  test('prefixes cells that start with =, +, -, @, tab or CR with an apostrophe', async () => {
    const blob = await exportToCsvZip({
      persons: [{ id: 'p1', full_name: '=SUM(1)', note: '+84 912' }],
      relationships
    })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const csv = await zip.file('persons.csv')!.async('text')
    expect(csv).toContain("'=SUM(1)")
    expect(csv).toContain("'+84 912")
  })

  test('import restores every risky value exactly', async () => {
    const rows = risky.map((value, i) => ({
      id: `p${i}`,
      full_name: value,
      note: value
    }))
    const blob = await exportToCsvZip({
      persons: rows,
      relationships,
      person_details_private: risky.map((value, i) => ({
        person_id: `p${i}`,
        phone_number: value,
        occupation: null,
        current_residence: value
      })),
      custom_events: risky.map((value, i) => ({
        id: `e${i}`,
        name: value,
        content: value,
        event_date: '2024-01-01',
        location: value,
        created_by: null
      }))
    })
    const parsed = await parseCsvZip(blob)
    expect(parsed.persons.map((p) => p.full_name)).toEqual(risky)
    expect(parsed.persons.map((p) => p.note)).toEqual(risky)
    expect(parsed.person_details_private?.map((p) => p.phone_number)).toEqual(
      risky
    )
    expect(parsed.custom_events?.map((e) => e.name)).toEqual(risky)
  })

  test('import leaves a lone leading apostrophe before a normal character', async () => {
    const parsed = await parseCsvZip(
      await zipWith({
        'persons.csv': "id,full_name\np1,'Văn An\n",
        'relationships.csv': 'id,type,person_a,person_b\n'
      })
    )
    expect(parsed.persons[0].full_name).toBe("'Văn An")
  })

  test('typed numeric columns still round-trip', async () => {
    const parsed = await parseCsvZip(
      await exportToCsvZip({ persons, relationships })
    )
    expect(parsed.persons[0].birth_year).toBe(1950)
    expect(parsed.persons[0].is_deceased).toBe(true)
    expect(parsed.persons[1].note).toBeNull()
  })
})

describe('parseCsvZip rejects broken CSV files', () => {
  const header = 'id,full_name,gender,birth_year'
  const goodRelationships = 'id,type,person_a,person_b\nr1,marriage,p1,p2\n'

  async function parseError(files: Record<string, string>) {
    try {
      await parseCsvZip(await zipWith(files))
    } catch (error) {
      return error
    }
    throw new Error('expected parseCsvZip to throw')
  }

  test('a row with too few cells names the file and line', async () => {
    const error = await parseError({
      'persons.csv': `${header}\np1,An,male,1950\np2,Bình,female\n`,
      'relationships.csv': goodRelationships
    })
    expect(error).toBeInstanceOf(CsvParseError)
    expect(error).toMatchObject({
      file: 'persons.csv',
      line: 3,
      problem: 'tooFewFields'
    })
  })

  test('a row with too many cells names the file and line', async () => {
    const error = await parseError({
      'persons.csv': `${header}\np1,An,male,1950\n`,
      'relationships.csv':
        'id,type,person_a,person_b\r\nr1,marriage,p1,p2\r\n\r\nr2,marriage,p1,p2,extra\r\n'
    })
    expect(error).toMatchObject({
      file: 'relationships.csv',
      line: 4,
      problem: 'tooManyFields'
    })
  })

  test('an unclosed quote names the line where it opens', async () => {
    const error = await parseError({
      'persons.csv': `${header}\np1,An,male,1950\np2,"Bình,female,1952\np3,Chi,female,1980\n`,
      'relationships.csv': goodRelationships
    })
    expect(error).toMatchObject({
      file: 'persons.csv',
      line: 3,
      problem: 'brokenQuotes'
    })
  })

  test('a malformed quote is rejected', async () => {
    const error = await parseError({
      'persons.csv': `${header}\np1,"An"x,male,1950\n`,
      'relationships.csv': goodRelationships
    })
    expect(error).toMatchObject({
      file: 'persons.csv',
      problem: 'brokenQuotes'
    })
  })

  test('the line counts lines inside quoted cells', async () => {
    const error = await parseError({
      'persons.csv': `${header},note\np1,An,male,1950,"dòng 1\ndòng 2"\np2,Bình\n`,
      'relationships.csv': goodRelationships
    })
    expect(error).toMatchObject({ line: 4, problem: 'tooFewFields' })
  })

  test('optional files are checked too', async () => {
    const error = await parseError({
      'persons.csv': `${header}\np1,An,male,1950\n`,
      'relationships.csv': goodRelationships,
      'custom_events.csv': 'id,name,event_date\ne1,Giỗ tổ\n'
    })
    expect(error).toMatchObject({
      file: 'custom_events.csv',
      line: 2,
      problem: 'tooFewFields'
    })
  })

  test('blank lines, blank rows of commas and a missing last newline are fine', async () => {
    const result = await parseCsvZip(
      await zipWith({
        'persons.csv': `\uFEFF${header}\r\np1,An,male,1950\r\n\r\n,,,\r\np2,Bình,female,1952\r\n\r\n\r\n`,
        'relationships.csv': 'id,type,person_a,person_b\nr1,marriage,p1,p2'
      })
    )
    expect(result.persons.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(result.persons[1].birth_year).toBe(1952)
    expect(result.relationships).toHaveLength(1)
  })

  test('an export with no relationships still imports', async () => {
    const result = await parseCsvZip(
      await exportToCsvZip({ persons, relationships: [] })
    )
    expect(result.persons).toHaveLength(2)
    expect(result.relationships).toEqual([])
  })
})
