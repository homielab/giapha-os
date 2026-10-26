import { describe, expect, test } from 'bun:test'

import {
  BackupParseError,
  parseRestoreFile,
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
    const payload = await parseRestoreFile(
      file(
        'b.ged',
        '0 HEAD\n0 @I1@ INDI\n1 NAME /Nguyễn/ Văn An\n1 SEX M\n0 TRLR'
      )
    )
    expect(payload.persons).toHaveLength(1)
  })
})
