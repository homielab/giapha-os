import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'

/**
 * Payload shape cho file backup JSON.
 * Các field DB-managed (created_at, updated_at) được giữ để tham khảo
 * nhưng sẽ bị loại bỏ khi import lại.
 */
export interface PersonExport {
  id: string
  full_name: string
  gender: 'male' | 'female' | 'other'
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  death_year: number | null
  death_month: number | null
  death_day: number | null
  death_lunar_year: number | null
  death_lunar_month: number | null
  death_lunar_day: number | null
  is_deceased: boolean
  is_in_law: boolean
  birth_order: number | null
  generation: number | null
  other_names: string | null
  avatar_url: string | null
  note: string | null
  // DB-managed fields (kept in export for traceability, stripped on import)
  created_at?: string
  updated_at?: string
}

export interface RelationshipExport {
  id?: string
  type: string
  person_a: string
  person_b: string
  note?: string | null
  created_at?: string
  updated_at?: string
}

export interface PersonDetailsPrivateExport {
  person_id: string
  phone_number: string | null
  occupation: string | null
  current_residence: string | null
}

export interface CustomEventExport {
  id: string
  name: string
  content: string | null
  event_date: string
  location: string | null
  created_by: string | null
}

export interface BackupPayload {
  version: number
  timestamp: string
  persons: PersonExport[]
  relationships: RelationshipExport[]
  person_details_private?: PersonDetailsPrivateExport[]
  custom_events?: CustomEventExport[]
}

export interface ImportPayload {
  persons: PersonExport[]
  relationships: RelationshipExport[]
  person_details_private?: PersonDetailsPrivateExport[]
  custom_events?: CustomEventExport[]
}

export type SanitizedPerson = Omit<PersonExport, 'created_at' | 'updated_at'>
export type SanitizedRelationship = Omit<
  RelationshipExport,
  'id' | 'created_at' | 'updated_at'
>
export type SanitizedCustomEvent = Omit<CustomEventExport, 'created_by'>

export interface RestoreCounts {
  persons: number
  relationships: number
  person_details_private: number
  custom_events: number
}

/**
 * Body of the `restore_backup(payload jsonb)` database function. `version`
 * is the version of this contract (not of the backup file), `counts` lets the
 * database reject a payload that lost rows on the way.
 */
export interface RestorePayload {
  version: typeof RESTORE_PAYLOAD_VERSION
  counts: RestoreCounts
  persons: SanitizedPerson[]
  relationships: SanitizedRelationship[]
  person_details_private: PersonDetailsPrivateExport[]
  custom_events: SanitizedCustomEvent[]
}

export const RESTORE_PAYLOAD_VERSION = 1

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// Keep in sync with private.restore_backup in docs/migrations.
export const MAX_PERSONS = 10000
export const MAX_RELATIONSHIPS = 30000
export const MAX_PRIVATE_DETAILS = 10000
export const MAX_CUSTOM_EVENTS = 10000

function isShortText(value: unknown, maxLength: number) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.length <= maxLength)
  )
}

export type Translator = (
  key: TranslationKey,
  values?: TranslationValues
) => string

