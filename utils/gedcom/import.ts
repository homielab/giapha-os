import { parseGedcomDate } from './dates'
import { readName } from './names'
import type { GedcomPerson, GedcomRelationship } from './types'

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
  const lines = gedcom
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

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
      // Keep trailing spaces: a CONC line may end with a word break.
      currentRecord.lines.push(line.trimStart())
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
    let burialPlace: string | null = null
    let deathLunar: { day: number; month: number; year: number } | null = null
    let deathLunarLeap = false
    let generation: number | null = null
    let birthOrder: number | null = null
    let isInLaw = false
    const otherNames: string[] = []
    const rangeNotes: string[] = []

    let currentTag = ''

    for (let i = 0; i < record.lines.length; i++) {
      const line = record.lines[i]
      const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s(.*))?$/)
      if (!match) continue

      const level = parseInt(match[1])
      const tag = match[2]
      // NOTE/CONC/CONT values keep their spaces (the break may fall on a space).
      const val =
        tag === 'CONC' || tag === 'CONT' || tag === 'NOTE'
          ? match[3] || ''
          : (match[3] || '').trim()

      if (level === 1) {
        currentTag = tag
        if (tag === 'NAME') {
          // The first NAME is the primary name; later ones are other names.
          if (nameValue !== null) {
            currentTag = 'NAME_OTHER'
            const other = readName(val, null, null)
            if (other !== 'Unknown') otherNames.push(other)
          } else nameValue = val
        } else if (tag === 'FAMC') {
          famc = val.match(/^@([^@]+)@/)?.[1] ?? ''
        } else if (tag === 'SEX') {
          if (val === 'M') gender = 'male'
          else if (val === 'F') gender = 'female'
        } else if (tag === 'DEAT') {
          is_deceased = val.trim().length === 0 || val === 'Y'
        } else if (tag === 'NOTE') {
          note = val
        } else if (tag === '_GEN' || tag === '_ORDER') {
          const n = /^\d+$/.test(val) ? parseInt(val) : null
          if (tag === '_GEN') generation = n
          else birthOrder = n
        } else if (tag === '_INLAW') {
          isInLaw = val.toUpperCase() === 'Y'
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
        } else if (currentTag === 'NOTE' && tag === 'CONC') {
          note += val
        } else if (currentTag === 'BIRT' && tag === 'DATE') {
          const date = parseGedcomDate(val)
          birth_day = date.day
          birth_month = date.month
          birth_year = date.year
          if (date.rangeText) rangeNotes.push(`BIRT: ${date.rangeText}`)
        } else if (currentTag === 'DEAT' && tag === 'DATE') {
          is_deceased = true
          const date = parseGedcomDate(val)
          death_day = date.day
          death_month = date.month
          death_year = date.year
          if (date.rangeText) rangeNotes.push(`DEAT: ${date.rangeText}`)
        } else if (currentTag === 'BURI' && tag === 'PLAC') {
          // A burial means the person has died.
          if (val) {
            burialPlace = val
            is_deceased = true
          }
        } else if (currentTag === 'DEAT' && tag === '_LUNAR') {
          const [d, m, y, flag] = val.split(/\s+/)
          const day = parseInt(d)
          const month = parseInt(m)
          const year = parseInt(y)
          if (day >= 1 && day <= 30 && month >= 1 && month <= 12 && year > 0) {
            deathLunar = { day, month, year }
            deathLunarLeap = flag?.toUpperCase() === 'LEAP'
          }
        }
      }
    }

    // A range keeps only its first date: say so in the note.
    if (rangeNotes.length > 0) {
      note = [note, ...rangeNotes].filter(Boolean).join('\n')
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
      death_lunar_day: deathLunar?.day ?? null,
      death_lunar_month: deathLunar?.month ?? null,
      death_lunar_year: deathLunar?.year ?? null,
      ...(deathLunar && deathLunarLeap ? { death_lunar_leap: true } : {}),
      other_names: otherNames.length > 0 ? otherNames.join(', ') : null,
      is_in_law: isInLaw,
      birth_order: birthOrder,
      generation,
      avatar_url: null,
      note: note.length > 0 ? note : null,
      burial_place: burialPlace
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
