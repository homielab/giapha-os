import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { toRecurrence, type CustomEventRecurrence } from '@/utils/eventHelpers'
import { MAX_NAME, MAX_NOTE, MAX_PRIVATE } from '@/utils/limits'
import { isValidSolarDate } from '@/utils/lunarCalendar'
import {
  findRelationshipIssues,
  type RelationshipLink
} from '@/utils/relationshipValidation'
import { isMissingDatabaseFunction } from '@/utils/supabase/missingFunction'
import { isUuid } from '@/utils/uuid'

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
  /** Missing in backups made before burial places (= null). */
  burial_place?: string | null
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
  /** Missing in backups made before events could repeat (= 'none'). */
  recurrence?: CustomEventRecurrence | null
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
  /** Backup format version of the file; missing in the oldest files (= 1). */
  version?: number
  persons: PersonExport[]
  relationships: RelationshipExport[]
  person_details_private?: PersonDetailsPrivateExport[]
  custom_events?: CustomEventExport[]
}

export type SanitizedPerson = Omit<
  PersonExport,
  'created_at' | 'updated_at' | 'burial_place'
> & { burial_place: string | null }
export type SanitizedRelationship = Omit<
  RelationshipExport,
  'id' | 'updated_at'
>
export type SanitizedCustomEvent = Omit<
  CustomEventExport,
  'created_by' | 'recurrence'
> & { recurrence: CustomEventRecurrence }

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

/**
 * Version written into JSON backups. v2 added birth order and generation, v3
 * lunar death dates, private details, relationship notes and custom events, v4
 * the recurrence of custom events, v5 the burial place. Raise it when the backup format changes;
 * files with a higher version are refused.
 */
export const BACKUP_VERSION = 5

// Keep in sync with private.restore_backup in docs/migrations.
export const MAX_PERSONS = 10000
export const MAX_RELATIONSHIPS = 30000
export const MAX_PRIVATE_DETAILS = 10000
export const MAX_CUSTOM_EVENTS = 10000
/** Relationship problems listed when a backup is refused. */
export const MAX_REPORTED_ISSUES = 10

function isShortText(value: unknown, maxLength: number) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.length <= maxLength)
  )
}

const INTEGER_FIELDS = [
  'birth_year',
  'birth_month',
  'birth_day',
  'death_year',
  'death_month',
  'death_day',
  'death_lunar_year',
  'death_lunar_month',
  'death_lunar_day',
  'generation',
  'birth_order'
] as const

const MAX_INT = 2147483647

/** Name of the first date/number field of a person record that is invalid. */
function findInvalidNumberField(row: Record<string, unknown>) {
  for (const field of INTEGER_FIELDS) {
    const value = row[field]
    if (value === null || value === undefined) continue
    if (typeof value !== 'number' || !Number.isInteger(value)) return field
    if (
      (field === 'generation' || field === 'birth_order') &&
      (value < 0 || value > MAX_INT)
    )
      return field
    if (field.endsWith('_year') && (value < 1 || value > 9999)) return field
    if (field.endsWith('_month') && (value < 1 || value > 12)) return field
    if (field.endsWith('_day') && (value < 1 || value > 31)) return field
    if (field === 'death_lunar_day' && value > 30) return field
  }
  for (const prefix of ['birth', 'death']) {
    const year = row[`${prefix}_year`]
    const month = row[`${prefix}_month`]
    const day = row[`${prefix}_day`]
    if (
      typeof year === 'number' &&
      typeof month === 'number' &&
      typeof day === 'number' &&
      !isValidSolarDate(year, month, day)
    )
      return `${prefix}_day`
  }
  return null
}

