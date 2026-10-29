import { Gender } from '@/types'

import { compareBirth } from './compareBirth'
import { solarToLunar } from './lunarCalendar'

/**
 * "Phả ký": the whole tree as a printable book, grouped by generation
 * (Dashboard → Lineage → Family book). Everything here is pure: the page in
 * `app/dashboard/lineage/book` loads the rows and renders what these helpers
 * return.
 */

/** The person columns the book reads (see BOOK_PERSON_COLUMNS). */
export interface LineageBookPerson {
  id: string
  full_name: string
  gender: Gender
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
  note: string | null
  /** Missing on databases not upgraded yet. */
  burial_place?: string | null
}

export interface BookRelationshipRow {
  id: string
  type: string
  person_a: string
  person_b: string
}

export type ParentLabel = 'father' | 'mother' | 'parent'
export type SpouseLabel = 'wife' | 'husband' | 'spouse'

export interface BookEntry {
  person: LineageBookPerson
  /** 1-based position inside its own section. */
  ordinal: number
  parents: Array<{ person: LineageBookPerson; label: ParentLabel }>
  spouses: Array<{
    person: LineageBookPerson
    label: SpouseLabel
    inLaw: boolean
  }>
  children: Array<{ person: LineageBookPerson; adopted: boolean }>
  deathLunar: {
    day: number
    month: number
    year: number | null
    leap: boolean
  } | null
  /** "An táng tại …": only for a deceased member with a burial place. */
  burialPlace: string | null
}

export interface BookGeneration {
  generation: number
  entries: BookEntry[]
}

export interface LineageBook {
  generations: BookGeneration[]
  /** Members without a generation: the section at the end of the book. */
  unknown: BookEntry[]
  /** Most common first name token, or null when there is no clear one. */
  surname: string | null
}

const parentLabel = (gender: Gender): ParentLabel =>
  gender === 'male' ? 'father' : gender === 'female' ? 'mother' : 'parent'

const spouseLabel = (gender: Gender): SpouseLabel =>
  gender === 'female' ? 'wife' : gender === 'male' ? 'husband' : 'spouse'

/** Siblings: birth order first, then birth date, then the name, then the id. */
const byBirth = compareBirth

/**
 * The lunar death date shown in the book: the stored death_lunar_* wins;
 * otherwise it is derived from a complete solar death date (year, month and
 * day). A year alone gives null, so no day is made up. The leap flag is derived
 * from the solar date and only kept when its lunar day and month match the
 * stored ones (the database does not store it), like the events list.
 */
export function deathLunarDate(
  person: LineageBookPerson
): BookEntry['deathLunar'] {
  if (!person.is_deceased) return null
  const solar =
    person.death_year && person.death_month && person.death_day
      ? solarToLunar(person.death_year, person.death_month, person.death_day)
      : null
  if (person.death_lunar_month != null && person.death_lunar_day != null) {
    const leap =
      solar?.leap === true &&
      solar.month === person.death_lunar_month &&
      solar.day === person.death_lunar_day
    return {
      day: person.death_lunar_day,
      month: person.death_lunar_month,
      year: person.death_lunar_year,
      leap
    }
  }
  if (solar) return { ...solar, leap: solar.leap === true }
  return null
}

/** The burial place shown in the book, trimmed; null for the living. */
export function burialPlaceOf(person: LineageBookPerson): string | null {
  if (!person.is_deceased) return null
  return person.burial_place?.trim() || null
}

/**
 * The most common first token of the members' names, used as the book title.
 * A tie or a single bearer gives null (the page falls back to a plain title).
 */
