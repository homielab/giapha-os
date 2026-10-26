/** Placeholder term when no relation is found; the UI shows its own text. */
export const UNKNOWN_TERM = ''

export type KinshipSide = 'paternal' | 'maternal'

export type Gender = 'male' | 'female' | 'other'

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
  | { kind: 'viaBothSpouses'; nameA: string; nameB: string }
  | { kind: 'none' }
) & { commonAncestor?: string | null }

/** One step of the relation path, as data. */
export type KinshipPathStep =
  | {
      kind: 'generations'
      name: string
      ancestor: string | null
      depth: number
    }
  | { kind: 'spouses'; nameA: string; nameB: string }
  | {
      kind: 'spouseOf'
      name: string
      spouse: string
      spouseRole: 'husband' | 'wife'
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
  birth_order: number | null
  generation: number | null
  is_in_law: boolean
}

export interface RelEdge {
  type: 'marriage' | 'biological_child' | 'adopted_child' | string
  person_a: string
  person_b: string
}
