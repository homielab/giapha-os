import type { Gender } from './types'

// ── Direct line (trực hệ) ───────────────────────────────────────────────────

export const ANCESTORS = [
  '',
  'Bố/Mẹ',
  'Ông/Bà',
  'Cụ',
  'Kỵ',
  'Sơ',
  'Tiệm',
  'Tiểu',
  'Di',
  'Diễn'
]
export const DESCENDANTS = [
  '',
  'Con',
  'Cháu',
  'Chắt',
  'Chít',
  'Chút',
  'Chét',
  'Chót',
  'Chẹt'
]

/**
 * Danh xưng của tổ tiên theo đời; quá bảng thì 'Tổ đời N'
 */
export function ancestorTitle(depth: number): string {
  return ANCESTORS[depth] || `Tổ đời ${depth}`
}

/**
 * Lấy danh xưng trực hệ vế trên
 */
export function getDirectAncestorTerm(
  depth: number,
  gender: Gender,
  isPaternal: boolean
): string {
  if (depth === 1) return gender === 'female' ? 'Mẹ' : 'Bố'
  if (depth === 2) {
    const base = gender === 'female' ? 'Bà' : 'Ông'
    return `${base} ${isPaternal ? 'nội' : 'ngoại'}`
  }
  if (depth === 3) {
    const base = gender === 'female' ? 'Cụ bà (bà cố)' : 'Cụ ông (ông cố)'
    return `${base} ${isPaternal ? 'nội' : 'ngoại'}`
  }
  return ancestorTitle(depth)
}

/**
 * Lấy danh xưng trực hệ vế dưới
 */
export function getDirectDescendantTerm(depth: number): string {
  return DESCENDANTS[depth] || `Cháu đời ${depth}`
}

// ── Through marriage (thông gia) ────────────────────────────────────────────
//
// A relative's term (from a blood relation) maps to the term of the in-law
// relation by lookup tables instead of testing the text of the term.

const OLDER_GENERATION_WORDS = new Set(['Ông', 'Bà', 'Cụ'])

/** Bố, Mẹ, Ông…, Bà…, Cụ…: the generation above, kept as is when "vợ"/"chồng" is added. */
function isOlderGenerationTerm(term: string): boolean {
  return (
    term === 'Bố' ||
    term === 'Mẹ' ||
    OLDER_GENERATION_WORDS.has(term.split(' ')[0])
  )
}

/** "Anh", "Chị" or "Em" + the spouse suffix, for the siblings and cousins. */
const SIBLING_STEMS = new Map<string, string>([
  ['Anh trai', 'Anh'],
  ['Chị gái', 'Chị'],
  ['Em gái', 'Em'],
  ['Em trai', 'Em']
])
const COUSIN_STEMS = new Map<string, string>([
  ['Anh họ', 'Anh'],
  ['Chị họ', 'Chị'],
  ['Em họ', 'Em']
])
/** Aunts and uncles: kept, and the "họ" ones lose it when A calls B. */
const UNCLE_AUNT_TERMS = new Set(['Bác', 'Chú', 'Cô', 'Cậu', 'Dì'])
const UNCLE_AUNT_COUSIN_TERMS = new Set([
  'Bác họ',
  'Chú họ',
  'Cô họ',
  'Cậu họ',
  'Dì họ',
  'Cháu họ'
])

/**
 * How someone calls the blood relative `term` of their spouse: "Anh trai" of
 * the wife becomes "Anh vợ"; `suffix` is " vợ" or " chồng". `dropHo` strips
 * the "họ" of "Bác họ" (the form a person uses for their own spouse's side).
 */
export function callSpouseRelative(
  term: string,
  suffix: string,
  dropHo: boolean
): string {
  if (isOlderGenerationTerm(term)) return term + suffix
  const sibling = SIBLING_STEMS.get(term)
  if (sibling) return sibling + suffix
  const cousin = COUSIN_STEMS.get(term)
  if (cousin) return `${cousin}${suffix} (họ)`
  if (UNCLE_AUNT_TERMS.has(term)) return term + suffix
  if (UNCLE_AUNT_COUSIN_TERMS.has(term)) {
    return (dropHo ? term.replace(' họ', '') : term) + suffix
  }
  return term
}

/** One in-law term per gender of the person who married in (other follows female unless given). */
function byGender(male: string, female: string, other = female) {
  return { male, female, other }
}
type GenderTerms = ReturnType<typeof byGender>

const KEEP = (term: string) => byGender(term, term)

const IN_LAW_COMMON = new Map<string, GenderTerms>([
  ['Con', byGender('Con rể', 'Con dâu')],
  ['Cháu', byGender('Cháu rể', 'Cháu dâu')],
  ['Em gái', byGender('Em rể', 'Em dâu')],
  ['Em trai', byGender('Em rể', 'Em dâu')],
  ['Em họ', byGender('Em rể (họ)', 'Em dâu (họ)')],
  ['Chị họ', KEEP('Anh rể (họ)')],
  ['Anh họ', KEEP('Chị dâu (họ)')],
  ['Chú', KEEP('Cô')],
  ['Chú họ', KEEP('Thím họ')],
  ['Cô', KEEP('Chú')],
  ['Cậu', KEEP('Dì')],
  ['Dì', KEEP('Cậu')],
  ['Bà Cô', KEEP('Ông Dượng')],
  ['Ông Chú', KEEP('Bà Thím')],
  ['Ông Bác', KEEP('Bà Bác')]
])

/**
 * What a blood relative calls the person who married into the family (A's
 * relative calls A): the relative's term for A, as seen from the spouse's side.
 */
const IN_LAW_CALLED_BY_RELATIVE = new Map<string, GenderTerms>([
  ...IN_LAW_COMMON,
  ['Anh trai', byGender('Anh rể', 'Chị dâu')],
  ['Chị gái', byGender('Anh rể', 'Chị dâu')],
  ['Bác họ', KEEP('Bác họ')]
])

/**
 * What a person calls the spouse of their blood relative (A calls B, who is
 * married to A's relative). "Anh trai" is the husband for a wife.
 */
const SPOUSE_OF_RELATIVE = new Map<string, GenderTerms>([
  ...IN_LAW_COMMON,
  ['Anh trai', byGender('Anh rể', 'Chị dâu', 'Anh rể')],
  ['Chị gái', byGender('Anh rể', 'Chị dâu', 'Chị dâu')]
])

function lookupInLaw(
  table: Map<string, GenderTerms>,
  relativeTerm: string,
  gender: Gender
): string {
  const entry = table.get(relativeTerm)
  if (entry) return entry[gender]
  return `${gender === 'male' ? 'Chồng' : 'Vợ'} của ${relativeTerm}`
}

/** A's relative calls A, the person married to their kin: "Con" → "Con dâu". */
export function termRelativeCallsInLaw(
  relativeTerm: string,
  gender: Gender
): string {
  return lookupInLaw(IN_LAW_CALLED_BY_RELATIVE, relativeTerm, gender)
}

/** A calls B, the person married to A's kin: "Con" → "Con rể". */
export function termForSpouseOfRelative(
  relativeTerm: string,
  gender: Gender
): string {
  return lookupInLaw(SPOUSE_OF_RELATIVE, relativeTerm, gender)
}