export function mostCommonSurname(persons: LineageBookPerson[]): string | null {
  const counts = new Map<string, number>()
  for (const person of persons) {
    const first = person.full_name.trim().split(/\s+/)[0]
    if (!first) continue
    counts.set(first, (counts.get(first) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  let tie = false
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
      tie = false
    } else if (count === bestCount) {
      tie = true
    }
  }
  return !tie && bestCount >= 2 ? best : null
}

/**
 * Groups the members into generations ordered by their parents, then builds
 * each member's entry (parents, spouses, children in birth order). Members
 * without a generation go into `unknown`. Members of one generation come
 * after their parents' order in the previous generation; members with no
 * parent in the tree come last, by birth date then name.
 */
export function buildLineageBook(
  persons: LineageBookPerson[],
  relationships: BookRelationshipRow[]
): LineageBook {
  const byId = new Map(persons.map((p) => [p.id, p]))
  const parentRows = new Map<string, Array<{ id: string; adopted: boolean }>>()
  const childRows = new Map<string, Array<{ id: string; adopted: boolean }>>()
  const spouseIds = new Map<string, string[]>()
  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      const adopted = r.type === 'adopted_child'
      const list = parentRows.get(r.person_b) ?? []
      list.push({ id: r.person_a, adopted })
      parentRows.set(r.person_b, list)
      const kids = childRows.get(r.person_a) ?? []
      kids.push({ id: r.person_b, adopted })
      childRows.set(r.person_a, kids)
    } else if (r.type === 'marriage') {
      for (const [a, b] of [
        [r.person_a, r.person_b],
        [r.person_b, r.person_a]
      ]) {
        const list = spouseIds.get(a) ?? []
        if (!list.includes(b)) list.push(b)
        spouseIds.set(a, list)
      }
    }
  }

  const entryFor = (person: LineageBookPerson, ordinal: number): BookEntry => ({
    person,
    ordinal,
    parents: (parentRows.get(person.id) ?? [])
      .map((row) => byId.get(row.id))
      .filter((p): p is LineageBookPerson => Boolean(p))
      .sort(
        (a, b) =>
          (a.gender === 'male' ? 0 : a.gender === 'female' ? 1 : 2) -
            (b.gender === 'male' ? 0 : b.gender === 'female' ? 1 : 2) ||
          a.id.localeCompare(b.id)
      )
      .map((p) => ({ person: p, label: parentLabel(p.gender) })),
    spouses: (spouseIds.get(person.id) ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is LineageBookPerson => Boolean(p))
      .map((p) => ({
        person: p,
        label: spouseLabel(p.gender),
        inLaw: p.is_in_law
      })),
    children: (childRows.get(person.id) ?? [])
      .map((row) => ({ row, child: byId.get(row.id) }))
      .filter(
        (
          x
        ): x is {
          row: { id: string; adopted: boolean }
          child: LineageBookPerson
        } => Boolean(x.child)
      )
      .sort((a, b) => byBirth(a.child, b.child))
      .map((x) => ({ person: x.child, adopted: x.row.adopted })),
    deathLunar: deathLunarDate(person),
    burialPlace: burialPlaceOf(person)
  })

  const withGeneration = persons.filter((p) => p.generation != null)
  const generationsNumbers = [
    ...new Set(withGeneration.map((p) => p.generation as number))
  ].sort((a, b) => a - b)

  const generations: BookGeneration[] = []
  const previousOrder = new Map<string, number>()
  for (const generation of generationsNumbers) {
    const members = withGeneration.filter((p) => p.generation === generation)
    const ordered = members
      .map((person) => {
        const parents = (parentRows.get(person.id) ?? [])
          .map((row) => byId.get(row.id))
          .filter((p): p is LineageBookPerson => Boolean(p))
        const orders = parents
          .map((p) => previousOrder.get(p.id))
          .filter((n): n is number => n != null)
        return {
          person,
          parentOrder: orders.length ? Math.min(...orders) : Infinity
        }
      })
      .sort(
        (a, b) => a.parentOrder - b.parentOrder || byBirth(a.person, b.person)
      )
      .map((x) => x.person)
    const order = new Map<string, number>()
    const entries = ordered.map((person, i) => {
      order.set(person.id, i)
      return entryFor(person, i + 1)
    })
    order.forEach((v, k) => previousOrder.set(k, v))
    generations.push({ generation, entries })
  }

  const unknown = persons
    .filter((p) => p.generation == null)
    .sort(byBirth)
    .map((person, i) => entryFor(person, i + 1))

  return {
    generations,
    unknown,
    surname: mostCommonSurname(persons)
  }
}

/** "1890", "15/3" or "15/3/1890" — null when even the year is missing. */
export function formatSolarDate(
  year: number | null,
  month: number | null,
  day: number | null
): string | null {
  if (year == null) return null
  if (month == null || day == null) return `${year}`
  return `${day}/${month}/${year}`
}

/**
 * Columns the book page reads from `persons`: the whole row, so that a
 * database without the burial_place column yet still prints the book.
 */
export const BOOK_PERSON_COLUMNS = '*'
