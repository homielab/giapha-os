import { createNoteReader } from './notes'
import type { PersonContext } from './persons'
import type { ParseRecord } from './records'
import { sourceNotes } from './sources'
import type { GedcomRelationship } from './types'

// Relationships of the FAM records: a marriage between HUSB and WIFE (with
// the family's NOTEs and cited sources as its note) and a parent link from
// each of them to every CHIL. `ctx.adoptedLinks` holds `${indiXref}
// ${famXref}` of FAMC links marked PEDI ADOPTED, FOSTER, STEP
// or SEALING. Members missing from `idMap`
// are skipped. MARR (DATE, PLAC) and DIV become "Kết hôn: …" / "Ly hôn: …"
// lines of the note, unless the note already has that line (a file this app
// exported). A family without both spouses has no marriage, so its notes
// and sources are dropped and counted in `ctx.stats.droppedFamilyNotes`.
export function readFamilies(
  records: ParseRecord[],
  idMap: Map<string, string>,
  ctx: PersonContext
): GedcomRelationship[] {
  const relationships: GedcomRelationship[] = []
  for (const record of records.filter((r) => r.type === 'FAM')) {
    let husb = null
    let wife = null
    const children: { uuid: string; xref: string }[] = []
    const noteReader = createNoteReader(ctx.noteTexts, ctx.stats)
    let inNote = false
    let event: { label: string; parts: string[] } | null = null
    const events: { label: string; parts: string[] }[] = []

    for (const line of record.lines) {
      const noteMatch = line.match(/^(1|2)\s+(NOTE|CONC|CONT)(?:\s(.*))?$/)
      if (noteMatch && noteMatch[1] === '1' && noteMatch[2] === 'NOTE') {
        noteReader.start(noteMatch[3] ?? '')
        inNote = true
        continue
      }
      if (noteMatch && noteMatch[1] === '2' && inNote) {
        noteReader.continue(noteMatch[2], noteMatch[3] ?? '')
        continue
      }
      if (line.startsWith('1 ')) {
        inNote = false
        const tag = line.split(/\s+/)[1]
        event =
          tag === 'MARR'
            ? { label: 'Kết hôn', parts: [] }
            : tag === 'DIV'
              ? { label: 'Ly hôn', parts: [] }
              : null
        if (event) {
          events.push(event)
          continue
        }
      }
      const detail = line.match(/^2\s+(DATE|PLAC)\s+(.+)$/)
      if (event && detail && detail[2].trim()) {
        event.parts.push(detail[2].trim())
        continue
      }

      const match = line.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/)
      if (match) {
        const tag = match[1]
        const refId = match[2]
        const uuid = idMap.get(refId)
        if (!uuid) continue

        if (tag === 'HUSB') husb = uuid
        else if (tag === 'WIFE') wife = uuid
        else if (tag === 'CHIL') children.push({ uuid, xref: refId })
      }
    }

    const baseNote = [
      ...noteReader.notes,
      ...sourceNotes(record.lines, ctx.sourTexts)
    ]
      .filter((n) => n.trim())
      .join('\n\n')
    const noteLines = new Set(baseNote.split('\n'))
    const eventLines = events
      .filter((e) => e.label === 'Ly hôn' || e.parts.length > 0)
      .map((e) =>
        e.parts.length > 0 ? `${e.label}: ${e.parts.join(', ')}` : e.label
      )
      .filter((l, i, all) => !noteLines.has(l) && all.indexOf(l) === i)
    const note = [baseNote, eventLines.join('\n')].filter(Boolean).join('\n\n')
    if (husb && wife && husb !== wife) {
      relationships.push({
        type: 'marriage',
        person_a: husb,
        person_b: wife,
        ...(note ? { note } : {})
      })
    } else if (note) {
      // No marriage to hold the note: the import drops it and warns
      ctx.stats.droppedFamilyNotes++
    }

    // Link each child to the parents this family actually has
    for (const { uuid: childId, xref } of children) {
      const type = ctx.adoptedLinks.has(`${xref} ${record.id}`)
        ? 'adopted_child'
        : 'biological_child'
      for (const parent of [husb, wife]) {
        if (parent && parent !== childId) {
          relationships.push({ type, person_a: parent, person_b: childId })
        }
      }
    }
  }
  return relationships
}
