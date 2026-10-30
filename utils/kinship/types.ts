/** Placeholder term when no relation is found; the UI shows its own text. */
export const UNKNOWN_TERM = ''

/** 'unknown': the parent on the way up has gender 'other', so Nội or Ngoại is not known. */
export type KinshipSide = 'paternal' | 'maternal' | 'unknown'

export type Gender = 'male' | 'female' | 'other'

/** 'neutral' for 'other' (or anything not recorded as male or female). */
export function genderBranch(gender: Gender): 'male' | 'female' | 'neutral' {
  if (gender === 'male') return 'male'
  if (gender === 'female') return 'female'
  return 'neutral'
}

/**
 * The term for the person's gender; `neutral` for gender 'other' lists both
 * forms ("Bố/Mẹ"), so isAmbiguousTerm flags it.
 */
export function byGenderOf<T extends string>(
  gender: Gender,
  male: T,
  female: T,
  neutral: T
): T {
  const branch = genderBranch(gender)
  return branch === 'male' ? male : branch === 'female' ? female : neutral
}

/** What kind of relation was found; the UI turns it into a sentence. */
export type KinshipDescription = (
  | { kind: 'direct' }
  | { kind: 'siblings' }
  | { kind: 'upperBranch'; side: KinshipSide }
  | { kind: 'cousins'; side: KinshipSide }
  | { kind: 'relatives'; side: KinshipSide }
  | { kind: 'relativesGeneric' }
  | { kind: 'marriage' }
  | { kind: 'viaSpouse'; name: string }
  /** B married A's parent `name`, who is not B's parent: Bố dượng, Mẹ kế. */
  | { kind: 'stepParent'; name: string }
  /** B is the child of A's spouse `name`, not A's own: Con riêng. */
  | { kind: 'stepChild'; name: string }
  /**
   * `spouse` is married to the grandparent or older ancestor `ancestor`, whose
   * child on the line, `child`, has no other parent recorded: `spouse` gets the
   * direct term ("Bà nội"), but may be a second spouse rather than the
   * unlinked parent of `child`.
   */
  | {
      kind: 'spouseOfAncestor'
      ancestor: string
      spouse: string
      role: 'wife' | 'husband' | 'spouse'
      child: KinshipPersonRef
    }
  | { kind: 'viaBothSpouses'; nameA: string; nameB: string }
  /** A's child `childA` is married to B's child `childB`: thông gia. */
  | { kind: 'coParentsInLaw'; childA: string; childB: string }
  /** A's parent `parent` married B's parent `stepParent`; no shared parent. */
  | { kind: 'stepSiblings'; parent: string; stepParent: string }
  /** A and B are both married to `name` (wives, husbands, or spouses when `name` has gender 'other'). */
  | {
      kind: 'coSpouses'
      name: string
      role: 'wives' | 'husbands' | 'spouses'
    }
  | { kind: 'none' }
) & {
  commonAncestor?: string | null
  /** Nobody knows who is older (no birth order or year): the term lists both. */
  uncertain?: boolean
  /** The two people whose birth order or year would settle it. */
  uncertainPeople?: [KinshipPersonRef, KinshipPersonRef]
}

export interface KinshipPersonRef {
  id: string
  name: string
}

/** One step of the relation path, as data. */
export type KinshipPathStep =
  | {
      kind: 'generations'
      name: string
      ancestor: string | null
      depth: number
    }
  | { kind: 'spouses'; nameA: string; nameB: string }
  | { kind: 'childOf'; name: string; parent: string }
  | {
      kind: 'spouseOf'
      name: string
      spouse: string
      spouseRole: 'husband' | 'wife' | 'spouse'
    }

export interface KinshipTerms {
  /** Person A gọi Person B là gì */
  aCallsB: string
  /** Person B gọi Person A là gì */
  bCallsA: string
  /** Mô tả chi tiết nhánh quan hệ (mã + tham số, UI dịch) */
  description: KinshipDescription
  /** Số bậc cách nhau */
  distance: number
  /** Các bước quan hệ chi tiết */
  pathLabels: KinshipPathStep[]
}

export interface KinshipResult extends KinshipTerms {
  /** Cách gọi chung chung ("Họ hàng") hoặc nhiều cách ("Bố/Mẹ"): cần lưu ý */
  hasAmbiguousTerm: boolean
  /** A or B has gender 'other', so a term lists the male and female forms. */
  hasNeutralGender: boolean
}

/** True for a term that offers several alternatives or is only "Họ hàng". */
export function isAmbiguousTerm(term: string): boolean {
  return term.includes('/') || term.toLowerCase().includes('họ hàng')
}

export interface PersonNode {
  id: string
  full_name: string
  gender: Gender
  birth_year: number | null
  birth_month?: number | null
  birth_day?: number | null
  birth_order: number | null
  generation: number | null
  is_in_law: boolean
}

export interface RelEdge {
  type: 'marriage' | 'biological_child' | 'adopted_child' | string
  person_a: string
  person_b: string
}
