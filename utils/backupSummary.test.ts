import { describe, expect, test } from 'bun:test'

import {
  BackupParseError,
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
      bytesFile('a.ged', bytes)
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
    expect(payload.persons[0].full_name).toBe('An Nguyễn')
    expect(warning).toBeUndefined()
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
