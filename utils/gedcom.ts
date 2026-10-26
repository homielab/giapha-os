export interface GedcomPerson {
  id?: string
  full_name?: string | null
  gender?: 'male' | 'female' | 'other' | string
  birth_year?: number | null
  birth_month?: number | null
  birth_day?: number | null
  death_year?: number | null
  death_month?: number | null
  death_day?: number | null
  is_deceased?: boolean
  is_in_law?: boolean
  birth_order?: number | null
  generation?: number | null
  avatar_url?: string | null
  note?: string | null
}

export interface GedcomRelationship {
  type?: string
  person_a?: string
  person_b?: string
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
      children: []
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
      const lines = person.note.split('\n')
      gedcom += `1 NOTE ${lines[0]}\n`
      for (let i = 1; i < lines.length; i++) {
        gedcom += `2 CONT ${lines[i]}\n`
      }
    }
  }

  for (const fam of families) {
    gedcom += `0 @${fam.id}@ FAM\n`
    if (fam.husb) gedcom += `1 HUSB ${getIndiXref(fam.husb)}\n`
    if (fam.wife) gedcom += `1 WIFE ${getIndiXref(fam.wife)}\n`
    for (const childId of fam.children) {
      gedcom += `1 CHIL ${getIndiXref(childId)}\n`
    }
  }

  gedcom += '0 TRLR\n'
  return gedcom
}

function formatName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '1 NAME Unknown /Unknown/\n'
  if (parts.length === 1) return `1 NAME ${parts[0]}\n2 GIVN ${parts[0]}\n`
  const [surname, ...rest] = parts
  const given = rest.join(' ')
  return `1 NAME /${surname}/ ${given}\n2 GIVN ${given}\n2 SURN ${surname}\n`
}

/**
 * A GEDCOM date is `[[DD] MON] YYYY`: a day needs a month and every date
 * needs a year, so a day without a month (or a date without a year) is left
 * out instead of being written as an invalid or misread date.
 */
function formatDate(
  day: number | null | undefined,
  month: number | null | undefined,
  year: number | null | undefined
): string {
  if (!year || year <= 0) return ''
  const mon = getMonthName(month ?? null)
  const dd = mon && day && day > 0 ? String(day).padStart(2, '0') : ''
  return `2 DATE ${[dd, mon, String(year)].filter(Boolean).join(' ')}\n`
}

function getMonthName(month: number | null): string {
  if (!month) return ''
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
  ]
  return months[month - 1] || ''
}

function parseMonthName(name: string): number | null {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
  ]
  const index = months.findIndex((m) => m === name.toUpperCase())
  return index !== -1 ? index + 1 : null
}

/**
 * Full name from a GEDCOM NAME: SURN/GIVN when present, in the order the NAME
 * writes them (surname first for `/Nguyễn/ Văn An`), otherwise the NAME
 * without its slashes (`Văn /An/` → `Văn An`, as older exports wrote it).
 */
