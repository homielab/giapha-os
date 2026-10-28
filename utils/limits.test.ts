import { describe, expect, test } from 'bun:test'

import { clipImportedText } from './limits'

describe('clipImportedText', () => {
  test('cuts each field at its limit and counts the cuts', () => {
    const payload = {
      persons: [{ full_name: 'a'.repeat(250), note: 'b'.repeat(2100) }],
      relationships: [{ note: 'c'.repeat(2001) }],
      person_details_private: [
        { occupation: 'd'.repeat(501), phone_number: '1' }
      ],
      custom_events: [{ name: 'e'.repeat(201), content: 'ok' }]
    }
    expect(clipImportedText(payload)).toBe(5)
    expect(payload.persons[0].full_name).toHaveLength(200)
    expect(payload.persons[0].note).toHaveLength(2000)
    expect(payload.relationships[0].note).toHaveLength(2000)
    expect(payload.person_details_private[0].occupation).toHaveLength(500)
    expect(payload.custom_events[0].name).toHaveLength(200)
  })

  test('leaves short values and missing sections alone', () => {
    expect(clipImportedText({ persons: [{ note: 'ok' }] })).toBe(0)
  })
})
