import type { TranslationKey } from '@/lib/i18n/messages'

export type RelationshipValidationCode =
  | 'selfLink'
  | 'duplicateSpouse'
  | 'duplicateParent'
  | 'tooManyParents'
  | 'cycle'
  | 'childOlderThanParent'
  | 'motherDiedBeforeBirth'
  | 'invalidBirthYear'
  | 'birthYearInFuture'
  | 'invalidBirthOrder'

/**
 * The date fields a check needs; month and day may be unknown. `gender` and
 * the death date are only read by the parent death checks.
 */
export interface DatedPerson {
  id: string
  birth_year: number | null
  birth_month?: number | null
  birth_day?: number | null
  gender?: string | null
  death_year?: number | null
  death_month?: number | null
  death_day?: number | null
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

export type ParentDeathIssue =
  'motherDiedBeforeBirth' | 'fatherDiedLongBeforeBirth'

/** Months a father may be dead before the birth of a child (pregnancy). */
const FATHER_DEATH_GRACE_MONTHS = 10

/**
 * Checks a parent's death against the child's birth. A mother who died
 * before the birth is an error; a father who died more than ten months before
 * it (more than one year when either date lacks a month or day) is a
 * warning. Needs the parent's gender; unknown dates never raise an issue.
 * The caller skips adopted children.
 */
export function checkParentDeath(
  parent: DatedPerson,
  child: DatedPerson
): ParentDeathIssue | null {
  const deathYear = parent.death_year
  const birthYear = child.birth_year
  if (deathYear == null || birthYear == null) return null

  if (parent.gender === 'female') {
    const order = compareBirthDates(
      {
        id: parent.id,
        birth_year: deathYear,
        birth_month: parent.death_month,
        birth_day: parent.death_day
      },
      child
    )
    return order != null && order < 0 ? 'motherDiedBeforeBirth' : null
  }

  if (parent.gender !== 'male') return null

  const { death_month: dm, death_day: dd } = parent
  const { birth_month: bm, birth_day: bd } = child
  if (dm == null || dd == null || bm == null || bd == null) {
    return birthYear - deathYear > 1 ? 'fatherDiedLongBeforeBirth' : null
  }

  const months = deathYear * 12 + (dm - 1) + FATHER_DEATH_GRACE_MONTHS
  const cutoff = [Math.floor(months / 12), (months % 12) + 1, dd]
  const born = [birthYear, bm, bd]
  for (let i = 0; i < 3; i++) {
    if (born[i] !== cutoff[i])
      return born[i] > cutoff[i] ? 'fatherDiedLongBeforeBirth' : null
  }
  return null
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
 * True when `parentId` cannot become one more biological parent of `childId`:
 * the child already has two, or the one it has is known to be of the same
 * gender. `relationships` needs the child's existing parent links; a parent
 * missing from `persons` or without a male/female gender is not compared.
 */
function hasTooManyParents(
  persons: DatedPerson[],
  relationships: RelationshipLink[],
  parentId: string,
  childId: string
) {
  const others = new Set<string>()
  for (const r of relationships) {
    if (
      r.type === 'biological_child' &&
      r.person_b === childId &&
      r.person_a !== parentId
    )
      others.add(r.person_a)
  }
  if (others.size >= 2) return true
  if (others.size === 0) return false

  const gender = (id: string) => persons.find((p) => p.id === id)?.gender
  const existing = gender([...others][0])
  return (
    (existing === 'male' || existing === 'female') &&
    existing === gender(parentId)
  )
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

  // The same pair can hold only one parent link, whatever its type.
  if (
    relationships.some(
      (r) => isParentChildType(r.type) && r.person_a === a && r.person_b === b
    )
  )
    return 'duplicateParent'

  if (
    type === 'biological_child' &&
    hasTooManyParents(persons, relationships, a, b)
  )
    return 'tooManyParents'

  // a becomes the parent of b: a loop when a already descends from b.
  if (isDescendant(relationships, b, a)) return 'cycle'

  const parent = persons.find((p) => p.id === a)
  const child = persons.find((p) => p.id === b)
  if (parent && child) {
    const order = compareBirthDates(child, parent)
    if (order != null && order < 0) return 'childOlderThanParent'
    if (
      type === 'biological_child' &&
      checkParentDeath(parent, child) === 'motherDiedBeforeBirth'
    )
      return 'motherDiedBeforeBirth'
  }
  return null
}

export type RelationshipWarningCode =
  'fatherDiedLongBeforeBirth' | 'marriageWithRelative' | 'marriageAfterDeath'

export type MarriageIssue =
  | { code: 'marriageWithRelative'; relation: 'parent' | 'sibling' }
  | { code: 'marriageAfterDeath'; died: string; born: string }

/**
 * Problems of a marriage between `a` and `b` that a family tree should not
 * hold: one is a parent of the other (any parent link), they share a
 * biological parent, or one died before the other was born (dates compared as
 * far as both are known). Distant relatives are not checked. `relationships`
 * needs the parent links of both people.
 */
export function findMarriageIssue(
  persons: DatedPerson[],
  relationships: RelationshipLink[],
  a: string,
  b: string
): MarriageIssue | null {
  const isParentOf = (p: string, c: string) =>
    relationships.some(
      (r) => isParentChildType(r.type) && r.person_a === p && r.person_b === c
    )
  if (isParentOf(a, b) || isParentOf(b, a))
    return { code: 'marriageWithRelative', relation: 'parent' }

  const parentsOf = (c: string) =>
    relationships
      .filter((r) => r.type === 'biological_child' && r.person_b === c)
      .map((r) => r.person_a)
  const parentsOfB = new Set(parentsOf(b))
  if (parentsOf(a).some((p) => parentsOfB.has(p)))
    return { code: 'marriageWithRelative', relation: 'sibling' }

  const pa = persons.find((p) => p.id === a)
  const pb = persons.find((p) => p.id === b)
  if (!pa || !pb) return null
  const diedBeforeBorn = (dead: DatedPerson, other: DatedPerson) => {
    if (dead.death_year == null) return false
    const order = compareBirthDates(
      {
        id: dead.id,
        birth_year: dead.death_year,
        birth_month: dead.death_month,
        birth_day: dead.death_day
      },
      other
    )
    return order != null && order < 0
  }
  if (diedBeforeBorn(pa, pb))
    return { code: 'marriageAfterDeath', died: a, born: b }
  if (diedBeforeBorn(pb, pa))
    return { code: 'marriageAfterDeath', died: b, born: a }
  return null
}

/**
 * Problems of a candidate relationship that the user may accept: a father who
 * died long before the child's birth, or a marriage `findMarriageIssue`
 * reports. Returns the issue, or null. Adopted children are never checked.
 */
export function relationshipWarning(
  persons: DatedPerson[],
  candidate: RelationshipLink,
  relationships: RelationshipLink[] = []
): RelationshipWarningCode | null {
  if (candidate.type === 'marriage')
    return (
      findMarriageIssue(
        persons,
        relationships,
        candidate.person_a,
        candidate.person_b
      )?.code ?? null
    )
  if (candidate.type !== 'biological_child') return null
  const parent = persons.find((p) => p.id === candidate.person_a)
  const child = persons.find((p) => p.id === candidate.person_b)
  if (!parent || !child) return null
  return checkParentDeath(parent, child) === 'fatherDiedLongBeforeBirth'
    ? 'fatherDiedLongBeforeBirth'
    : null
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
    const links: RelationshipLink[] = []
    for (const parent of parents) {
      const link = {
        person_a: parent.id,
        person_b: child.id,
        type: 'biological_child'
      }
      const code = validateRelationship([...parents, child], links, link)
      if (code) return { index, code }
      links.push(link)
    }
  }
  return null
}

/** A relative of the edited member, with the name shown in messages. */
export interface NamedDatedPerson extends DatedPerson {
  full_name: string
}

export interface BirthDateConflict {
  /** Whether the conflicting relative is a parent or a child of `person`. */
  relation: 'parent' | 'child'
  name: string
}

/**
 * Checks a member's (new) birth date against their parents and children with
 * the same rule as a new parent link. Unknown dates never conflict. Returns
 * the first conflict, parents first, or null.
 */
export function findBirthDateConflict(
  person: DatedPerson,
  parents: NamedDatedPerson[],
  children: NamedDatedPerson[]
): BirthDateConflict | null {
  const check = (parent: DatedPerson, child: DatedPerson) =>
    validateRelationship([parent, child], [], {
      person_a: parent.id,
      person_b: child.id,
      type: 'biological_child'
    }) === 'childOlderThanParent'

  for (const parent of parents) {
    if (check(parent, person))
      return { relation: 'parent', name: parent.full_name }
  }
  for (const child of children) {
    if (check(person, child))
      return { relation: 'child', name: child.full_name }
  }
  return null
}

export type RelationshipIssue =
  | { code: 'cycle'; path: string[] }
  | { code: 'duplicateSpouse'; pair: [string, string] }

/**
 * Finds parent–child loops (each reported once, as the ids along the loop,
 * first id repeated at the end) and marriages stored more than once in either
 * order. Stops after `limit` issues.
 */
export function findRelationshipIssues(
  relationships: RelationshipLink[],
  limit = 10
): RelationshipIssue[] {
  const issues: RelationshipIssue[] = []

  const marriages = new Set<string>()
  for (const r of relationships) {
    if (r.type !== 'marriage') continue
    const pair: [string, string] =
      r.person_a < r.person_b
        ? [r.person_a, r.person_b]
        : [r.person_b, r.person_a]
    const key = pair.join('|')
    if (marriages.has(key)) {
      issues.push({ code: 'duplicateSpouse', pair })
      if (issues.length >= limit) return issues
    } else {
      marriages.add(key)
    }
  }

  const children = new Map<string, string[]>()
  for (const r of relationships) {
    if (!isParentChildType(r.type)) continue
    const list = children.get(r.person_a)
    if (list) list.push(r.person_b)
    else children.set(r.person_a, [r.person_b])
  }

  // Iterative DFS: 1 = on the current path, 2 = finished.
  const state = new Map<string, 1 | 2>()
  for (const root of children.keys()) {
    if (state.has(root)) continue
    const path: string[] = [root]
    const next: number[] = [0]
    state.set(root, 1)
    while (path.length > 0) {
      const node = path[path.length - 1]
      const kids = children.get(node) ?? []
      const index = next[next.length - 1]
      if (index >= kids.length) {
        state.set(node, 2)
        path.pop()
        next.pop()
        continue
      }
      next[next.length - 1] = index + 1
      const kid = kids[index]
      const seen = state.get(kid)
      if (seen === 1) {
        issues.push({
          code: 'cycle',
          path: [...path.slice(path.indexOf(kid)), kid]
        })
        if (issues.length >= limit) return issues
      } else if (seen === undefined) {
        state.set(kid, 1)
        path.push(kid)
        next.push(0)
      }
    }
  }
  return issues
}

/** Translation keys of the questions asked before saving a warned link. */
export const RELATIONSHIP_WARNING_KEYS: Record<
  RelationshipWarningCode,
  TranslationKey
> = {
  fatherDiedLongBeforeBirth: 'relationshipFatherDiedLongBeforeBirth',
  marriageWithRelative: 'relationshipMarriageWithRelative',
  marriageAfterDeath: 'relationshipMarriageAfterDeath'
}

const ERROR_KEYS: Record<RelationshipValidationCode, TranslationKey> = {
  selfLink: 'relationshipSelfLink',
  duplicateSpouse: 'relationshipDuplicateSpouse',
  cycle: 'relationshipCycle',
  childOlderThanParent: 'relationshipChildOlderThanParent',
  motherDiedBeforeBirth: 'relationshipMotherDiedBeforeBirth',
  duplicateParent: 'relationshipDuplicateParent',
  tooManyParents: 'relationshipTooManyParents',
  invalidBirthYear: 'relationshipInvalidBirthYear',
  birthYearInFuture: 'relationshipBirthYearInFuture',
  invalidBirthOrder: 'relationshipInvalidBirthOrder'
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

/**
 * Thrown by the relationship mutations when the link is allowed but looks
 * wrong; nothing is saved until the caller repeats it with the warning
 * accepted.
 */
export class RelationshipWarningError extends Error {
  readonly issue: RelationshipWarningCode

  constructor(issue: RelationshipWarningCode) {
    super(issue)
    this.name = 'RelationshipWarningError'
    this.issue = issue
  }
}

/** A parent whose death does not fit a child's birth, with both names. */
export interface ParentDeathFinding {
  issue: ParentDeathIssue
  parent: string
  child: string
}

/** A relative of the member with the link type, for the death checks. */
export interface LinkedRelative extends NamedDatedPerson {
  adopted?: boolean
}

/**
 * Checks the death of the member's parents against the member's birth and the
 * member's death against the children's births. Adopted links are skipped.
 * Errors (a mother) come before warnings (a father); in order of relatives.
 */
export function findParentDeathIssues(
  person: DatedPerson & { full_name: string },
  parents: LinkedRelative[],
  children: LinkedRelative[]
): ParentDeathFinding[] {
  const findings: ParentDeathFinding[] = []
  for (const parent of parents) {
    if (parent.adopted) continue
    const issue = checkParentDeath(parent, person)
    if (issue)
      findings.push({
        issue,
        parent: parent.full_name,
        child: person.full_name
      })
  }
  for (const child of children) {
    if (child.adopted) continue
    const issue = checkParentDeath(person, child)
    if (issue)
      findings.push({ issue, parent: person.full_name, child: child.full_name })
  }
  return findings.sort(
    (a, b) =>
      Number(b.issue === 'motherDiedBeforeBirth') -
      Number(a.issue === 'motherDiedBeforeBirth')
  )
}
