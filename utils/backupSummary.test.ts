import { describe, expect, test } from 'bun:test'

import { validateImportPayload } from './backupPayload'
import {
  BackupParseError,
  formatExportedAt,
  parseRestoreFile,
  readRestoreFile,
  summarizeBackup
} from './backupSummary'

describe('summarizeBackup', () => {
  test('counts members, relationships and events', () => {
    expect(
      summarizeBackup({
        version: 3,
        timestamp: '2026-03-04T05:06:07.000Z',
        persons: [{}, {}, {}],
        relationships: [{}, {}],
        custom_events: [{}]
      })
    ).toEqual({
      persons: 3,
      relationships: 2,
      events: 1,
      exportedAt: '2026-03-04T05:06:07.000Z'
    })
  })

  test('missing events and timestamp count as 0 and null', () => {
    expect(
      summarizeBackup({ persons: [{}], relationships: [], timestamp: 'x' })
    ).toEqual({ persons: 1, relationships: 0, events: 0, exportedAt: null })
  })

  test('rejects anything without both lists', () => {
    expect(summarizeBackup(null)).toBeNull()
    expect(summarizeBackup([])).toBeNull()
    expect(summarizeBackup('text')).toBeNull()
    expect(summarizeBackup({ persons: [] })).toBeNull()
    expect(summarizeBackup({ persons: {}, relationships: [] })).toBeNull()
  })
})

describe('parseRestoreFile', () => {
  const file = (name: string, content: string) => ({
    name,
    text: async () => content
  })

  test('reads JSON', async () => {
    const payload = await parseRestoreFile(
      file('b.JSON', '{"persons":[],"relationships":[]}')
    )
    expect(payload.persons).toEqual([])
  })

  test('broken JSON throws BackupParseError', async () => {
    expect(parseRestoreFile(file('b.json', '{"persons":'))).rejects.toThrow(
      BackupParseError
    )
  })

  test('reads GEDCOM', async () => {
    const payload = await parseRestoreFile({
      name: 'b.ged',
      arrayBuffer: async () =>
        new TextEncoder().encode(
          '0 HEAD\n0 @I1@ INDI\n1 NAME /Nguyễn/ Văn An\n1 SEX M\n0 TRLR'
        ).buffer as ArrayBuffer
    })
    expect(payload.persons).toHaveLength(1)
  })

  const bytesFile = (name: string, bytes: Uint8Array) => ({
    name,
    arrayBuffer: async () => bytes.buffer as ArrayBuffer
  })
  const ged = (name: string) =>
    `0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME ${name}\n1 SEX M\n0 TRLR`

  test('ANSI GEDCOM keeps accents and gives no warning', async () => {
    const bytes = Uint8Array.from(Buffer.from(ged('José /Müller/'), 'latin1'))
    const { payload, warning } = await readRestoreFile(
      bytesFile('a.ged', bytes),
      { surnameFirst: false }
    )
    expect(payload.persons[0].full_name).toBe('José Müller')
    expect(warning).toBeUndefined()
  })

  test('UTF-8 GEDCOM gives no warning', async () => {
    const bytes = new TextEncoder().encode(
      '0 HEAD\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME An /Nguyễn/\n0 TRLR'
    )
    const { payload, warning } = await readRestoreFile(
      bytesFile('a.ged', bytes)
    )
    expect(payload.persons[0].full_name).toBe('Nguyễn An')
    expect(warning).toBeUndefined()
    const asWritten = await readRestoreFile(bytesFile('a.ged', bytes), {
      surnameFirst: false
    })
    expect(asWritten.payload.persons[0].full_name).toBe('An Nguyễn')
  })

  test('ANSEL GEDCOM warns', async () => {
    const bytes = Uint8Array.from(
      Buffer.from(ged('An /Nguyen/').replace('ANSI', 'ANSEL'), 'latin1')
    )
    expect((await readRestoreFile(bytesFile('a.ged', bytes))).warning).toBe(
      'ansel'
    )
  })

  test('broken UTF-8 GEDCOM warns about replaced characters', async () => {
    const head = new TextEncoder().encode('0 HEAD\n0 @I1@ INDI\n1 NAME An /Ng')
    const bytes = Uint8Array.from([...head, 0xe1, 0x0a, ...head.slice(0, 0)])
    expect((await readRestoreFile(bytesFile('a.ged', bytes))).warning).toBe(
      'replacement'
    )
  })
})

describe('readRestoreFile length limits', () => {
  test('GEDCOM text over the limits is cut and counted', async () => {
    const long = 'x'.repeat(2500)
    const text = `0 HEAD\n0 @I1@ INDI\n1 NAME An /Nguyễn/\n1 SEX M\n1 NOTE ${long}\n0 TRLR`
    const { payload, truncated } = await readRestoreFile({
      name: 'a.ged',
      arrayBuffer: async () =>
        new TextEncoder().encode(text).buffer as ArrayBuffer
    })
    expect(payload.persons[0].note).toHaveLength(2000)
    expect(truncated).toBe(1)
    expect(validateImportPayload(payload, (key) => key)).toBeNull()
  })

  test('short GEDCOM text is not counted', async () => {
    const { truncated } = await readRestoreFile({
      name: 'a.ged',
      arrayBuffer: async () =>
        new TextEncoder().encode(
          '0 HEAD\n0 @I1@ INDI\n1 NAME An /Nguyễn/\n0 TRLR'
        ).buffer as ArrayBuffer
    })
    expect(truncated).toBe(0)
  })
})

describe('readRestoreFile GEDCOM stats', () => {
  const ged = (text: string) => ({
    name: 'a.ged',
    arrayBuffer: async () =>
      new TextEncoder().encode(text).buffer as ArrayBuffer
  })

  test('counts dropped notes and sources, outside the payload', async () => {
    const { payload, gedcom } = await readRestoreFile(
      ged(
        [
          '0 HEAD',
          '0 @I1@ INDI',
          '1 NAME An /Nguyễn/',
          '1 NOTE @N9@',
          '1 SOUR @S1@',
          '0 @S1@ SOUR',
          '1 TITL Gia phả',
          '0 @R1@ REPO',
          '0 TRLR'
        ].join('\n')
      )
    )
    expect(gedcom).toEqual({
      missingNotes: 1,
      sources: 2,
      droppedFamilyNotes: 0,
      unnamed: 0
    })
    expect(payload).not.toHaveProperty('stats')
    expect(payload.persons[0].note).toBe('Nguồn: Gia phả')
    expect(validateImportPayload(payload, (key) => key)).toBeNull()
  })

  test('JSON backups carry no GEDCOM stats', async () => {
    const { gedcom } = await readRestoreFile({
      name: 'a.json',
      text: async () => JSON.stringify({ persons: [], relationships: [] })
    })
    expect(gedcom).toBeUndefined()
  })
})

describe('formatExportedAt', () => {
  test('shows the date in Vietnam time whatever the browser time zone', () => {
    // 00:30 on 29 Oct in Vietnam, still 28 Oct in UTC and the US.
    expect(formatExportedAt('2026-10-28T17:30:00Z', 'vi')).toBe('29/10/2026')
    expect(formatExportedAt('2026-10-28T17:30:00Z', 'en')).toBe('10/29/2026')
  })

  test('returns an empty string for a missing or invalid date', () => {
    expect(formatExportedAt(null, 'vi')).toBe('')
    expect(formatExportedAt('', 'vi')).toBe('')
    expect(formatExportedAt('not a date', 'vi')).toBe('')
  })
})
