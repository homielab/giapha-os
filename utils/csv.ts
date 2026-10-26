import JSZip from 'jszip'
import Papa from 'papaparse'

import { Person, Relationship } from '@/types'

const UTF8_BOM = '\uFEFF'

// Only these persons.csv columns hold numbers/booleans. Every other column is
// text and must stay a string (e.g. phone numbers keep their leading zero).
const PERSON_TYPED_FIELDS = new Set([
  'birth_year',
  'birth_month',
  'birth_day',
  'death_year',
  'death_month',
  'death_day',
  'death_lunar_year',
  'death_lunar_month',
  'death_lunar_day',
  'is_deceased',
  'is_in_law',
  'birth_order',
  'generation'
])

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text
}

function parseCsv<T>(
  csv: string,
  fileName: string,
  typedFields: Set<string> = new Set()
): T[] {
  const parsed = Papa.parse<Record<string, unknown>>(stripBom(csv), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: (field) => typedFields.has(String(field))
  })

  if (parsed.errors.length > 0) {
    console.error(`Lỗi parse ${fileName}:`, parsed.errors)
  }

  // Empty cells become null, as in the exported data.
  return parsed.data.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      out[key] = value === '' ? null : value
    }
    return out as T
  })
}

interface PersonDetailsPrivateRow {
  person_id: string
  phone_number: string | null
  occupation: string | null
  current_residence: string | null
}

interface CustomEventRow {
  id: string
  name: string
  content: string | null
  event_date: string
  location: string | null
  created_by: string | null
}

export async function exportToCsvZip(data: {
  persons: Partial<Person>[]
  relationships: Partial<Relationship>[]
  person_details_private?: PersonDetailsPrivateRow[]
  custom_events?: CustomEventRow[]
}): Promise<Blob> {
  const personsCsv = UTF8_BOM + Papa.unparse(data.persons)
  const relationshipsCsv = UTF8_BOM + Papa.unparse(data.relationships)

  const zip = new JSZip()
  zip.file('persons.csv', personsCsv)
  zip.file('relationships.csv', relationshipsCsv)

  if (data.person_details_private && data.person_details_private.length > 0) {
    zip.file(
      'person_details_private.csv',
      UTF8_BOM + Papa.unparse(data.person_details_private)
    )
  }

  if (data.custom_events && data.custom_events.length > 0) {
    zip.file('custom_events.csv', UTF8_BOM + Papa.unparse(data.custom_events))
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return zipBlob
}

export async function parseCsvZip(zipBlob: Blob): Promise<{
  persons: Partial<Person>[]
  relationships: Partial<Relationship>[]
  person_details_private?: PersonDetailsPrivateRow[]
  custom_events?: CustomEventRow[]
}> {
  const zip = new JSZip()
  const loadedZip = await zip.loadAsync(zipBlob)

  const personsFile = loadedZip.file('persons.csv')
  const relationshipsFile = loadedZip.file('relationships.csv')

  if (!personsFile || !relationshipsFile) {
    throw new Error(
      'File ZIP không hợp lệ: thiếu persons.csv hoặc relationships.csv.'
    )
  }

  const [personsCsvRaw, relationshipsCsvRaw] = await Promise.all([
    personsFile.async('text'),
    relationshipsFile.async('text')
  ])

  const result: {
    persons: Partial<Person>[]
    relationships: Partial<Relationship>[]
    person_details_private?: PersonDetailsPrivateRow[]
    custom_events?: CustomEventRow[]
  } = {
    persons: parseCsv<Partial<Person>>(
      personsCsvRaw,
      'persons.csv',
      PERSON_TYPED_FIELDS
    ),
    relationships: parseCsv<Partial<Relationship>>(
      relationshipsCsvRaw,
      'relationships.csv'
    )
  }

  // Parse person_details_private.csv (optional, backward compat)
  const privateFile = loadedZip.file('person_details_private.csv')
  if (privateFile) {
    result.person_details_private = parseCsv<PersonDetailsPrivateRow>(
      await privateFile.async('text'),
      'person_details_private.csv'
    )
  }

  // Parse custom_events.csv (optional, backward compat)
  const eventsFile = loadedZip.file('custom_events.csv')
  if (eventsFile) {
    result.custom_events = parseCsv<CustomEventRow>(
      await eventsFile.async('text'),
      'custom_events.csv'
    )
  }

  return result
}
