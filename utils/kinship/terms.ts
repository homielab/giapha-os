import { byGenderOf, type Gender, type KinshipSide } from './types'

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

const SIDE_SUFFIX: Record<KinshipSide, string> = {
  paternal: 'nội',
  maternal: 'ngoại',
  unknown: 'nội/ngoại'
}

/**
 * Lấy danh xưng trực hệ vế trên
 */
export function getDirectAncestorTerm(
  depth: number,
  gender: Gender,
  side: KinshipSide
): string {
  if (depth === 1) return byGenderOf(gender, 'Bố', 'Mẹ', 'Bố/Mẹ')
  if (depth === 2) {
    const base = byGenderOf(gender, 'Ông', 'Bà', 'Ông/Bà')
    return `${base} ${SIDE_SUFFIX[side]}`
  }
  if (depth === 3) {
    const base = byGenderOf(
      gender,
      'Cụ ông (ông cố)',
      'Cụ bà (bà cố)',
      'Cụ ông/bà (ông/bà cố)'
    )
    return `${base} ${SIDE_SUFFIX[side]}`
  }
  return ancestorTitle(depth)
}

/**
 * Ancestor term → the same term for each gender ("Ông nội" → "Bà nội"), from
 * the grandparents up; the spouse of a direct ancestor gets the direct term.
 */
const ANCESTOR_BY_GENDER = new Map<string, Record<Gender, string>>()
for (let depth = 2; depth < ANCESTORS.length; depth++) {
  for (const side of Object.keys(SIDE_SUFFIX) as KinshipSide[]) {
    const forms: Record<Gender, string> = {
      male: getDirectAncestorTerm(depth, 'male', side),
      female: getDirectAncestorTerm(depth, 'female', side),
      other: getDirectAncestorTerm(depth, 'other', side)
    }
    for (const term of Object.values(forms)) ANCESTOR_BY_GENDER.set(term, forms)
  }
}

/**
 * The direct term for the spouse of a grandparent or older ancestor, by the
 * spouse's gender ("Ông nội" → "Bà nội", "Kỵ" → "Kỵ"); null for any other term.
 */
export function termForSpouseOfAncestor(
  ancestorTerm: string,
  gender: Gender
): string | null {
  const forms = ANCESTOR_BY_GENDER.get(ancestorTerm)
  if (forms) return forms[gender]
  return /^Tổ đời \d+$/.test(ancestorTerm) ? ancestorTerm : null
}

/**
 * Both alternatives of two terms, without repeats: "Bác/Chú" and "Cậu" give
 * "Bác/Chú/Cậu" (used when Nội or Ngoại is not known).
 */
