// GEDCOM sources: `0 @S1@ SOUR` records (title, abbreviation, text) cited by
// `SOUR @S1@` lines of a person or family. The app has no source table, so a
// citation becomes a "Nguồn: <title>" line in the note. Repositories
// (`0 @R1@ REPO`) are only counted.

import { isNotePointer } from './notes'

// Title of a source record: TITL, else ABBR, plus its TEXT (CONC/CONT joined).
export function readSourceRecord(lines: string[]): string {
  const values: Record<string, string> = {}
  let current = ''
  for (const line of lines) {
    const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s(.*))?$/)
    if (!match) continue
    const [, level, tag, value = ''] = match
    if (level === '1') {
      current = tag
      if (tag === 'TITL' || tag === 'ABBR' || tag === 'TEXT') {
        values[tag] = value
      }
    } else if (level === '2' && current in values) {
      if (tag === 'CONT') values[current] += '\n' + value
      else if (tag === 'CONC') values[current] += value
    }
  }
  const title = (values.TITL ?? '').trim() || (values.ABBR ?? '').trim()
  const text = (values.TEXT ?? '').trim()
  return [title, text].filter(Boolean).join('\n')
}

// Xref of a `SOUR @S1@` citation line at any level, else null.
export function sourceCitation(line: string): string | null {
  const match = line.match(/^\d+\s+SOUR\s+(.*)$/)
  if (!match || !isNotePointer(match[1])) return null
  return match[1].trim().slice(1, -1)
}

// Note lines for the sources cited in `lines` (each source once, in order).
export function sourceNotes(
  lines: string[],
  sourTexts: Map<string, string>
): string[] {
  const seen = new Set<string>()
  const notes: string[] = []
  for (const line of lines) {
    const xref = sourceCitation(line)
    if (!xref || seen.has(xref)) continue
    seen.add(xref)
    const text = sourTexts.get(xref)
    if (text) notes.push(`Nguồn: ${text}`)
  }
  return notes
}
