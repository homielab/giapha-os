import type { TranslationKey } from '@/lib/i18n/messages'

export type RelationshipValidationCode =
  'selfLink' | 'duplicateSpouse' | 'cycle' | 'childOlderThanParent'

/** The birth date fields a check needs; month and day may be unknown. */
export interface DatedPerson {
  id: string
  birth_year: number | null
  birth_month?: number | null
  birth_day?: number | null
}

/** A relationship row: for child types `person_a` is the parent. */
export interface RelationshipLink {
  person_a: string
  person_b: string
  type: string
}

const PARENT_CHILD_TYPES = new Set(['biological_child', 'adopted_child'])

export function isParentChildType(type: string) {
  return PARENT_CHILD_TYPES.has(type)
}

/**
 * Compares two birth dates with as much precision as both have: the year,
 * then the month when both know it, then the day when both know it.
 * Negative when `a` was born before `b`, positive when after, 0 when they
 * cannot be told apart, null when a birth year is missing.
 */
export function compareBirthDates(
  a: DatedPerson,
  b: DatedPerson
): number | null {
  if (a.birth_year == null || b.birth_year == null) return null
  if (a.birth_year !== b.birth_year) return a.birth_year - b.birth_year
  if (a.birth_month == null || b.birth_month == null) return 0
  if (a.birth_month !== b.birth_month) return a.birth_month - b.birth_month
  if (a.birth_day == null || b.birth_day == null) return 0
  return a.birth_day - b.birth_day
}

/** True when `descendantId` is reachable from `ancestorId` via parent links. */
export function isDescendant(
  relationships: RelationshipLink[],
  ancestorId: string,
  descendantId: string
) {
  const children = new Map<string, string[]>()
  for (const r of relationships) {
    if (!isParentChildType(r.type)) continue
    const list = children.get(r.person_a)
    if (list) list.push(r.person_b)
    else children.set(r.person_a, [r.person_b])
  }

  const seen = new Set<string>([ancestorId])
  const queue = [ancestorId]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const child of children.get(current) ?? []) {
      if (child === descendantId) return true
      if (!seen.has(child)) {
        seen.add(child)
        queue.push(child)
      }
    }
  }
  return false
}

/**
 * Checks a relationship before it is saved. `persons` needs at least the two
 * people of the candidate (a missing one skips the date check);
 * `relationships` needs the existing marriages between them and the parent
 * links below the candidate child. Returns the first problem, or null.
 */
export function validateRelationship(
  persons: DatedPerson[],
  relationships: RelationshipLink[],
  candidate: RelationshipLink
): RelationshipValidationCode | null {
  const { person_a: a, person_b: b, type } = candidate
  if (a === b) return 'selfLink'

  if (type === 'marriage') {
    const married = relationships.some(
      (r) =>
        r.type === 'marriage' &&
        ((r.person_a === a && r.person_b === b) ||
          (r.person_a === b && r.person_b === a))
    )
    return married ? 'duplicateSpouse' : null
  }

  if (!isParentChildType(type)) return null

  // a becomes the parent of b: a loop when a already descends from b.
  if (isDescendant(relationships, b, a)) return 'cycle'

  const parent = persons.find((p) => p.id === a)
  const child = persons.find((p) => p.id === b)
  if (parent && child) {
    const order = compareBirthDates(child, parent)
    if (order != null && order < 0) return 'childOlderThanParent'
  }
  return null
}

/**
 * Checks children about to be created under `parents` (all of them parents of
 * every child). Returns the index of the first child that fails, or null.
 */
export function validateNewChildren(
  parents: DatedPerson[],
  children: { birthYear: number | null }[]
): { index: number; code: RelationshipValidationCode } | null {
  for (let index = 0; index < children.length; index++) {
    const child: DatedPerson = {
      id: `new-child-${index}`,
      birth_year: children[index].birthYear
    }
    for (const parent of parents) {
      const code = validateRelationship([parent, child], [], {
        person_a: parent.id,
        person_b: child.id,
        type: 'biological_child'
      })
      if (code) return { index, code }
    }
  }
  return null
}

const ERROR_KEYS: Record<RelationshipValidationCode, TranslationKey> = {
  selfLink: 'relationshipSelfLink',
  duplicateSpouse: 'relationshipDuplicateSpouse',
  cycle: 'relationshipCycle',
  childOlderThanParent: 'relationshipChildOlderThanParent'
}

/** Translation key of the message shown for a validation code. */
export function relationshipErrorKey(
  code: RelationshipValidationCode
): TranslationKey {
  return ERROR_KEYS[code]
}

/** Thrown by the relationship mutations when a check fails; nothing is saved. */
export class RelationshipValidationError extends Error {
  readonly code: RelationshipValidationCode
  /** Name of the new person the error is about, when there are several. */
  readonly subject?: string

  constructor(code: RelationshipValidationCode, subject?: string) {
    super(code)
    this.name = 'RelationshipValidationError'
    this.code = code
    this.subject = subject
  }
}