/** The events table stores a calendar date as a `YYYY-MM-DD` string. */
function isValidEventDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const [year, month, day] = value.split('-').map(Number)
  return isValidSolarDate(year, month, day)
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
  const version = payload.version ?? 1
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return t('invalidBackupVersion')
  if (version > BACKUP_VERSION)
    return t('backupFromNewerVersion', {
      version,
      supported: BACKUP_VERSION
    })
  if (persons.length === 0) return t('emptyBackup')
  if (persons.length > MAX_PERSONS)
    return t('tooManyPersons', { count: MAX_PERSONS })
  if (relationships.length > MAX_RELATIONSHIPS)
    return t('tooManyRelationships', { count: MAX_RELATIONSHIPS })

  const personNames = new Map<string, string>()
  for (const person of persons) {
    if (!person || typeof person !== 'object') return t('invalidPersonRecord')
    const row = person as Record<string, unknown>
    if (typeof row.id !== 'string' || !isUuid(row.id))
      return t('invalidPersonId')
    if (personNames.has(row.id)) return t('duplicatePersonId')
    if (
      typeof row.full_name !== 'string' ||
      row.full_name.trim().length === 0 ||
      row.full_name.length > MAX_NAME
    ) {
      return t('invalidPersonName')
    }
    personNames.set(row.id, row.full_name.trim())
    if (!['male', 'female', 'other'].includes(String(row.gender)))
      return t('invalidGender')
    for (const field of ['other_names', 'avatar_url', 'note', 'burial_place']) {
      if (!isShortText(row[field], MAX_NOTE))
        return t('fieldTooLong', { field })
    }
    const badField = findInvalidNumberField(row)
    if (badField)
      return t('invalidPersonDate', {
        name: row.full_name.trim(),
        id: row.id,
        field: badField
      })
  }

  const childLinks = new Set<string>()
  for (const relationship of relationships) {
    if (!relationship || typeof relationship !== 'object')
      return t('invalidRelationship')
    const row = relationship as Record<string, unknown>
    if (
      typeof row.person_a !== 'string' ||
      !personNames.has(row.person_a) ||
      typeof row.person_b !== 'string' ||
      !personNames.has(row.person_b) ||
      row.person_a === row.person_b ||
      !['marriage', 'biological_child', 'adopted_child'].includes(
        String(row.type)
      )
    )
      return t('invalidRelationshipData')
    if (!isShortText(row.note, MAX_NOTE)) return t('relationshipNoteTooLong')
    if (row.type !== 'marriage') {
      const key = `${row.type}|${row.person_a}|${row.person_b}`
      if (childLinks.has(key))
        return t('duplicateRelationship', {
          a: personNames.get(row.person_a) ?? row.person_a,
          b: personNames.get(row.person_b) ?? row.person_b
        })
      childLinks.add(key)
    }
  }

  const privateDetails = payload.person_details_private
  if (privateDetails !== undefined) {
    if (
      !Array.isArray(privateDetails) ||
      privateDetails.length > MAX_PRIVATE_DETAILS
    ) {
      return t('privateDetailsLimit')
    }
    const detailPersonIds = new Set<string>()
    for (const detail of privateDetails) {
      if (!detail || typeof detail !== 'object')
        return t('invalidPrivateDetails')
      const row = detail as Record<string, unknown>
      if (typeof row.person_id !== 'string' || !personNames.has(row.person_id))
        return t('invalidPrivateDetailsPerson')
      if (detailPersonIds.has(row.person_id))
        return t('duplicatePrivateDetail', { id: row.person_id })
      detailPersonIds.add(row.person_id)
      for (const field of ['phone_number', 'occupation', 'current_residence']) {
        if (!isShortText(row[field], MAX_PRIVATE))
          return t('fieldTooLong', { field })
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
    const eventIds = new Set<string>()
    for (const event of customEvents) {
      if (!event || typeof event !== 'object') return t('invalidEvent')
      const row = event as Record<string, unknown>
      if (typeof row.id !== 'string' || !isUuid(row.id))
        return t('invalidEventId')
      if (eventIds.has(row.id)) return t('duplicateEventId', { id: row.id })
      eventIds.add(row.id)
      if (
        typeof row.name !== 'string' ||
        row.name.trim().length === 0 ||
        row.name.length > MAX_NAME
      )
        return t('invalidEventName')
      if (!isValidEventDate(row.event_date))
        return t('invalidEventDate', { name: row.name.trim(), id: row.id })
      for (const field of ['content', 'location']) {
        if (!isShortText(row[field], MAX_NOTE))
          return t('fieldTooLong', { field })
      }
      if (
        row.recurrence !== undefined &&
        row.recurrence !== null &&
        row.recurrence !== '' &&
        toRecurrence(row.recurrence) !== row.recurrence
      )
        return t('invalidEventRecurrence')
    }
  }

  return checkRelationshipIssues(
    persons as PersonExport[],
    relationships as RelationshipLink[],
    t
  )
}

// Loops between parents and children and marriages stored twice would make
// the tree views loop or show a couple twice, so refuse them before restoring.
function checkRelationshipIssues(
  persons: PersonExport[],
  relationships: RelationshipLink[],
  t: Translator
): string | null {
  const issues = findRelationshipIssues(relationships, MAX_REPORTED_ISSUES)
  if (issues.length === 0) return null

  const names = new Map(persons.map((p) => [p.id, p.full_name]))
  const name = (id: string) => names.get(id) ?? id
  // A loop through many generations is shortened to its two ends.
  const loop = (path: string[]) =>
    (path.length > 9
      ? [...path.slice(0, 4).map(name), '…', ...path.slice(-4).map(name)]
      : path.map(name)
    ).join(' → ')
  const lines = issues.map((issue) =>
    issue.code === 'cycle'
      ? t('backupRelationshipCycle', { path: loop(issue.path) })
      : t('backupDuplicateSpouse', {
          a: name(issue.pair[0]),
          b: name(issue.pair[1])
        })
  )
  return [
    t('backupRelationshipIssues', { max: MAX_REPORTED_ISSUES }),
    ...lines.map((line) => `• ${line}`)
  ].join('\n')
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
    note: p.note ?? null,
    burial_place: p.burial_place?.trim() || null
  }
}