export function joinAlternatives(...terms: string[]): string {
  return [...new Set(terms.flatMap((term) => term.split('/')))].join('/')
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

/** "Anh", "Chị" or "Em" + the spouse suffix, for the siblings and cousins. */
const SIBLING_STEMS = new Map<string, string>([
  ['Anh trai', 'Anh'],
  ['Chị gái', 'Chị'],
  ['Em gái', 'Em'],
  ['Em trai', 'Em'],
  ['Anh/Em trai', 'Anh/Em'],
  ['Chị/Em gái', 'Chị/Em'],
  // Gender 'other'
  ['Anh/Chị', 'Anh/Chị'],
  ['Em', 'Em'],
  ['Anh/Chị/Em', 'Anh/Chị/Em']
])
const COUSIN_STEMS = new Map<string, string>([
  ['Anh họ', 'Anh'],
  ['Chị họ', 'Chị'],
  ['Em họ', 'Em'],
  ['Anh/Em họ', 'Anh/Em'],
  ['Chị/Em họ', 'Chị/Em'],
  ['Anh/Chị họ', 'Anh/Chị'],
  ['Anh/Chị/Em họ', 'Anh/Chị/Em']
])

/**
 * How someone calls the blood relative `term` of their spouse; `suffix` is
 * " vợ" or " chồng". Parents, siblings and cousins take the suffix ("Bố vợ",
 * "Anh vợ", "Chị chồng (họ)"); everyone else is called as the spouse calls
 * them ("Cô", "Ông nội", "Bác họ"), because "Cô vợ" means the wife herself.
 */
export function callSpouseRelative(term: string, suffix: string): string {
  if (term === 'Bố' || term === 'Mẹ' || term === 'Bố/Mẹ') return term + suffix
  const sibling = SIBLING_STEMS.get(term)
  if (sibling) return sibling + suffix
  const cousin = COUSIN_STEMS.get(term)
  if (cousin) return `${cousin}${suffix} (họ)`
  return term
}

/**
 * One in-law term per gender of the person who married in; gender 'other'
 * lists both ("Con dâu/Con rể") unless given.
 */
function byGender(male: string, female: string, other = `${female}/${male}`) {
  return { male, female, other }
}
type GenderTerms = ReturnType<typeof byGender>

/** The term follows the relative's gender, not the in-law's ("Chú" → "Thím"). */
const KEEP = (term: string) => byGender(term, term, term)

const IN_LAW_COMMON = new Map<string, GenderTerms>([
  // Descendants: "Con dâu", "Cháu rể", "Chắt dâu", … "Chẹt rể".
  ...DESCENDANTS.filter(Boolean).map(
    (term) => [term, byGender(`${term} rể`, `${term} dâu`)] as const
  ),
  ['Cháu họ', byGender('Cháu rể (họ)', 'Cháu dâu (họ)', 'Cháu dâu/rể (họ)')],
  ['Em gái', byGender('Em rể', 'Em dâu')],
  ['Em trai', byGender('Em rể', 'Em dâu')],
  ['Em họ', byGender('Em rể (họ)', 'Em dâu (họ)', 'Em dâu/rể (họ)')],
  ['Chị họ', KEEP('Anh rể (họ)')],
  ['Anh họ', KEEP('Chị dâu (họ)')],
  ['Bác', byGender('Bác', 'Bác gái')],
  ['Chú', KEEP('Thím')],
  ['Chú họ', KEEP('Thím họ')],
  ['Cô', KEEP('Dượng')],
  ['Cậu', KEEP('Mợ')],
  ['Dì', KEEP('Dượng')],
  ['Bà Cô', KEEP('Ông Dượng')],
  ['Ông Chú', KEEP('Bà Thím')],
  ['Ông Bác', KEEP('Bà Bác')],
  ['Bà Bác', KEEP('Ông Bác')],
  ['Ông Cậu', KEEP('Bà Mợ')],
  ['Bà Dì', KEEP('Ông Dượng')],
  ['Cậu họ', KEEP('Mợ họ')],
  ['Dì họ', KEEP('Dượng họ')],
  ['Cô họ', KEEP('Dượng họ')],
  // Relative age unknown (no birth data): both terms, joined by '/'.
  ['Anh/Em họ', KEEP('Chị/Em dâu (họ)')],
  ['Chị/Em họ', KEEP('Anh/Em rể (họ)')],
  ['Bác/Chú', byGender('Bác/Dượng', 'Bác gái/Thím', 'Bác/Thím/Dượng')],
  ['Bác/Cô', byGender('Bác/Dượng', 'Bác gái/Thím', 'Bác/Thím/Dượng')],
  [
    'Bác/Chú họ',
    byGender('Bác/Dượng họ', 'Bác gái/Thím họ', 'Bác/Thím/Dượng họ')
  ],
  [
    'Bác/Cô họ',
    byGender('Bác/Dượng họ', 'Bác gái/Thím họ', 'Bác/Thím/Dượng họ')
  ],
  // The relative has gender 'other': the in-law's own gender decides.
  ['Em', byGender('Em rể', 'Em dâu')],
  ['Anh/Chị', byGender('Anh rể', 'Chị dâu')],
  ['Anh/Chị/Em', byGender('Anh/Em rể', 'Chị/Em dâu', 'Dâu/Rể')],
  [
    'Anh/Chị họ',
    byGender('Anh rể (họ)', 'Chị dâu (họ)', 'Chị dâu/Anh rể (họ)')
  ],
  [
    'Anh/Chị/Em họ',
    byGender('Anh/Em rể (họ)', 'Chị/Em dâu (họ)', 'Dâu/Rể (họ)')
  ],
  ['Chú/Cô', byGender('Dượng', 'Thím')],
  ['Bác/Chú/Cô', byGender('Bác/Dượng', 'Bác gái/Thím', 'Bác/Thím/Dượng')],
  ['Cậu/Dì', byGender('Dượng', 'Mợ')],
  ['Chú/Cô họ', byGender('Dượng họ', 'Thím họ', 'Thím/Dượng họ')],
  [
    'Bác/Chú/Cô họ',
    byGender('Bác/Dượng họ', 'Bác gái/Thím họ', 'Bác/Thím/Dượng họ')
  ],
  ['Cậu/Dì họ', byGender('Dượng họ', 'Mợ họ', 'Mợ/Dượng họ')]
])

/**
 * What a blood relative calls the person who married into the family (A's
 * relative calls A): the relative's term for A, as seen from the spouse's side.
 */
const IN_LAW_CALLED_BY_RELATIVE = new Map<string, GenderTerms>([
  ...IN_LAW_COMMON,
  ['Anh trai', byGender('Anh rể', 'Chị dâu')],
  ['Chị gái', byGender('Anh rể', 'Chị dâu')],
  ['Bác họ', KEEP('Bác họ')],
  ['Anh/Em trai', byGender('Anh/Em rể', 'Chị/Em dâu', 'Dâu/Rể')],
  ['Chị/Em gái', byGender('Anh/Em rể', 'Chị/Em dâu', 'Dâu/Rể')]
])

/**
 * What a person calls the spouse of their blood relative (A calls B, who is
 * married to A's relative). "Anh trai" is the husband for a wife.
 */
const SPOUSE_OF_RELATIVE = new Map<string, GenderTerms>([
  ...IN_LAW_COMMON,
  ['Bác họ', byGender('Bác trai họ', 'Bác gái họ', 'Bác gái/trai họ')],
  ['Anh trai', byGender('Anh rể', 'Chị dâu')],
  ['Chị gái', byGender('Anh rể', 'Chị dâu')],
  ['Anh/Em trai', byGender('Anh/Em rể', 'Chị/Em dâu', 'Dâu/Rể')],
  ['Chị/Em gái', byGender('Anh/Em rể', 'Chị/Em dâu', 'Dâu/Rể')]
])

function lookupInLaw(
  table: Map<string, GenderTerms>,
  relativeTerm: string,
  gender: Gender
): string {
  const entry = table.get(relativeTerm)
  if (entry) return entry[gender]
  return `${byGenderOf(gender, 'Chồng', 'Vợ', 'Vợ/Chồng')} của ${relativeTerm}`
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
