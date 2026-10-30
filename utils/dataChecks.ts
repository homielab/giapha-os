import { vnToday } from '@/utils/dateHelpers'
import { comparePartialDates } from '@/utils/memberFormHelpers'
import {
  checkParentDeath,
  findMarriageIssue,
  findRelationshipIssues,
  isParentChildType
} from '@/utils/relationshipValidation'

/** Columns the whole-tree data check reads. */
export const DATA_CHECK_PERSON_COLUMNS =
  'id, full_name, gender, is_deceased, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_in_law, birth_order, generation'

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
  death_lunar_year: number | null
  death_lunar_month: number | null
  death_lunar_day: number | null
  is_in_law: boolean | null
  birth_order: number | null
  generation: number | null
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
  'fatherDiedBeforeBirth',
  'parentTooYoung',
  'parentTooOld',
  'futureDate',
  'implausibleAge',
  'duplicateRelationship',
  'tooManyParents',
  'singleParentWithSpouse',
  'marriageWithRelative',
  'marriageAfterDeath',
  'parentChildLoop',
  'selfLink',
  'generationMismatch',
  'birthOrderConflict',
  'isolatedPerson',
  'missingBirthYear',
  'missingDeathYear',
  'deceasedFlagMissing',
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

function hasDeathDate(p: DataCheckPerson): boolean {
  return [
    p.death_year,
    p.death_month,
    p.death_day,
    p.death_lunar_year,
    p.death_lunar_month,
    p.death_lunar_day
  ].some((v) => v != null)
}

