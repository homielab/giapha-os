import { lunarToSolar } from '../lunarCalendar'
import { parseDayMonth, parseGedcomDate } from './dates'
import { readName } from './names'
import { createNoteReader } from './notes'
import type { ParseRecord } from './records'
import { sourceNotes } from './sources'
import type { GedcomImportStats, GedcomPerson } from './types'

// FAMC pedigrees read as adopted_child; any other (BIRTH, none) is biological.
const ADOPTED_PEDIGREES = new Set(['ADOPTED', 'FOSTER', 'STEP', 'SEALING'])

export type PersonContext = {
  // Shared note records, resolved when an INDI points at them.
  noteTexts: Map<string, string>
  // Source records, cited as "Nguồn: <title>" in notes.
  sourTexts: Map<string, string>
  stats: GedcomImportStats
  // Receives `${indiXref} ${famXref}` of FAMC links marked PEDI ADOPTED, FOSTER, STEP or SEALING.
  adoptedLinks: Set<string>
  // Names in Vietnamese order (surname first), see `readName`.
  surnameFirst?: boolean
  // Full name of a person whose record has no name.
  unnamedName: string
}

type SolarDate = {
  day: number | null
  month: number | null
  year: number | null
}

// The year is null for an anniversary whose year is unknown.
type LunarDate = { day: number; month: number; year: number | null }

type DayMonth = { day: number; month: number }

// `_DATEDM` (day and month, no year) only stands in for a missing GEDCOM
// date: a DATE with a year or a day in the file wins.
function withDayMonth(date: SolarDate, dayMonth: DayMonth | null): SolarDate {
  if (!dayMonth || date.year !== null || date.day !== null) return date
  return { day: dayMonth.day, month: dayMonth.month, year: null }
}

// A leap-month death without a solar date: the LEAP flag is the only place
// the leap month survives, so derive the solar date from it.
function leapDeathDate(
  death: SolarDate,
  lunar: LunarDate | null,
  leap: boolean
): SolarDate {
  if (
    !lunar ||
    lunar.year === null ||
    !leap ||
    (death.day !== null && death.month !== null && death.year !== null)
  ) {
    return death
  }
  const solar = lunarToSolar(lunar.year, lunar.month, lunar.day, true)
  return solar
    ? { day: solar.day, month: solar.month, year: solar.year }
    : death
}

function nullIfNaN(value: number | null): number | null {
  return Number.isNaN(value) ? null : value
}

