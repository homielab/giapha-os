import { describe, expect, test } from 'bun:test'

import {
  buildRestorePayload,
  isMissingRestoreFunction,
  MAX_PERSONS,
  MAX_RELATIONSHIPS,
  RESTORE_PAYLOAD_VERSION,
  validateImportPayload,
  type ImportPayload,
  type Translator
} from './backupPayload'

// Returns the key so tests can assert which check failed.
const t: Translator = (key, values) =>
  values ? `${key}:${JSON.stringify(values)}` : key

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const E = '33333333-3333-4333-8333-333333333333'

function person(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    full_name: 'Nguyễn Văn An',
    gender: 'male',
    birth_year: 1950,
    birth_month: null,
    birth_day: null,
    death_year: null,
    death_month: null,
    death_day: null,
    death_lunar_year: null,
    death_lunar_month: null,
    death_lunar_day: null,
    is_deceased: false,
    is_in_law: false,
    birth_order: 1,
    generation: 1,
    other_names: null,
    avatar_url: null,
    note: null,
    created_at: '2024-01-02T03:04:05.000Z',
    updated_at: '2024-01-02T03:04:05.000Z',
    ...overrides
  }
}

function validPayload(): ImportPayload {
  return {
    persons: [person(A), person(B, { gender: 'female', is_in_law: true })],
    relationships: [
      {
        id: 'old-id',
        type: 'marriage',
        person_a: A,
        person_b: B,
        note: null,
        created_at: '2024-01-02T03:04:05.000Z'
      }
    ],
    person_details_private: [
      {
        person_id: A,
        phone_number: '0901234567',
        occupation: null,
        current_residence: 'Hà Nội'
      }
    ],
    custom_events: [
      {
        id: E,
        name: 'Họp họ',
        content: null,
        event_date: '2026-02-01',
        location: null,
        created_by: A
      }
    ]
  } as ImportPayload
}

function withChange(change: (payload: Record<string, unknown[]>) => void) {
  const payload = validPayload() as unknown as Record<string, unknown[]>
  change(payload)
  return payload
}

describe('validateImportPayload', () => {
  test('accepts a valid backup', () => {
    expect(validateImportPayload(validPayload(), t)).toBeNull()
  })

  test('accepts a backup without private details and events', () => {
    const payload = validPayload()
    delete payload.person_details_private
    delete payload.custom_events
    expect(validateImportPayload(payload, t)).toBeNull()
  })

  test('rejects a missing or malformed payload', () => {
    expect(validateImportPayload(null, t)).toBe('invalidData')
    expect(validateImportPayload('backup', t)).toBe('invalidData')
    expect(validateImportPayload({ persons: [] }, t)).toBe(
      'invalidDataStructure'
    )
    expect(validateImportPayload({ persons: [], relationships: [] }, t)).toBe(
      'emptyBackup'
    )
  })

  test('rejects too many rows', () => {
    const persons = Array.from({ length: MAX_PERSONS + 1 }, () => person(A))
    expect(validateImportPayload({ persons, relationships: [] }, t)).toBe(
      `tooManyPersons:${JSON.stringify({ count: MAX_PERSONS })}`
    )
    const relationships = Array.from({ length: MAX_RELATIONSHIPS + 1 })
    expect(
      validateImportPayload({ persons: [person(A)], relationships }, t)
    ).toBe(
      `tooManyRelationships:${JSON.stringify({ count: MAX_RELATIONSHIPS })}`
    )
  })

  test('rejects invalid members', () => {
    expect(
      validateImportPayload(
        withChange((p) => (p.persons[0] = person('p1'))),
        t
      )
    ).toBe('invalidPersonId')
    expect(
      validateImportPayload(
        withChange((p) => (p.persons[1] = person(A))),
        t
      )
    ).toBe('duplicatePersonId')
    expect(
      validateImportPayload(
        withChange((p) => (p.persons[0] = person(A, { full_name: '  ' }))),
        t
      )
    ).toBe('invalidPersonName')
    expect(
      validateImportPayload(
        withChange((p) => (p.persons[0] = person(A, { gender: 'unknown' }))),
        t
      )
    ).toBe('invalidGender')
    expect(
      validateImportPayload(
        withChange(
          (p) => (p.persons[0] = person(A, { note: 'x'.repeat(2001) }))
        ),
        t
      )
    ).toBe(`fieldTooLong:${JSON.stringify({ field: 'note' })}`)
  })

  test('rejects relationships to unknown members, to oneself or of an unknown type', () => {
    const relationship = (overrides: Record<string, unknown>) =>
      withChange(
        (p) =>
          (p.relationships[0] = {
            type: 'marriage',
            person_a: A,
            person_b: B,
            ...overrides
          })
      )
    for (const overrides of [
      { person_b: E },
      { person_b: A },
      { type: 'friend' }
    ]) {
      expect(validateImportPayload(relationship(overrides), t)).toBe(
        'invalidRelationshipData'
      )
    }
  })

  test('rejects private details of an unknown member', () => {
    const payload = withChange(
      (p) =>
        (p.person_details_private[0] = {
          person_id: E,
          phone_number: null,
          occupation: null,
          current_residence: null
        })
    )
    expect(validateImportPayload(payload, t)).toBe(
      'invalidPrivateDetailsPerson'
    )
  })

  test('rejects invalid custom events', () => {
    const payload = withChange(
      (p) =>
        (p.custom_events[0] = {
          id: 'e1',
          name: 'Họp họ',
          event_date: '2026-02-01'
        })
    )
    expect(validateImportPayload(payload, t)).toBe('invalidEventId')
  })
})

describe('buildRestorePayload', () => {
  test('versions the payload and counts each section', () => {
    const payload = buildRestorePayload(validPayload())
    expect(payload.version).toBe(RESTORE_PAYLOAD_VERSION)
    expect(payload.counts).toEqual({
      persons: 2,
      relationships: 1,
      person_details_private: 1,
      custom_events: 1
    })
  })

  test('strips database-managed fields', () => {
    const payload = buildRestorePayload(validPayload())
    expect(payload.persons[0]).not.toHaveProperty('created_at')
    expect(payload.persons[0]).not.toHaveProperty('updated_at')
    expect(payload.relationships[0]).toEqual({
      type: 'marriage',
      person_a: A,
      person_b: B,
      note: null
    })
    expect(payload.custom_events[0]).not.toHaveProperty('created_by')
  })

  test('fills missing optional fields with null and defaults', () => {
    const payload = buildRestorePayload({
      persons: [
        { id: A, full_name: 'An', gender: 'male' }
      ] as ImportPayload['persons'],
      relationships: []
    })
    expect(payload.persons[0]).toMatchObject({
      birth_year: null,
      is_deceased: false,
      is_in_law: false,
      note: null
    })
    expect(payload.person_details_private).toEqual([])
    expect(payload.custom_events).toEqual([])
    expect(payload.counts.custom_events).toBe(0)
  })
})

describe('isMissingRestoreFunction', () => {
  test('detects a database without the restore function', () => {
    expect(isMissingRestoreFunction({ code: 'PGRST202' })).toBe(true)
    expect(isMissingRestoreFunction({ code: '42883' })).toBe(true)
  })

  test('does not treat other errors as a missing function', () => {
    expect(isMissingRestoreFunction(null)).toBe(false)
    expect(isMissingRestoreFunction({ code: '23505' })).toBe(false)
    expect(isMissingRestoreFunction({ code: '42501' })).toBe(false)
  })
})
