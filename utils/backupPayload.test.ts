import { describe, expect, test } from 'bun:test'

import {
  BACKUP_VERSION,
  buildRestorePayload,
  isMissingRestoreFunction,
  legacyCustomEventRows,
  legacyPersonRows,
  MAX_PERSONS,
  MAX_RELATIONSHIPS,
  MAX_REPORTED_ISSUES,
  RESTORE_PAYLOAD_VERSION,
  toCustomEventExport,
  toPersonExport,
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

  test('rejects two private detail rows for the same member', () => {
    const payload = withChange((p) =>
      p.person_details_private.push({
        person_id: A,
        phone_number: null,
        occupation: null,
        current_residence: null
      })
    )
    expect(validateImportPayload(payload, t)).toBe(
      `duplicatePrivateDetail:${JSON.stringify({ id: A })}`
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

  test('rejects a duplicate event ID', () => {
    const payload = withChange((p) =>
      p.custom_events.push({
        id: E,
        name: 'Họp họ',
        content: null,
        event_date: '2026-02-01',
        location: null,
        created_by: A
      })
    )
    expect(validateImportPayload(payload, t)).toBe(
      `duplicateEventId:${JSON.stringify({ id: E })}`
    )
  })

  test('rejects an invalid or missing event date', () => {
    const withEvent = (event: Record<string, unknown>) =>
      withChange((p) => (p.custom_events[0] = event))
    const expected = `invalidEventDate:${JSON.stringify({
      name: 'Họp họ',
      id: E
    })}`
    expect(
      validateImportPayload(
        withEvent({ id: E, name: 'Họp họ', event_date: 'abc' }),
        t
      )
    ).toBe(expected)
    expect(
      validateImportPayload(
        withEvent({ id: E, name: 'Họp họ', event_date: '2026-02-30' }),
        t
      )
    ).toBe(expected)
    expect(validateImportPayload(withEvent({ id: E, name: 'Họp họ' }), t)).toBe(
      expected
    )
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
      note: null,
      created_at: '2024-01-02T03:04:05.000Z'
    })
    expect(payload.custom_events[0]).not.toHaveProperty('created_by')
  })

  test('keeps a valid relationship created_at (spouse order), drops a bad one', () => {
    const base = validPayload()
    const rel0 = base.relationships[0]
    const payload = buildRestorePayload({
      ...base,
      relationships: [
        { ...rel0, id: 'x', created_at: '2020-01-02T03:04:05+00:00' },
        { ...rel0, created_at: 'not a date' }
      ]
    })
    expect(payload.relationships[0]).toEqual({
      type: 'marriage',
      person_a: A,
      person_b: B,
      note: null,
      created_at: '2020-01-02T03:04:05+00:00'
    })
    expect(payload.relationships[1]).not.toHaveProperty('created_at')
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

describe('validateImportPayload version', () => {
  test('accepts files without a version (oldest backups)', () => {
    const payload = validPayload()
    delete payload.version
    expect(validateImportPayload(payload, t)).toBeNull()
  })

  test('accepts versions 1 to the current one', () => {
    for (let version = 1; version <= BACKUP_VERSION; version++) {
      expect(
        validateImportPayload({ ...validPayload(), version }, t)
      ).toBeNull()
    }
  })

  test('refuses a file from a newer version', () => {
    expect(
      validateImportPayload(
        { ...validPayload(), version: BACKUP_VERSION + 1 },
        t
      )
    ).toBe(
      `backupFromNewerVersion:${JSON.stringify({
        version: BACKUP_VERSION + 1,
        supported: BACKUP_VERSION
      })}`
    )
  })

  test('refuses a version that is not a positive integer', () => {
    for (const version of [0, -1, 2.5, '3']) {
      expect(validateImportPayload({ ...validPayload(), version }, t)).toBe(
        'invalidBackupVersion'
      )
    }
  })
})

describe('validateImportPayload relationship checks', () => {
  const C = '44444444-4444-4444-8444-444444444444'
  const named = (id: string, full_name: string) => person(id, { full_name })
  const link = (type: string, a: string, b: string) => ({
    type,
    person_a: a,
    person_b: b
  })

  test('refuses a parent–child loop and names the people in it', () => {
    const payload = {
      persons: [named(A, 'Ông'), named(B, 'Cha'), named(C, 'Con')],
      relationships: [
        link('biological_child', A, B),
        link('biological_child', B, C),
        link('adopted_child', C, A)
      ]
    }
    expect(validateImportPayload(payload, t)).toBe(
      `backupRelationshipIssues:{"max":${MAX_REPORTED_ISSUES}}\n` +
        '• backupRelationshipCycle:{"path":"Ông → Cha → Con → Ông"}'
    )
  })

  test('refuses a couple stored twice, also in the other order', () => {
    const payload = {
      persons: [named(A, 'Chồng'), named(B, 'Vợ')],
      relationships: [link('marriage', A, B), link('marriage', B, A)]
    }
    const error = validateImportPayload(payload, t)
    expect(error).toContain('backupDuplicateSpouse')
    expect(error).toContain('Chồng')
    expect(error).toContain('Vợ')
  })

  test('refuses two identical parent–child rows and names both people', () => {
    for (const type of ['biological_child', 'adopted_child']) {
      const payload = {
        persons: [named(A, 'Cha'), named(B, 'Con')],
        relationships: [link(type, A, B), link(type, A, B)]
      }
      expect(validateImportPayload(payload, t)).toBe(
        `duplicateRelationship:${JSON.stringify({ a: 'Cha', b: 'Con' })}`
      )
    }
  })

  test('accepts the same pair linked as both biological and adopted child', () => {
    const payload = {
      persons: [named(A, 'Cha'), named(B, 'Con')],
      relationships: [
        link('biological_child', A, B),
        link('adopted_child', A, B)
      ]
    }
    expect(validateImportPayload(payload, t)).toBeNull()
  })

  test('shortens a long loop to its two ends', () => {
    const ids = Array.from(
      { length: 12 },
      (_, i) => `${(i + 16).toString(16)}111111-1111-4111-8111-111111111111`
    )
    const persons = ids.map((id, i) => named(id, `P${i}`))
    const relationships = ids.map((id, i) =>
      link('biological_child', id, ids[(i + 1) % ids.length])
    )
    expect(validateImportPayload({ persons, relationships }, t)).toContain(
      '"path":"P0 → P1 → P2 → P3 → … → P9 → P10 → P11 → P0"'
    )
  })

  test(`lists at most ${MAX_REPORTED_ISSUES} problems`, () => {
    const persons = []
    const relationships = []
    for (let i = 0; i < 15; i++) {
      const hex = (i + 16).toString(16).padStart(2, '0')
      const a = `${hex}111111-1111-4111-8111-111111111111`
      const b = `${hex}222222-2222-4222-8222-222222222222`
      persons.push(person(a), person(b))
      relationships.push(link('marriage', a, b), link('marriage', a, b))
    }
    const error = validateImportPayload({ persons, relationships }, t)
    expect(error?.split('\n')).toHaveLength(MAX_REPORTED_ISSUES + 1)
  })

  test('accepts a valid tree with a couple and their child', () => {
    const payload = {
      persons: [named(A, 'Cha'), named(B, 'Mẹ'), named(C, 'Con')],
      relationships: [
        link('marriage', A, B),
        link('biological_child', A, C),
        link('biological_child', B, C)
      ]
    }
    expect(validateImportPayload(payload, t)).toBeNull()
  })
})

describe('validateImportPayload person numbers and dates', () => {
  const check = (overrides: Record<string, unknown>) =>
    validateImportPayload(
      { persons: [person(A, overrides)], relationships: [] },
      t
    )

  test.each([
    [{ birth_month: 13 }, 'birth_month'],
    [{ birth_year: 1990, birth_month: 2, birth_day: 31 }, 'birth_day'],
    [{ birth_day: 32 }, 'birth_day'],
    [{ death_lunar_day: 31 }, 'death_lunar_day'],
    [{ death_lunar_month: 0 }, 'death_lunar_month'],
    [{ birth_year: 0 }, 'birth_year'],
    [{ birth_year: 10000 }, 'birth_year'],
    [{ birth_year: 3e9 }, 'birth_year'],
    [{ death_year: 0 }, 'death_year'],
    [{ death_lunar_year: 10000 }, 'death_lunar_year'],
    [{ generation: -1 }, 'generation'],
    [{ generation: 2147483648 }, 'generation'],
    [{ birth_order: -2 }, 'birth_order'],
    [{ birth_order: 3e9 }, 'birth_order'],
    [{ birth_year: 'abc' }, 'birth_year'],
    [{ death_year: 1990.5 }, 'death_year']
  ])('rejects %j', (overrides, field) => {
    const result = check(overrides)
    expect(result).toContain('invalidPersonDate')
    expect(result).toContain('Nguyễn Văn An')
    expect(result).toContain(field)
  })

  test('accepts valid and null values', () => {
    expect(
      check({
        birth_year: 2000,
        birth_month: 2,
        birth_day: 29,
        death_lunar_day: 30,
        generation: 0,
        birth_order: null
      })
    ).toBeNull()
  })
})

describe('custom event recurrence in backups', () => {
  const withRecurrence = (recurrence: unknown) =>
    withChange((p) => {
      ;(p.custom_events[0] as Record<string, unknown>).recurrence = recurrence
    }) as unknown as ImportPayload

  test('export → import keeps the recurrence', () => {
    const row = {
      id: E,
      name: 'Tảo mộ',
      content: null,
      event_date: '2020-01-19',
      location: null,
      created_by: A,
      recurrence: 'yearly_lunar' as const
    }
    const exported = JSON.parse(
      JSON.stringify({
        ...validPayload(),
        version: BACKUP_VERSION,
        custom_events: [toCustomEventExport(row)]
      })
    ) as ImportPayload
    expect(validateImportPayload(exported, t)).toBeNull()
    expect(buildRestorePayload(exported).custom_events).toEqual([
      {
        id: E,
        name: 'Tảo mộ',
        content: null,
        event_date: '2020-01-19',
        location: null,
        recurrence: 'yearly_lunar'
      }
    ])
  })

  test('exports rows without the column as none', () => {
    const exported = toCustomEventExport({
      id: E,
      name: 'Họp họ',
      content: null,
      event_date: '2026-02-01',
      location: null,
      created_by: null
    })
    expect(exported.recurrence).toBe('none')
  })

  test('older backups without recurrence restore as none', () => {
    const payload = buildRestorePayload(validPayload())
    expect(payload.custom_events[0].recurrence).toBe('none')
    expect(
      buildRestorePayload(withRecurrence('')).custom_events[0].recurrence
    ).toBe('none')
  })

  test('accepts the three values, empty and missing', () => {
    for (const value of ['none', 'yearly_solar', 'yearly_lunar', '', null]) {
      expect(validateImportPayload(withRecurrence(value), t)).toBeNull()
    }
  })

  test('rejects an unknown recurrence', () => {
    for (const value of ['monthly', 1, true]) {
      expect(validateImportPayload(withRecurrence(value), t)).toBe(
        'invalidEventRecurrence'
      )
    }
  })

  test('the old chunked restore leaves the column out while nothing repeats', () => {
    const once = buildRestorePayload(validPayload()).custom_events
    expect(legacyCustomEventRows(once)[0]).not.toHaveProperty('recurrence')
    const yearly = buildRestorePayload(
      withRecurrence('yearly_solar')
    ).custom_events
    expect(legacyCustomEventRows(yearly)[0]).toHaveProperty(
      'recurrence',
      'yearly_solar'
    )
  })
})

describe('burial place in backups', () => {
  test('export → import keeps the burial place', () => {
    const row = person(A, { burial_place: 'Nghĩa trang làng Đông Ngạc' })
    const exported = JSON.parse(
      JSON.stringify({
        ...validPayload(),
        version: BACKUP_VERSION,
        persons: [
          toPersonExport(row as ImportPayload['persons'][number]),
          person(B, { gender: 'female' })
        ]
      })
    ) as ImportPayload
    expect(exported.persons[0]).toHaveProperty('created_at')
    expect(validateImportPayload(exported, t)).toBeNull()
    const persons = buildRestorePayload(exported).persons
    expect(persons[0].burial_place).toBe('Nghĩa trang làng Đông Ngạc')
    expect(persons[1].burial_place).toBeNull()
  })

  test('exports rows of a database without the column as null', () => {
    const exported = toPersonExport(
      person(A) as ImportPayload['persons'][number]
    )
    expect(exported).toHaveProperty('burial_place', null)
  })

  test('older backups without the field restore it as null', () => {
    const payload = buildRestorePayload(validPayload())
    expect(payload.persons[0]).toHaveProperty('burial_place', null)
  })

  test('blank values become null', () => {
    const payload = buildRestorePayload({
      ...validPayload(),
      persons: [
        person(A, { burial_place: '   ' }),
        person(B, { burial_place: '  Đồi thông  ' })
      ] as ImportPayload['persons']
    })
    expect(payload.persons[0].burial_place).toBeNull()
    expect(payload.persons[1].burial_place).toBe('Đồi thông')
  })

  test('rejects a burial place that is not text or too long', () => {
    for (const value of [12, 'x'.repeat(2001)]) {
      const payload = {
        ...validPayload(),
        persons: [person(A, { burial_place: value }), person(B)]
      } as unknown as ImportPayload
      expect(validateImportPayload(payload, t)).toBe(
        `fieldTooLong:${JSON.stringify({ field: 'burial_place' })}`
      )
    }
  })

  test('the old chunked restore leaves the column out while no member has one', () => {
    const none = buildRestorePayload(validPayload()).persons
    expect(legacyPersonRows(none)[0]).not.toHaveProperty('burial_place')
    const some = buildRestorePayload({
      ...validPayload(),
      persons: [
        person(A, { burial_place: 'Quê nội' }),
        person(B)
      ] as ImportPayload['persons']
    }).persons
    expect(legacyPersonRows(some)[0]).toHaveProperty('burial_place', 'Quê nội')
  })
})

describe('text limits', () => {
  test('a note the form accepts (2000 characters) restores', () => {
    const payload = withChange((p) => {
      p.persons[0] = person(A, {
        note: 'x'.repeat(2000),
        full_name: 'n'.repeat(200)
      })
    })
    expect(validateImportPayload(payload, t)).toBeNull()
  })

  test('a note of 2001 characters is refused', () => {
    const payload = withChange((p) => {
      p.persons[0] = person(A, { note: 'x'.repeat(2001) })
    })
    expect(validateImportPayload(payload, t)).toContain('fieldTooLong')
  })
})
