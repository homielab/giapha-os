import JSZip from 'jszip'
import Papa from 'papaparse'

import { Person, Relationship } from '@/types'
import {
  CsvParseError,
  CsvParseProblem,
  CsvZipInvalidError
} from '@/utils/csvErrors'

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

// Spreadsheet apps run a cell starting with one of these as a formula. On
// export such cells get a leading apostrophe; cells that already start with
// apostrophes before a trigger character get one more, so import can strip
// exactly one and restore the original text.
const FORMULA_TRIGGER = /^'*[=+\-@\t\r]/
const ESCAPED_FORMULA = /^'(?='*[=+\-@\t\r])/

function unparseCsv(rows: object[]): string {
  return UTF8_BOM + Papa.unparse(rows, { escapeFormulae: FORMULA_TRIGGER })
}

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text
}

// PapaParse errors that mean the columns of a row cannot be trusted. Other
// reports (e.g. "UndetectableDelimiter" for an empty or one-column file, where
// PapaParse falls back to a comma) are harmless and ignored.
const BLOCKING_ERRORS: Record<string, CsvParseProblem> = {
  TooFewFields: 'tooFewFields',
  TooManyFields: 'tooManyFields',
  MissingQuotes: 'brokenQuotes',
  InvalidQuotes: 'brokenQuotes'
}

/** 1-based line number of the character at `offset`. */
function lineAt(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++
  }
  return line
}

/** 1-based line on which a row ending at `cursor` (after its newline) ends. */
function lastLineBefore(text: string, cursor: number): number {
  let end = Math.min(cursor, text.length)
  while (end > 0 && (text[end - 1] === '\n' || text[end - 1] === '\r')) end--
  return lineAt(text, Math.max(end - 1, 0))
}

/**
 * Parses one CSV file of the ZIP. A row with too few or too many cells, or a
 * broken quote, throws CsvParseError with the file name and line, so a file
 * edited by hand never reaches the restore. Blank lines are skipped.
 */
function parseCsv<T>(
  csv: string,
  fileName: string,
  typedFields: Set<string> = new Set()
): T[] {
  const text = stripBom(csv)
  const rows: Record<string, unknown>[] = []
  let failure: CsvParseError | null = null

  Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: (field) => typedFields.has(String(field)),
    step: (result, parser) => {
      const error = result.errors.find((e) => e.code in BLOCKING_ERRORS)
      if (error) {
        const line =
          error.type === 'Quotes' && typeof error.index === 'number'
            ? lineAt(text, error.index)
            : lastLineBefore(text, result.meta.cursor)
        failure = new CsvParseError(fileName, line, BLOCKING_ERRORS[error.code])
        parser.abort()
        return
      }
      rows.push(result.data)
    }
  })

  if (failure) throw failure

  // Empty cells become null, as in the exported data.
  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      out[key] =
        value === ''
          ? null
          : typeof value === 'string'
            ? value.replace(ESCAPED_FORMULA, '')
            : value
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
  /** Missing in files exported before events could repeat (= 'none'). */
  recurrence?: string | null
}

export async function exportToCsvZip(data: {
  persons: object[]
  relationships: object[]
  person_details_private?: PersonDetailsPrivateRow[]
  custom_events?: CustomEventRow[]
}): Promise<Blob> {
  const personsCsv = unparseCsv(data.persons)
  const relationshipsCsv = unparseCsv(data.relationships)

  const zip = new JSZip()
  zip.file('persons.csv', personsCsv)
  zip.file('relationships.csv', relationshipsCsv)

  if (data.person_details_private && data.person_details_private.length > 0) {
    zip.file(
      'person_details_private.csv',
      unparseCsv(data.person_details_private)
    )
  }

  if (data.custom_events && data.custom_events.length > 0) {
    zip.file('custom_events.csv', unparseCsv(data.custom_events))
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
    throw new CsvZipInvalidError()
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