function readName(
  nameValue: string | null,
  surname: string | null,
  givenName: string | null
): string {
  const clean = (s: string) => s.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  const value = nameValue?.trim() ?? ''
  if (surname || givenName) {
    const surnameFirst = value === '' || value.startsWith('/')
    const parts = surnameFirst ? [surname, givenName] : [givenName, surname]
    return clean(parts.filter(Boolean).join(' '))
  }
  return clean(value) || 'Unknown'
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function parseGedcom(gedcom: string): {
  persons: GedcomPerson[]
  relationships: GedcomRelationship[]
} {
  const lines = gedcom.split(/\r?\n/).filter((line) => line.trim().length > 0)

  const persons: GedcomPerson[] = []
  const relationships: GedcomRelationship[] = []
  const idMap = new Map<string, string>()
  // `${indiXref} ${famXref}` of FAMC links marked PEDI ADOPTED
  const adoptedLinks = new Set<string>()

  type ParseRecord = {
    type: 'INDI' | 'FAM'
    id: string
    lines: string[]
  }

  const records: ParseRecord[] = []
  let currentRecord: ParseRecord | null = null

  for (const line of lines) {
    if (line.startsWith('0 ')) {
      if (currentRecord) records.push(currentRecord)
      const match = line.match(/^0\s+@([^@]+)@\s+(INDI|FAM)/)
      if (match) {
        currentRecord = {
          id: match[1],
          type: match[2] as 'INDI' | 'FAM',
          lines: []
        }
      } else {
        currentRecord = null
      }
    } else if (currentRecord) {
      currentRecord.lines.push(line.trim())
    }
  }
  if (currentRecord) records.push(currentRecord)

  // Parse Individuals
  for (const record of records.filter((r) => r.type === 'INDI')) {
    const uuid = generateUUID()
    idMap.set(record.id, uuid)

    let nameValue: string | null = null
    let surname: string | null = null
    let givenName: string | null = null
    let famc = ''
    let gender: 'male' | 'female' | 'other' = 'other'
    let is_deceased = false
    let birth_day = null
    let birth_month = null
    let birth_year = null
    let death_day = null
    let death_month = null
    let death_year = null
    let note = ''

    let currentTag = ''

    for (let i = 0; i < record.lines.length; i++) {
      const line = record.lines[i]
      const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/)
      if (!match) continue

      const level = parseInt(match[1])
      const tag = match[2]
      const val = match[3] || ''

      if (level === 1) {
        currentTag = tag
        if (tag === 'NAME') {
          // Only the first (primary) name is kept.
          if (nameValue !== null) currentTag = 'NAME_OTHER'
          else nameValue = val
        } else if (tag === 'FAMC') {
          famc = val.match(/^@([^@]+)@/)?.[1] ?? ''
        } else if (tag === 'SEX') {
          if (val === 'M') gender = 'male'
          else if (val === 'F') gender = 'female'
        } else if (tag === 'DEAT') {
          is_deceased = val.trim().length === 0 || val === 'Y'
        } else if (tag === 'NOTE') {
          note = val
        }
      } else if (level === 2) {
        if (currentTag === 'NAME' && tag === 'SURN') {
          surname = val.trim() || null
        } else if (currentTag === 'NAME' && tag === 'GIVN') {
          givenName = val.trim() || null
        } else if (currentTag === 'FAMC' && tag === 'PEDI') {
          if (famc && val.trim().toUpperCase() === 'ADOPTED') {
            adoptedLinks.add(`${record.id} ${famc}`)
          }
        } else if (currentTag === 'NOTE' && tag === 'CONT') {
          note += '\n' + val
        } else if (currentTag === 'BIRT' && tag === 'DATE') {
          const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, '')
          const parts = cleanVal.split(' ')
          if (parts.length === 3) {
            birth_day = parseInt(parts[0]) || null
            birth_month = parseMonthName(parts[1])
            birth_year = parseInt(parts[2]) || null
          } else if (parts.length === 1) {
            birth_year = parseInt(parts[0]) || null
          } else if (parts.length === 2) {
            birth_month = parseMonthName(parts[0])
            birth_year = parseInt(parts[1]) || null
          }
        } else if (currentTag === 'DEAT' && tag === 'DATE') {
          is_deceased = true
          const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, '')
          const parts = cleanVal.split(' ')
          if (parts.length === 3) {
            death_day = parseInt(parts[0]) || null
            death_month = parseMonthName(parts[1])
            death_year = parseInt(parts[2]) || null
          } else if (parts.length === 1) {
            death_year = parseInt(parts[0]) || null
          } else if (parts.length === 2) {
            death_month = parseMonthName(parts[0])
            death_year = parseInt(parts[1]) || null
          }
        }
      }
    }

    persons.push({
      id: uuid,
      full_name: readName(nameValue, surname, givenName),
      gender,
      is_deceased,
      birth_day: Number.isNaN(birth_day) ? null : birth_day,
      birth_month,
      birth_year: Number.isNaN(birth_year) ? null : birth_year,
      death_day: Number.isNaN(death_day) ? null : death_day,
      death_month,
      death_year: Number.isNaN(death_year) ? null : death_year,
      is_in_law: false,
      birth_order: null,
      generation: null,
      avatar_url: null,
      note: note.length > 0 ? note : null
    })
  }

  // Parse Families
  for (const record of records.filter((r) => r.type === 'FAM')) {
    let husb = null
    let wife = null
    const children: { uuid: string; xref: string }[] = []

    for (const line of record.lines) {
      const match = line.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/)
      if (match) {
        const tag = match[1]
        const refId = match[2]
        const uuid = idMap.get(refId)
        if (!uuid) continue

        if (tag === 'HUSB') husb = uuid
        else if (tag === 'WIFE') wife = uuid
        else if (tag === 'CHIL') children.push({ uuid, xref: refId })
      }
    }

    if (husb && wife && husb !== wife) {
      relationships.push({
        type: 'marriage',
        person_a: husb,
        person_b: wife
      })
    }

    // Link each child to the parents this family actually has
    for (const { uuid: childId, xref } of children) {
      const type = adoptedLinks.has(`${xref} ${record.id}`)
        ? 'adopted_child'
        : 'biological_child'
      for (const parent of [husb, wife]) {
        if (parent && parent !== childId) {
          relationships.push({ type, person_a: parent, person_b: childId })
        }
      }
    }
  }

  // Deduplicate relationships to prevent database unique constraint errors
  const uniqueRelationships: GedcomRelationship[] = []
  const seenKeys = new Set<string>()

  for (const rel of relationships) {
    const key = `${rel.type}_${rel.person_a}_${rel.person_b}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      uniqueRelationships.push(rel)
    }
  }

  return { persons, relationships: uniqueRelationships }
}