// "Label: value" note lines, one per distinct non-empty value.
function labelled(label: string, values: string[]): string[] {
  const distinct = [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  return distinct.map((v) => `${label}: ${v}`)
}

// Reads one INDI record into a person with the given id.
export function readPerson(
  record: ParseRecord,
  id: string,
  ctx: PersonContext
): GedcomPerson {
  let nameValue: string | null = null
  let surname: string | null = null
  let givenName: string | null = null
  let famc = ''
  let gender: 'male' | 'female' | 'other' = 'other'
  let is_deceased = false
  let birth: SolarDate = { day: null, month: null, year: null }
  let death: SolarDate = { day: null, month: null, year: null }
  let birthDayMonth: DayMonth | null = null
  let deathDayMonth: DayMonth | null = null
  const noteReader = createNoteReader(ctx.noteTexts, ctx.stats)
  let burialPlace: string | null = null
  let deathLunar: LunarDate | null = null
  let deathLunarLeap = false
  let generation: number | null = null
  let birthOrder: number | null = null
  let isInLaw = false
  const otherNames: string[] = []
  const rangeNotes: string[] = []
  const pedigreeNotes: string[] = []
  // Places of birth/death and occupations have no column: kept as note lines.
  const birthPlaces: string[] = []
  const deathPlaces: string[] = []
  const occupations: string[] = []

  let currentTag = ''

  for (const line of record.lines) {
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
          const other = readName(val, null, null, ctx.surnameFirst)
          if (other) otherNames.push(other)
        } else nameValue = val
      } else if (tag === 'FAMC') {
        famc = val.match(/^@([^@]+)@/)?.[1] ?? ''
      } else if (tag === 'SEX') {
        if (val === 'M') gender = 'male'
        else if (val === 'F') gender = 'female'
      } else if (tag === 'DEAT') {
        is_deceased = val.trim().length === 0 || val === 'Y'
      } else if (tag === 'NOTE') {
        noteReader.start(val)
      } else if (tag === '_GEN' || tag === '_ORDER') {
        const n = /^\d+$/.test(val) ? parseInt(val) : null
        if (tag === '_GEN') generation = n
        else birthOrder = n
      } else if (tag === '_INLAW') {
        isInLaw = val.toUpperCase() === 'Y'
      } else if (tag === 'OCCU') {
        occupations.push(val)
      }
    } else if (level === 2) {
      if (currentTag === 'NAME' && tag === 'SURN') {
        surname = val.trim() || null
      } else if (currentTag === 'NAME' && tag === 'GIVN') {
        givenName = val.trim() || null
      } else if (currentTag === 'FAMC' && tag === 'PEDI') {
        const pedi = val.trim().toUpperCase()
        if (famc && ADOPTED_PEDIGREES.has(pedi)) {
          ctx.adoptedLinks.add(`${record.id} ${famc}`)
          // Foster, step and sealing children are stored as adopted; the
          // note keeps which kind they were.
          if (pedi !== 'ADOPTED')
            pedigreeNotes.push(`Con nuôi (${pedi.toLowerCase()})`)
        }
      } else if (currentTag === 'NOTE') {
        noteReader.continue(tag, val)
      } else if (currentTag === 'OCCU' && (tag === 'CONC' || tag === 'CONT')) {
        const last = occupations.length - 1
        occupations[last] += (tag === 'CONT' ? ' ' : '') + val
      } else if (currentTag === 'BIRT' && tag === 'PLAC') {
        if (val) birthPlaces.push(val)
      } else if (currentTag === 'DEAT' && tag === 'PLAC') {
        if (val) {
          deathPlaces.push(val)
          is_deceased = true
        }
      } else if (currentTag === 'BIRT' && tag === 'DATE') {
        const date = parseGedcomDate(val)
        birth = { day: date.day, month: date.month, year: date.year }
        if (date.rangeText) rangeNotes.push(`BIRT: ${date.rangeText}`)
      } else if (currentTag === 'DEAT' && tag === 'DATE') {
        is_deceased = true
        const date = parseGedcomDate(val)
        death = { day: date.day, month: date.month, year: date.year }
        if (date.rangeText) rangeNotes.push(`DEAT: ${date.rangeText}`)
      } else if (currentTag === 'BIRT' && tag === '_DATEDM') {
        birthDayMonth = parseDayMonth(val)
      } else if (currentTag === 'DEAT' && tag === '_DATEDM') {
        deathDayMonth = parseDayMonth(val)
        if (deathDayMonth) is_deceased = true
      } else if (currentTag === 'BURI' && tag === 'PLAC') {
        // A burial means the person has died.
        if (val) {
          burialPlace = val
          is_deceased = true
        }
      } else if (currentTag === 'DEAT' && tag === '_LUNAR') {
        // `<day> <month> [<year>] [LEAP]`: the year may be unknown.
        const match = val.match(/^(\d+)\s+(\d+)(?:\s+(\d+))?(?:\s+(LEAP))?$/i)
        const day = match ? parseInt(match[1]) : NaN
        const month = match ? parseInt(match[2]) : NaN
        const year = match?.[3] ? parseInt(match[3]) : null
        if (
          day >= 1 &&
          day <= 30 &&
          month >= 1 &&
          month <= 12 &&
          (year === null || year > 0)
        ) {
          deathLunar = { day, month, year }
          deathLunarLeap = year !== null && match?.[4] !== undefined
        }
      }
    }
  }

  // A range keeps only its first date and an impossible day is dropped:
  // keep the original text in the note.
  const notes = [
    ...noteReader.notes,
    ...sourceNotes(record.lines, ctx.sourTexts)
  ]
  let note = notes.filter((n) => n.trim()).join('\n\n')
  // A line the note already has (a file exported by this app and edited
  // elsewhere) is not added twice.
  const noteLines = new Set(note.split('\n'))
  const factNotes = [
    ...new Set(rangeNotes),
    ...new Set(pedigreeNotes),
    ...labelled('Nơi sinh', birthPlaces),
    ...labelled('Nơi mất', deathPlaces),
    ...labelled('Nghề nghiệp', occupations)
  ].filter((line) => !noteLines.has(line))
  if (factNotes.length > 0) {
    note = [note, ...factNotes].filter(Boolean).join('\n')
  }

  birth = withDayMonth(birth, birthDayMonth)
  death = withDayMonth(death, deathDayMonth)
  death = leapDeathDate(death, deathLunar, deathLunarLeap)

  let fullName = readName(nameValue, surname, givenName, ctx.surnameFirst)
  if (!fullName) {
    ctx.stats.unnamed++
    fullName = ctx.unnamedName
  }

  return {
    id,
    full_name: fullName,
    gender,
    is_deceased,
    birth_day: nullIfNaN(birth.day),
    birth_month: birth.month,
    birth_year: nullIfNaN(birth.year),
    death_day: nullIfNaN(death.day),
    death_month: death.month,
    death_year: nullIfNaN(death.year),
    death_lunar_day: deathLunar?.day ?? null,
    death_lunar_month: deathLunar?.month ?? null,
    death_lunar_year: deathLunar?.year ?? null,
    other_names: otherNames.length > 0 ? otherNames.join(', ') : null,
    is_in_law: isInLaw,
    birth_order: birthOrder,
    generation,
    avatar_url: null,
    note: note.length > 0 ? note : null,
    burial_place: burialPlace
  }
}
