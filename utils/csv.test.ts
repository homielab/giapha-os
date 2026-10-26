import { describe, expect, test } from 'bun:test'

import JSZip from 'jszip'

import { exportToCsvZip, parseCsvZip } from './csv'

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
