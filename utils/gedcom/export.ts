import { solarToLunar } from '../lunarCalendar'
import { formatDate } from './dates'
import { formatName, splitOtherNames } from './names'
import { escapeValue, noteLines } from './notes'
import type { GedcomPerson, GedcomRelationship } from './types'

/** The database keeps no leap flag: read it off the solar date of death. */
function isLeapDeath(person: GedcomPerson): boolean {
  if (!person.death_year || !person.death_month || !person.death_day) {
    return false
  }
  const lunar = solarToLunar(
    person.death_year,
    person.death_month,
    person.death_day
  )
  return (
    !!lunar &&
    lunar.leap &&
    lunar.day === person.death_lunar_day &&
    lunar.month === person.death_lunar_month &&
    lunar.year === person.death_lunar_year
  )
}

export function exportToGedcom(data: {
  persons: GedcomPerson[]
  relationships: GedcomRelationship[]
}): string {
  let gedcom = ''

  // Header (GEDCOM 7.0)
  gedcom += '0 HEAD\n'
  gedcom += '1 GEDC\n'
  gedcom += '2 VERS 7.0\n'
  gedcom += '1 SOUR Giapha_OS\n'
  gedcom += '2 NAME Giapha OS\n'
  gedcom += '2 VERS 0.1.0\n'

  const personMap = new Map(
    data.persons.filter((p) => !!p.id).map((p) => [p.id!, p])
  )

  // Map original IDs to short export IDs (to satisfy 20-char XREF limit)
  const exportIdMap = new Map<string, string>()
  let personCounter = 1
  for (const person of data.persons) {
    if (person.id) {
      exportIdMap.set(person.id, `I${personCounter++}`)
    }
  }

  const getIndiXref = (id: string | undefined) =>
    id ? `@${exportIdMap.get(id) || id.replace(/-/g, '')}@` : ''

  // Pre-process Families
  let familyCounter = 1
  type ExportFamily = {
    id: string
    husb?: string
    wife?: string
    children: string[]
    /** The marriage's note (FAM records of marriages only). */
    note?: string
  }
  const families: ExportFamily[] = []
  // GEDCOM has no "spouse" role without a sex: a man (or a person of another
  // gender) goes in HUSB, a woman in WIFE, so no parent link gets lost.
  const singleParentFamilies = new Map<string, ExportFamily>()
  const singleParentFamily = (parentId: string) => {
    let fam = singleParentFamilies.get(parentId)
    if (!fam) {
      const female = personMap.get(parentId)?.gender === 'female'
      fam = {
        id: `F${familyCounter++}`,
        husb: female ? undefined : parentId,
        wife: female ? parentId : undefined,
        children: []
      }
      singleParentFamilies.set(parentId, fam)
      families.push(fam)
    }
    return fam
  }

  const marriageFamilies: ExportFamily[] = []
  for (const marriage of data.relationships) {
    if (marriage.type !== 'marriage') continue
    const pA = personMap.get(marriage.person_a ?? '')
    const pB = personMap.get(marriage.person_b ?? '')
    if (!pA?.id || !pB?.id || pA.id === pB.id) continue
    const aIsWife = pA.gender === 'female' && pB.gender !== 'female'
    const bIsHusb = pB.gender === 'male' && pA.gender !== 'male'
    const swap = aIsWife || bIsHusb
    const fam: ExportFamily = {
      id: `F${familyCounter++}`,
      husb: swap ? pB.id : pA.id,
      wife: swap ? pA.id : pB.id,
      children: [],
      ...(marriage.note ? { note: marriage.note } : {})
    }
    families.push(fam)
    marriageFamilies.push(fam)
  }

  // Parents of each child, by relationship type, in relationship order.
  const parentsOf = new Map<
    string,
    { biological: string[]; adopted: string[] }
  >()
  for (const rel of data.relationships) {
    if (rel.type !== 'biological_child' && rel.type !== 'adopted_child')
      continue
    const parentId = rel.person_a
    const childId = rel.person_b
    if (!parentId || !childId || parentId === childId) continue
    if (!personMap.has(parentId) || !personMap.has(childId)) continue
    const entry = parentsOf.get(childId) ?? { biological: [], adopted: [] }
    const list = rel.type === 'adopted_child' ? entry.adopted : entry.biological
    if (!list.includes(parentId)) list.push(parentId)
    parentsOf.set(childId, entry)
  }

  // Put each child in the family of its actual parents: a marriage of two of
  // its parents, otherwise one single-parent family per remaining parent.
  // Adopted links go in their own families, marked PEDI ADOPTED.
  const adoptedLinks = new Set<string>() // `${childId} ${famId}`
  const addChild = (fam: ExportFamily, childId: string, adopted: boolean) => {
    if (!fam.children.includes(childId)) fam.children.push(childId)
    if (adopted) adoptedLinks.add(`${childId} ${fam.id}`)
  }
  for (const [childId, entry] of parentsOf) {
    for (const adopted of [false, true]) {
      const remaining = [...(adopted ? entry.adopted : entry.biological)]
      for (const fam of marriageFamilies) {
        if (remaining.length < 2) break
        const h = remaining.indexOf(fam.husb!)
        const w = remaining.indexOf(fam.wife!)
        if (h === -1 || w === -1) continue
        addChild(fam, childId, adopted)
        remaining.splice(Math.max(h, w), 1)
        remaining.splice(Math.min(h, w), 1)
      }
      for (const parentId of remaining) {
        addChild(singleParentFamily(parentId), childId, adopted)
      }
    }
  }

  // Map persons to their families (for FAMC and FAMS)
  const personFamc = new Map<string, string[]>()
  const personFams = new Map<string, string[]>()

  for (const fam of families) {
    if (fam.husb) {
      const current = personFams.get(fam.husb) || []
      if (!current.includes(fam.id))
        personFams.set(fam.husb, [...current, fam.id])
    }
    if (fam.wife) {
      const current = personFams.get(fam.wife) || []
      if (!current.includes(fam.id))
        personFams.set(fam.wife, [...current, fam.id])
    }
    for (const childId of fam.children) {
      const current = personFamc.get(childId) || []
      if (!current.includes(fam.id))
        personFamc.set(childId, [...current, fam.id])
    }
  }

  // Export Individuals
  for (const person of data.persons) {
    if (!person.id) continue
    gedcom += `0 ${getIndiXref(person.id)} INDI\n`

    // Name: Vietnamese names start with the surname (họ)
    gedcom += formatName(person.full_name)

    // Sex
    if (person.gender === 'male') gedcom += '1 SEX M\n'
    else if (person.gender === 'female') gedcom += '1 SEX F\n'
    else gedcom += '1 SEX U\n'

    // Birth
    if (person.birth_year || person.birth_month || person.birth_day) {
      gedcom += '1 BIRT\n'
      gedcom += formatDate(
        person.birth_day,
        person.birth_month,
        person.birth_year
      )
    }

    // Death
    if (person.is_deceased) {
      gedcom += '1 DEAT Y\n'
      gedcom += formatDate(
        person.death_day,
        person.death_month,
        person.death_year
      )
      // Custom tag: GEDCOM has no lunar calendar, so the lunar death date
      // (the anniversary) travels as `2 _LUNAR <day> <month> [<year>] [LEAP]`
      // (no year when it is unknown; LEAP needs the full date).
      if (person.death_lunar_day && person.death_lunar_month) {
        const lunar = [person.death_lunar_day, person.death_lunar_month]
        if (person.death_lunar_year) lunar.push(person.death_lunar_year)
        const leap = isLeapDeath(person) ? ' LEAP' : ''
        gedcom += `2 _LUNAR ${lunar.join(' ')}${leap}\n`
      }
    }

    // Burial place: one line (a GEDCOM value cannot hold a line break).
    const burialPlace = person.burial_place
      ?.split(/\s*[\r\n]+\s*/)
      .filter(Boolean)
      .join(', ')
      .trim()
    if (burialPlace) gedcom += `1 BURI\n2 PLAC ${escapeValue(burialPlace)}\n`

    // Custom tags (valid in GEDCOM 5.5.1 and 7.0, other programs ignore them):
    // generation, birth order and the in-law flag, only when set.
    if (person.generation != null) gedcom += `1 _GEN ${person.generation}\n`
    if (person.birth_order != null) gedcom += `1 _ORDER ${person.birth_order}\n`
    if (person.is_in_law) gedcom += '1 _INLAW Y\n'

    // Other names
    for (const other of splitOtherNames(person.other_names)) {
      gedcom += `1 NAME ${escapeValue(other)}\n2 TYPE aka\n`
    }

    // Family Links
    const famcs = personFamc.get(person.id) || []
    for (const famId of famcs) {
      gedcom += `1 FAMC @${famId}@\n`
      if (adoptedLinks.has(`${person.id} ${famId}`)) {
        gedcom += '2 PEDI ADOPTED\n'
      }
    }
    const famss = personFams.get(person.id) || []
    for (const famId of famss) {
      gedcom += `1 FAMS @${famId}@\n`
    }

    // Note
    if (person.note) {
      gedcom += noteLines(1, 'NOTE', person.note)
    }
  }

  for (const fam of families) {
    gedcom += `0 @${fam.id}@ FAM\n`
    if (fam.husb) gedcom += `1 HUSB ${getIndiXref(fam.husb)}\n`
    if (fam.wife) gedcom += `1 WIFE ${getIndiXref(fam.wife)}\n`
    for (const childId of fam.children) {
      gedcom += `1 CHIL ${getIndiXref(childId)}\n`
    }
    if (fam.note) gedcom += noteLines(1, 'NOTE', fam.note)
  }

  gedcom += '0 TRLR\n'
  return gedcom
}