/** Returns a translated error message, or null when the payload is valid. */
export function validateImportPayload(
  input: unknown,
  t: Translator
): string | null {
  if (!input || typeof input !== 'object') return t('invalidData')
  const payload = input as Record<string, unknown>
  const persons = payload.persons
  const relationships = payload.relationships

  if (!Array.isArray(persons) || !Array.isArray(relationships)) {
    return t('invalidDataStructure')
  }
  if (persons.length === 0) return t('emptyBackup')
  if (persons.length > MAX_PERSONS)
    return t('tooManyPersons', { count: MAX_PERSONS })
  if (relationships.length > MAX_RELATIONSHIPS)
    return t('tooManyRelationships', { count: MAX_RELATIONSHIPS })

  const personIds = new Set<string>()
  for (const person of persons) {
    if (!person || typeof person !== 'object') return t('invalidPersonRecord')
    const row = person as Record<string, unknown>
    if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id))
      return t('invalidPersonId')
    if (personIds.has(row.id)) return t('duplicatePersonId')
    personIds.add(row.id)
    if (
      typeof row.full_name !== 'string' ||
      row.full_name.trim().length === 0 ||
      row.full_name.length > 200
    ) {
      return t('invalidPersonName')
    }
    if (!['male', 'female', 'other'].includes(String(row.gender)))
      return t('invalidGender')
    for (const field of ['other_names', 'avatar_url', 'note']) {
      if (!isShortText(row[field], 2000)) return t('fieldTooLong', { field })
    }
  }

  for (const relationship of relationships) {
    if (!relationship || typeof relationship !== 'object')
      return t('invalidRelationship')
    const row = relationship as Record<string, unknown>
    if (
      typeof row.person_a !== 'string' ||
      !personIds.has(row.person_a) ||
      typeof row.person_b !== 'string' ||
      !personIds.has(row.person_b) ||
      row.person_a === row.person_b ||
      !['marriage', 'biological_child', 'adopted_child'].includes(
        String(row.type)
      )
    )
      return t('invalidRelationshipData')
    if (!isShortText(row.note, 2000)) return t('relationshipNoteTooLong')
  }

  const privateDetails = payload.person_details_private
  if (privateDetails !== undefined) {
    if (
      !Array.isArray(privateDetails) ||
      privateDetails.length > MAX_PRIVATE_DETAILS
    ) {
      return t('privateDetailsLimit')
    }
    for (const detail of privateDetails) {
      if (!detail || typeof detail !== 'object')
        return t('invalidPrivateDetails')
      const row = detail as Record<string, unknown>
      if (typeof row.person_id !== 'string' || !personIds.has(row.person_id))
        return t('invalidPrivateDetailsPerson')
      for (const field of ['phone_number', 'occupation', 'current_residence']) {
        if (!isShortText(row[field], 500)) return t('fieldTooLong', { field })
      }
    }
  }

  const customEvents = payload.custom_events
  if (customEvents !== undefined) {
    if (
      !Array.isArray(customEvents) ||
      customEvents.length > MAX_CUSTOM_EVENTS
    ) {
      return t('eventsLimit')
    }
    for (const event of customEvents) {
      if (!event || typeof event !== 'object') return t('invalidEvent')
      const row = event as Record<string, unknown>
      if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id))
        return t('invalidEventId')
      if (
        typeof row.name !== 'string' ||
        row.name.trim().length === 0 ||
        row.name.length > 200
      )
        return t('invalidEventName')
      for (const field of ['content', 'location']) {
        if (!isShortText(row[field], 2000)) return t('fieldTooLong', { field })
      }
    }
  }
  return null
}

// Các field được phép insert vào bảng persons (loại bỏ created_at/updated_at)
export function sanitizePerson(p: PersonExport): SanitizedPerson {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    death_lunar_year: p.death_lunar_year ?? null,
    death_lunar_month: p.death_lunar_month ?? null,
    death_lunar_day: p.death_lunar_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null
  }
}

export function sanitizeRelationship(
  r: RelationshipExport
): SanitizedRelationship {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
    note: r.note ?? null
  }
}

export function sanitizePrivateDetails(
  d: PersonDetailsPrivateExport
): PersonDetailsPrivateExport {
  return {
    person_id: d.person_id,
    phone_number: d.phone_number ?? null,
    occupation: d.occupation ?? null,
    current_residence: d.current_residence ?? null
  }
}

export function sanitizeCustomEvent(
  e: CustomEventExport
): SanitizedCustomEvent {
  return {
    id: e.id,
    name: e.name,
    content: e.content ?? null,
    event_date: e.event_date,
    location: e.location ?? null
  }
}

/** Builds the `restore_backup` payload from an already validated import. */
export function buildRestorePayload(input: ImportPayload): RestorePayload {
  const persons = input.persons.map(sanitizePerson)
  const relationships = input.relationships.map(sanitizeRelationship)
  const privateDetails = (input.person_details_private ?? []).map(
    sanitizePrivateDetails
  )
  const customEvents = (input.custom_events ?? []).map(sanitizeCustomEvent)

  return {
    version: RESTORE_PAYLOAD_VERSION,
    counts: {
      persons: persons.length,
      relationships: relationships.length,
      person_details_private: privateDetails.length,
      custom_events: customEvents.length
    },
    persons,
    relationships,
    person_details_private: privateDetails,
    custom_events: customEvents
  }
}

/**
 * True when the database does not have `restore_backup` yet (migration not
 * run): PostgREST answers PGRST202, Postgres itself 42883.
 */
export function isMissingRestoreFunction(
  error: { code?: string | null; message?: string | null } | null
) {
  if (!error) return false
  return error.code === 'PGRST202' || error.code === '42883'
}
