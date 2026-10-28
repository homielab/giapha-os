// Text length limits shared by the member form, the importers and the backup
// validation, so every record the form can save also restores from a backup.
export const MAX_NAME = 200
export const MAX_NOTE = 2000
export const MAX_PRIVATE = 500

/** Translation key of the label of a field checked by `checkTextLength`. */
export type LimitedTextLabel =
  'fullName' | 'note' | 'eventName' | 'location' | 'details'

/**
 * A text is longer than the limit a backup is checked against. Thrown before
 * anything is saved, so every saved record still restores from a backup.
 */
export class TextTooLongError extends Error {
  readonly label: LimitedTextLabel
  readonly max: number

  constructor(label: LimitedTextLabel, max: number) {
    super(`${label} is longer than ${max} characters`)
    this.name = 'TextTooLongError'
    this.label = label
    this.max = max
  }
}

/** Throws `TextTooLongError` when `value` (as it will be saved) is over `max`. */
export function checkTextLength(
  label: LimitedTextLabel,
  value: string | null | undefined,
  max: number
): void {
  if (value != null && value.length > max)
    throw new TextTooLongError(label, max)
}

/** Backup fields (table -> field) and the limit each one is checked against. */
const PERSON_LIMITS: Record<string, number> = {
  full_name: MAX_NAME,
  other_names: MAX_NOTE,
  avatar_url: MAX_NOTE,
  note: MAX_NOTE,
  burial_place: MAX_NOTE
}
const PRIVATE_LIMITS: Record<string, number> = {
  phone_number: MAX_PRIVATE,
  occupation: MAX_PRIVATE,
  current_residence: MAX_PRIVATE
}
const EVENT_LIMITS: Record<string, number> = {
  name: MAX_NAME,
  content: MAX_NOTE,
  location: MAX_NOTE
}
const RELATIONSHIP_LIMITS: Record<string, number> = { note: MAX_NOTE }

function clipRows(rows: unknown, limits: Record<string, number>): number {
  if (!Array.isArray(rows)) return 0
  let clipped = 0
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    for (const [field, max] of Object.entries(limits)) {
      const value = record[field]
      if (typeof value === 'string' && value.length > max) {
        record[field] = value.slice(0, max)
        clipped++
      }
    }
  }
  return clipped
}

/**
 * Cuts over-long text of an imported file (GEDCOM, CSV) at the limits, in
 * place, and returns how many values were cut. The file is still restored;
 * only the excess text is lost.
 */
export function clipImportedText(payload: {
  persons?: unknown
  relationships?: unknown
  person_details_private?: unknown
  custom_events?: unknown
}): number {
  return (
    clipRows(payload.persons, PERSON_LIMITS) +
    clipRows(payload.relationships, RELATIONSHIP_LIMITS) +
    clipRows(payload.person_details_private, PRIVATE_LIMITS) +
    clipRows(payload.custom_events, EVENT_LIMITS)
  )
}
