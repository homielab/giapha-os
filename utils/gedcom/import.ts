import { readFamilies } from './families'
import { readNoteRecord, unescapeLine } from './notes'
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

export type ParseGedcomOptions = {
  /**
   * Full names surname first (Vietnamese order); default true. Ignored for
   * files exported by this app (`1 SOUR Giapha_OS`), whose names already read
   * in the right order.
   */
  surnameFirst?: boolean
  /** Full name for a person without NAME; default 'Unknown'. */
  unnamedName?: string
}

export function parseGedcom(
  gedcom: string,
  { surnameFirst = true, unnamedName = 'Unknown' }: ParseGedcomOptions = {}
): {
  persons: GedcomPerson[]
  relationships: GedcomRelationship[]
  stats: GedcomImportStats
} {
  const lines = gedcom
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0)
    .map(unescapeLine)
  const records = readRecords(lines)
  const ownExport = lines.some((line) => /^1 SOUR Giapha_OS\s*$/.test(line))

  const ctx: PersonContext = {
    noteTexts: new Map(),
    sourTexts: new Map(),
    stats: { missingNotes: 0, sources: 0, droppedFamilyNotes: 0, unnamed: 0 },
    adoptedLinks: new Set(),
    surnameFirst: surnameFirst && !ownExport,
    unnamedName
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

  const relationships = readFamilies(records, idMap, ctx)
  return {
    persons,
    relationships: dedupeRelationships(relationships),
    stats: ctx.stats
  }
}
