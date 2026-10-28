import { readFamilies } from './families'
import { readNoteRecord } from './notes'
import { readPerson, type PersonContext } from './persons'
import { readRecords } from './records'
import { dedupeRelationships } from './relationships'
import { readSourceRecord } from './sources'
import type {
  GedcomImportStats,
  GedcomPerson,
  GedcomRelationship
} from './types'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function parseGedcom(gedcom: string): {
  persons: GedcomPerson[]
  relationships: GedcomRelationship[]
  stats: GedcomImportStats
} {
  const lines = gedcom
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0)
  const records = readRecords(lines)

  const ctx: PersonContext = {
    noteTexts: new Map(),
    sourTexts: new Map(),
    stats: { missingNotes: 0, sources: 0 },
    adoptedLinks: new Set()
  }
  for (const record of records) {
    if (record.type === 'NOTE') {
      ctx.noteTexts.set(record.id, readNoteRecord(record.first, record.lines))
    } else if (record.type === 'SOUR' || record.type === 'REPO') {
      ctx.stats.sources++
      if (record.type === 'SOUR') {
        ctx.sourTexts.set(record.id, readSourceRecord(record.lines))
      }
    }
  }

  // GEDCOM xref -> new person id, in file order.
  const idMap = new Map<string, string>()
  const persons: GedcomPerson[] = []
  for (const record of records.filter((r) => r.type === 'INDI')) {
    const id = generateUUID()
    idMap.set(record.id, id)
    persons.push(readPerson(record, id, ctx))
  }

  const relationships = readFamilies(
    records,
    idMap,
    ctx.adoptedLinks,
    ctx.sourTexts
  )
  return {
    persons,
    relationships: dedupeRelationships(relationships),
    stats: ctx.stats
  }
}