/**
 * The exported fields of a persons row (read with '*', so a database without
 * the burial_place column yet still exports): no burial place = null.
 */
export function toPersonExport(p: PersonExport): PersonExport {
  return {
    ...sanitizePerson(p),
    created_at: p.created_at,
    updated_at: p.updated_at
  }
}

/**
 * Person rows for the old chunked restore. A database that old may not have
 * the burial_place column: leave it out while no member has one.
 */
export function legacyPersonRows(persons: SanitizedPerson[]): object[] {
  if (persons.some((p) => p.burial_place !== null)) return persons
  return persons.map((person) => {
    const row: Partial<SanitizedPerson> = { ...person }
    delete row.burial_place
    return row
  })
}

export function sanitizeRelationship(
  r: RelationshipExport
): SanitizedRelationship {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
    note: r.note ?? null,
    // Kept so a restore keeps the spouse order; a missing or invalid value
    // is left out and the database uses the restore time.
    ...(typeof r.created_at === 'string' && !isNaN(Date.parse(r.created_at))
      ? { created_at: r.created_at }
      : {})
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
    location: e.location ?? null,
    recurrence: toRecurrence(e.recurrence)
  }
}

/** The exported fields of a custom_events row; no recurrence = 'none'. */
export function toCustomEventExport(e: CustomEventExport): CustomEventExport {
  return {
    id: e.id,
    name: e.name,
    content: e.content ?? null,
    event_date: e.event_date,
    location: e.location ?? null,
    created_by: e.created_by ?? null,
    recurrence: toRecurrence(e.recurrence)
  }
}

/**
 * Custom event rows for the old chunked restore. A database that old may not
 * have the recurrence column: leave it out while no event repeats (inserts
 * then use the column default).
 */
export function legacyCustomEventRows(
  events: SanitizedCustomEvent[]
): object[] {
  if (events.some((e) => e.recurrence !== 'none')) return events
  return events.map((event) => {
    const row: Partial<SanitizedCustomEvent> = { ...event }
    delete row.recurrence
    return row
  })
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
  return isMissingDatabaseFunction(error)
}
