import { vnToday } from '@/utils/dateHelpers'
import { comparePartialDates } from '@/utils/memberFormHelpers'
import { checkParentDeath } from '@/utils/relationshipValidation'

/** Columns the whole-tree data check reads. */
export const DATA_CHECK_PERSON_COLUMNS =
  'id, full_name, gender, is_deceased, birth_year, birth_month, birth_day, death_year, death_month, death_day'

export interface DataCheckPerson {
  id: string
  full_name: string
  gender: string | null
  is_deceased: boolean | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  death_year: number | null
  death_month: number | null
  death_day: number | null
}

export interface DataCheckRelationship {
  type: string
  person_a: string
  person_b: string
}

/** Kinds of findings, in the order the page lists them. */
export const DATA_CHECK_KINDS = [
  'deathBeforeBirth',
  'bornAfterMotherDeath',
  'parentTooYoung',
  'parentTooOld',
  'futureDate',
  'duplicateRelationship',
  'tooManyParents',
  'missingBirthYear',
  'missingDeathYear',
  'missingGender'
] as const

export type DataCheckKind = (typeof DATA_CHECK_KINDS)[number]

export interface DataCheckFinding {
  kind: DataCheckKind
  /** People to open, the first one is the one at fault. */
  people: { id: string; name: string }[]
  /** Values for the message of the kind. */
  params: Record<string, string | number>
}

/** A parent younger than this at the child's birth is reported. */
export const MIN_PARENT_AGE = 12
/** A parent older than this at the child's birth is reported. */
export const MAX_PARENT_AGE = 70

/** `d/m/y` as far as it is known. */
export function formatPartialDate(
  year: number | null,
  month: number | null,
  day: number | null
): string {
  if (year == null) return ''
  if (month == null) return String(year)
  return day == null ? `${month}/${year}` : `${day}/${month}/${year}`
}

const birthOf = (p: DataCheckPerson) =>
  formatPartialDate(p.birth_year, p.birth_month, p.birth_day)
const deathOf = (p: DataCheckPerson) =>
  formatPartialDate(p.death_year, p.death_month, p.death_day)

const ref = (p: DataCheckPerson) => ({ id: p.id, name: p.full_name })

/**
 * Looks for impossible dates, repeated links and missing basics (birth year,
 * death year of the deceased, gender) in the whole tree. Pure: reads nothing,
 * writes nothing. A date or year that is missing is never part of a date check,
 * and adopted children are left out of the parent checks (as in the member
 * form). People that cannot be reached from the root are not reported here
 * (the Lineage page lists them). Findings are sorted by kind, then name
 * (Vietnamese order), then id.
 */
