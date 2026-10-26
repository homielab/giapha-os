import { Person, RelationshipType } from '@/types'
import { PersonNotUpdatedError } from '@/utils/writeErrors'

export type RelationshipDirection = 'parent' | 'child' | 'spouse'

export interface NewRelationshipInput {
  personId: string
  selectedTargetId: string
  direction: RelationshipDirection
  relType: RelationshipType
  note: string
  person: Person
  /** Save even when the link only looks wrong (RelationshipWarningError). */
  acceptWarnings?: boolean
}

export interface AddRelationshipResult {
  // Set when the relationship was saved but filling in the target's
  // generation / in-law flag failed; the caller shows it as a warning.
  // A PersonNotUpdatedError means no row changed (the person is gone or the
  // user may not edit it); the caller words it in the user's language.
  targetUpdateError: string | PersonNotUpdatedError | null
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message !== '') return message
  }
  return String(err)
}