/** A parent younger than this at the child's birth is reported. */
export const MIN_PARENT_AGE = 12
/** A parent older than this at the child's birth is reported. */
export const MAX_PARENT_AGE = 70
/** Someone living past this age, or who died older than it, is reported. */
export const MAX_AGE = 120

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
 * form): a mother who died before the birth is reported, and so is a father
 * who died more than ten months before it (more than a year when a month or
 * day is unknown). Someone older than `MAX_AGE` (in years) is reported:
 * living with no date of death at all, or died older than that. People that
 * cannot be reached from the root are not reported here (the Lineage page
 * lists them), except someone with no link at all in a tree of two or more
 * (`isolatedPerson`, often a GEDCOM family record that did not come through).
 * A biological child must be one generation below the parent when both
 * generations are known and neither is an in-law; children of one parent must
 * not share a birth order, nor have it run against birth dates that are known
 * (adopted and in-law children left out). A link from a person to themselves is
 * only reported as `selfLink`; a marriage between a parent and child, between
 * children of a common biological parent, or with someone who died before the
 * other was born is reported; parent–child loops are listed once each, as the
 * people along the loop. A child with one parent recorded whose parent has a
 * spouse is listed with the spouses as possible missing parents
 * (`singleParentWithSpouse`). Findings are sorted by kind, then name
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
    // A date of death on someone not marked deceased (CSV/JSON restore keep the
    // two apart): no death anniversary, counted as living, yet shown as dead.
    if (!p.is_deceased && hasDeathDate(p)) {
      findings.push({
        kind: 'deceasedFlagMissing',
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
    // Old trees imported from GEDCOM/CSV often lack the death: such a person
    // still counts as living and gets a birthday every year.
    if (p.birth_year != null) {
      const age =
        p.death_year != null
          ? p.death_year - p.birth_year
          : !p.is_deceased && !hasDeathDate(p)
            ? now.year - p.birth_year
            : null
      if (age != null && age > MAX_AGE) {
        findings.push({
          kind: 'implausibleAge',
          people: [ref(p)],
          params: {
            name: p.full_name,
            field: p.death_year != null ? 'death' : 'living',
            birth: birthOf(p),
            death: deathOf(p),
            age
          }
        })
      }
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
  const links: DataCheckRelationship[] = []
  for (const r of relationships) {
    const a = byId.get(r.person_a)
    const b = byId.get(r.person_b)

    if (r.person_a === r.person_b) {
      if (a) {
        findings.push({
          kind: 'selfLink',
          people: [ref(a)],
          params: {
            name: a.full_name,
            type: r.type === 'marriage' ? 'marriage' : 'child'
          }
        })
      }
      continue
    }
    links.push(r)

    if (r.type === 'biological_child' && a && b) {
      const parentIssue = checkParentDeath(a, b)
      if (parentIssue === 'motherDiedBeforeBirth') {
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
      } else if (parentIssue === 'fatherDiedLongBeforeBirth') {
        findings.push({
          kind: 'fatherDiedBeforeBirth',
          people: [ref(b), ref(a)],
          params: {
            child: b.full_name,
            father: a.full_name,
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
  for (const r of links) {
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

  findings.push(...checkSingleParents(links, byId))

  // Each marriage once, whichever way round it is stored.
  const seenMarriages = new Set<string>()
  const parentLinksOf = new Map<string, DataCheckRelationship[]>()
  for (const r of links) {
    if (!isParentChildType(r.type)) continue
    const list = parentLinksOf.get(r.person_b)
    if (list) list.push(r)
    else parentLinksOf.set(r.person_b, [r])
  }
  for (const r of links) {
    if (r.type !== 'marriage') continue
    const key = [r.person_a, r.person_b].sort().join('|')
    if (seenMarriages.has(key)) continue
    seenMarriages.add(key)
    const a = byId.get(r.person_a)
    const b = byId.get(r.person_b)
    if (!a || !b) continue
    const issue = findMarriageIssue(
      [a, b],
      [...(parentLinksOf.get(a.id) ?? []), ...(parentLinksOf.get(b.id) ?? [])],
      a.id,
      b.id
    )
    if (!issue) continue
    if (issue.code === 'marriageWithRelative') {
      findings.push({
        kind: 'marriageWithRelative',
        people: [ref(a), ref(b)],
        params: { a: a.full_name, b: b.full_name, relation: issue.relation }
      })
    } else {
      const dead = byId.get(issue.died)!
      const born = byId.get(issue.born)!
      findings.push({
        kind: 'marriageAfterDeath',
        people: [ref(dead), ref(born)],
        params: {
          dead: dead.full_name,
          death: deathOf(dead),
          other: born.full_name,
          birth: birthOf(born)
        }
      })
    }
  }

  // Every loop is reported (the limit only bounds the search).
  const parentLinks = links.filter((r) => isParentChildType(r.type))
  for (const issue of findRelationshipIssues(
    parentLinks,
    parentLinks.length + 1
  )) {
    if (issue.code !== 'cycle') continue
    const loop = issue.path.flatMap((id) => byId.get(id) ?? [])
    if (loop.length !== issue.path.length) continue
    findings.push({
      kind: 'parentChildLoop',
      // The last id repeats the first one.
      people: loop.slice(0, -1).map(ref),
      params: {
        count: loop.length - 1,
        path: loop.map((p) => p.full_name).join(' → ')
      }
    })
  }

  findings.push(
    ...checkGenerations(links, byId),
    ...checkBirthOrders(links, byId)
  )

  // One person alone is a tree just started, not a lost link.
  if (persons.length > 1) {
    const linked = new Set(links.flatMap((r) => [r.person_a, r.person_b]))
    for (const p of persons) {
      if (!linked.has(p.id)) {
        findings.push({
          kind: 'isolatedPerson',
          people: [ref(p)],
          params: { name: p.full_name }
        })
      }
    }
  }

  const order = (k: DataCheckKind) => DATA_CHECK_KINDS.indexOf(k)
  return findings.sort(
    (x, y) =>
      order(x.kind) - order(y.kind) ||
      x.people[0].name.localeCompare(y.people[0].name, 'vi') ||
      x.people[0].id.localeCompare(y.people[0].id)
  )
}

/**
 * A child with one parent recorded (birth or adoptive) while that parent has
 * a spouse: old trees often link the child to the father only, so the spouse
 * may be the missing parent. Only a hint: nothing is linked here.
 */
function checkSingleParents(
  links: DataCheckRelationship[],
  byId: Map<string, DataCheckPerson>
): DataCheckFinding[] {
  const parentsOf = new Map<string, Set<string>>()
  const spousesOf = new Map<string, Set<string>>()
  const add = (map: Map<string, Set<string>>, key: string, id: string) => {
    const set = map.get(key)
    if (set) set.add(id)
    else map.set(key, new Set([id]))
  }
  for (const r of links) {
    if (isParentChildType(r.type)) add(parentsOf, r.person_b, r.person_a)
    else if (r.type === 'marriage') {
      add(spousesOf, r.person_a, r.person_b)
      add(spousesOf, r.person_b, r.person_a)
    }
  }
  const findings: DataCheckFinding[] = []
  for (const [childId, parentIds] of parentsOf) {
    if (parentIds.size !== 1) continue
    const child = byId.get(childId)
    const parent = byId.get([...parentIds][0])
    if (!child || !parent) continue
    const spouses = [...(spousesOf.get(parent.id) ?? [])]
      .filter((id) => id !== childId)
      .flatMap((id) => byId.get(id) ?? [])
      .sort((x, y) => x.full_name.localeCompare(y.full_name, 'vi'))
    if (spouses.length === 0) continue
    findings.push({
      kind: 'singleParentWithSpouse',
      people: [ref(child), ref(parent), ...spouses.map(ref)],
      params: {
        child: child.full_name,
        parent: parent.full_name,
        spouses: spouses.map((p) => p.full_name).join(', ')
      }
    })
  }
  return findings
}

/** Each biological parent → child link once, both people known. */
function biologicalLinks(
  links: DataCheckRelationship[],
  byId: Map<string, DataCheckPerson>
): [DataCheckPerson, DataCheckPerson][] {
  const seen = new Set<string>()
  return links.flatMap((r) => {
    const key = `${r.person_a}|${r.person_b}`
    const parent = byId.get(r.person_a)
    const kid = byId.get(r.person_b)
    if (r.type !== 'biological_child' || !parent || !kid || seen.has(key))
      return []
    seen.add(key)
    return [[parent, kid] as [DataCheckPerson, DataCheckPerson]]
  })
}

/**
 * A biological child one generation below the parent. In-laws are left out:
 * they take the generation of their spouse, not of their own parents.
 */
function checkGenerations(
  links: DataCheckRelationship[],
  byId: Map<string, DataCheckPerson>
): DataCheckFinding[] {
  return biologicalLinks(links, byId).flatMap(([parent, kid]) => {
    if (
      parent.generation == null ||
      kid.generation == null ||
      parent.is_in_law ||
      kid.is_in_law ||
      kid.generation === parent.generation + 1
    )
      return []
    return [
      {
        kind: 'generationMismatch' as const,
        people: [ref(kid), ref(parent)],
        params: {
          child: kid.full_name,
          parent: parent.full_name,
          childGeneration: kid.generation,
          parentGeneration: parent.generation,
          expected: parent.generation + 1
        }
      }
    ]
  })
}

/**
 * Children of the same parents sharing a birth order, or whose order runs
 * against known birth dates (only years that are recorded, down to the month
 * and day when both have them). Orders are compared only between children of
 * the same pair of parents (a child with one known parent goes with the other
 * children of that parent alone): half siblings are often numbered per mother,
 * and a tree numbered across both wives is right too.
 */
function checkBirthOrders(
  links: DataCheckRelationship[],
  byId: Map<string, DataCheckPerson>
): DataCheckFinding[] {
  const parentsOf = new Map<string, DataCheckPerson[]>()
  for (const [parent, kid] of biologicalLinks(links, byId)) {
    if (kid.birth_order == null || kid.is_in_law) continue
    parentsOf.set(kid.id, [...(parentsOf.get(kid.id) ?? []), parent])
  }

  const byName = (x: DataCheckPerson, y: DataCheckPerson) =>
    x.full_name.localeCompare(y.full_name, 'vi') || x.id.localeCompare(y.id)
  // Father first, then by name: 'F & M'
  const fatherFirst = (x: DataCheckPerson, y: DataCheckPerson) =>
    Number(y.gender === 'male') - Number(x.gender === 'male') || byName(x, y)
  const families = new Map<
    string,
    { parents: DataCheckPerson[]; kids: DataCheckPerson[] }
  >()
  for (const [kidId, parents] of parentsOf) {
    const key = parents
      .map((p) => p.id)
      .sort()
      .join('|')
    const family = families.get(key)
    if (family) family.kids.push(byId.get(kidId)!)
    else
      families.set(key, {
        parents: [...parents].sort(fatherFirst),
        kids: [byId.get(kidId)!]
      })
  }

  const findings: DataCheckFinding[] = []
  const birthDate = (p: DataCheckPerson) => ({
    year: p.birth_year ?? ('' as const),
    month: p.birth_month ?? ('' as const),
    day: p.birth_day ?? ('' as const)
  })

  for (const { parents, kids } of families.values()) {
    const parent = parents.map((p) => p.full_name).join(' & ')

    const sameOrder = new Map<number, DataCheckPerson[]>()
    for (const kid of kids) {
      const order = kid.birth_order as number
      sameOrder.set(order, [...(sameOrder.get(order) ?? []), kid])
    }
    for (const [order, group] of sameOrder) {
      if (group.length < 2) continue
      group.sort(byName)
      findings.push({
        kind: 'birthOrderConflict',
        people: group.map(ref),
        params: {
          type: 'same',
          names: group.map((p) => p.full_name).join(', '),
          parent,
          order
        }
      })
    }

    // Each child against the next one in birth order whose year is known.
    const dated = kids
      .filter((p) => p.birth_year != null)
      .sort(
        (x, y) =>
          (x.birth_order as number) - (y.birth_order as number) ||
          (comparePartialDates(birthDate(x), birthDate(y)) ?? 0)
      )
    for (let i = 0; i + 1 < dated.length; i++) {
      const [earlier, later] = [dated[i], dated[i + 1]]
      if (earlier.birth_order === later.birth_order) continue
      const born = comparePartialDates(birthDate(earlier), birthDate(later))
      if (born == null || born <= 0) continue
      findings.push({
        kind: 'birthOrderConflict',
        people: [ref(earlier), ref(later)],
        params: {
          type: 'reversed',
          a: earlier.full_name,
          b: later.full_name,
          parent,
          orderA: earlier.birth_order as number,
          orderB: later.birth_order as number,
          birthA: birthOf(earlier),
          birthB: birthOf(later)
        }
      })
    }
  }
  return findings
}