export function runDataChecks(
  persons: DataCheckPerson[],
  relationships: DataCheckRelationship[],
  today: Date = vnToday()
): DataCheckFinding[] {
  const byId = new Map(persons.map((p) => [p.id, p]))
  const findings: DataCheckFinding[] = []

  const now = {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear()
  }
  const isFuture = (
    year: number | null,
    month: number | null,
    day: number | null
  ) => {
    const order = comparePartialDates(
      { year: year ?? '', month: month ?? '', day: day ?? '' },
      now
    )
    return order != null && order > 0
  }

  for (const p of persons) {
    if (p.death_year != null && p.birth_year != null) {
      const order = comparePartialDates(
        {
          year: p.death_year,
          month: p.death_month ?? '',
          day: p.death_day ?? ''
        },
        {
          year: p.birth_year,
          month: p.birth_month ?? '',
          day: p.birth_day ?? ''
        }
      )
      if (order != null && order < 0) {
        findings.push({
          kind: 'deathBeforeBirth',
          people: [ref(p)],
          params: { name: p.full_name, birth: birthOf(p), death: deathOf(p) }
        })
      }
    }
    if (p.birth_year == null) {
      findings.push({
        kind: 'missingBirthYear',
        people: [ref(p)],
        params: { name: p.full_name }
      })
    }
    if (p.is_deceased && p.death_year == null) {
      findings.push({
        kind: 'missingDeathYear',
        people: [ref(p)],
        params: { name: p.full_name }
      })
    }
    if (p.gender !== 'male' && p.gender !== 'female') {
      findings.push({
        kind: 'missingGender',
        people: [ref(p)],
        params: { name: p.full_name }
      })
    }
    if (isFuture(p.birth_year, p.birth_month, p.birth_day)) {
      findings.push({
        kind: 'futureDate',
        people: [ref(p)],
        params: { name: p.full_name, field: 'birth', date: birthOf(p) }
      })
    }
    if (isFuture(p.death_year, p.death_month, p.death_day)) {
      findings.push({
        kind: 'futureDate',
        people: [ref(p)],
        params: { name: p.full_name, field: 'death', date: deathOf(p) }
      })
    }
  }

  const seenLinks = new Set<string>()
  for (const r of relationships) {
    const a = byId.get(r.person_a)
    const b = byId.get(r.person_b)

    if (r.type === 'biological_child' && a && b) {
      if (checkParentDeath(a, b) === 'motherDiedBeforeBirth') {
        findings.push({
          kind: 'bornAfterMotherDeath',
          people: [ref(b), ref(a)],
          params: {
            child: b.full_name,
            mother: a.full_name,
            birth: birthOf(b),
            death: deathOf(a)
          }
        })
      }
      if (a.birth_year != null && b.birth_year != null) {
        const age = b.birth_year - a.birth_year
        const kind =
          age < MIN_PARENT_AGE
            ? 'parentTooYoung'
            : age > MAX_PARENT_AGE
              ? 'parentTooOld'
              : null
        if (kind) {
          findings.push({
            kind,
            people: [ref(a), ref(b)],
            params: {
              parent: a.full_name,
              child: b.full_name,
              age: Math.abs(age),
              parentBirth: birthOf(a),
              childBirth: birthOf(b)
            }
          })
        }
      }
    }

    // Marriage has no direction; a parent link of either type is one link.
    const isMarriage = r.type === 'marriage'
    const pair = isMarriage
      ? [r.person_a, r.person_b].sort().join('|')
      : `${r.person_a}|${r.person_b}`
    const key = `${isMarriage ? 'marriage' : 'child'}|${pair}`
    if (seenLinks.has(key) && a && b) {
      findings.push({
        kind: 'duplicateRelationship',
        people: [ref(a), ref(b)],
        params: {
          a: a.full_name,
          b: b.full_name,
          type: isMarriage ? 'marriage' : 'child'
        }
      })
    }
    seenLinks.add(key)
  }

  // A child has at most one father and one mother; adopted links don't count.
  const parentsOf = new Map<string, Set<string>>()
  for (const r of relationships) {
    if (r.type !== 'biological_child') continue
    const set = parentsOf.get(r.person_b)
    if (set) set.add(r.person_a)
    else parentsOf.set(r.person_b, new Set([r.person_a]))
  }
  for (const [childId, ids] of parentsOf) {
    const child = byId.get(childId)
    const parents = [...ids].flatMap((id) => byId.get(id) ?? [])
    const gender = (g: string) => parents.filter((p) => p.gender === g).length
    if (
      !child ||
      !(parents.length > 2 || gender('male') > 1 || gender('female') > 1)
    )
      continue
    findings.push({
      kind: 'tooManyParents',
      people: [ref(child), ...parents.map(ref)],
      params: {
        child: child.full_name,
        count: parents.length,
        parents: parents.map((p) => p.full_name).join(', ')
      }
    })
  }

  const order = (k: DataCheckKind) => DATA_CHECK_KINDS.indexOf(k)
  return findings.sort(
    (x, y) =>
      order(x.kind) - order(y.kind) ||
      x.people[0].name.localeCompare(y.people[0].name, 'vi') ||
      x.people[0].id.localeCompare(y.people[0].id)
  )
}
