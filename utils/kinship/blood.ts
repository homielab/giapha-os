import { findLca, getAncestryData, type KinshipGraph } from './graph'
import {
  ancestorTitle,
  DESCENDANTS,
  getDirectAncestorTerm,
  getDirectDescendantTerm,
  joinAlternatives
} from './terms'
import {
  byGenderOf,
  genderBranch,
  type Gender,
  type KinshipDescription,
  type KinshipPathStep,
  type KinshipSide,
  type KinshipTerms,
  type PersonNode
} from './types'

type Seniority = 'senior' | 'junior' | 'equal' | 'unknown'

/** By birth order, when both have one and they differ. */
function byBirthOrder(a: PersonNode, b: PersonNode): Seniority {
  if (a.birth_order == null || b.birth_order == null) return 'unknown'
  if (a.birth_order < b.birth_order) return 'senior'
  if (a.birth_order > b.birth_order) return 'junior'
  return 'unknown'
}

/**
 * By birth date from the year down: a month only when both years are known
 * and equal, a day only when both months are too.
 */
function byBirthDate(a: PersonNode, b: PersonNode): Seniority {
  const dateKeys: [number | null | undefined, number | null | undefined][] = [
    [a.birth_year, b.birth_year],
    [a.birth_month, b.birth_month],
    [a.birth_day, b.birth_day]
  ]
  for (const [x, y] of dateKeys) {
    if (x == null || y == null) return 'unknown'
    if (x < y) return 'senior'
    if (x > y) return 'junior'
  }
  return 'unknown'
}

/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ).
 * Full siblings (`sameParents`): birth order first, then the birth date.
 * Otherwise (half siblings, step siblings, the heads of two branches) the
 * birth date comes first, because each mother's children are often numbered
 * on their own; birth order only when the dates do not tell them apart.
 * The date goes year → month → day and stops at the first part one of them
 * lacks. When nothing tells them apart (missing data, or the same date such
 * as twins) the result is 'unknown'.
 */
export function compareSeniority(
  a: PersonNode,
  b: PersonNode,
  sameParents = true
): Seniority {
  if (a.id === b.id) return 'equal'
  const [first, second] = sameParents
    ? [byBirthOrder, byBirthDate]
    : [byBirthDate, byBirthOrder]
  const result = first(a, b)
  return result === 'unknown' ? second(a, b) : result
}

/** Both have the same recorded parents (birth or adoptive), at least one. */
export function shareAllParents(
  a: PersonNode,
  b: PersonNode,
  parentMap: Map<string, string[]>
): boolean {
  const parentsA = new Set(parentMap.get(a.id) ?? [])
  const parentsB = new Set(parentMap.get(b.id) ?? [])
  return (
    parentsA.size > 0 &&
    parentsA.size === parentsB.size &&
    [...parentsA].every((id) => parentsB.has(id))
  )
}

/** Marks the result as a guess about who is older, naming the two people to fill in. */
function uncertain(
  description: KinshipDescription,
  a: PersonNode,
  b: PersonNode
): KinshipDescription {
  return {
    ...description,
    uncertain: true,
    uncertainPeople: [
      { id: a.id, name: a.full_name },
      { id: b.id, name: b.full_name }
    ]
  }
}

/** Nội for a man, Ngoại for a woman, unknown for gender 'other'. */
function sideOf(parent: PersonNode): KinshipSide {
  const branch = genderBranch(parent.gender)
  return branch === 'male'
    ? 'paternal'
    : branch === 'female'
      ? 'maternal'
      : 'unknown'
}

/**
 * Bên Nội/Ngoại của người trẻ: theo cha/mẹ trực tiếp của họ trên đường lên tổ
 * chung (`path[1]`), hoặc chính tổ chung khi chỉ cách một đời.
 */
function lineSide(path: PersonNode[], lca: PersonNode): KinshipSide {
  return sideOf(path[1] ?? lca)
}

/** Siblings: Anh trai / Chị gái, Em trai / Em gái; gender 'other' Anh/Chị, Em. */
function siblingTerm(gender: Gender, rank: 'older' | 'younger' | 'unknown') {
  if (rank === 'older')
    return byGenderOf(gender, 'Anh trai', 'Chị gái', 'Anh/Chị')
  if (rank === 'younger') return byGenderOf(gender, 'Em trai', 'Em gái', 'Em')
  return byGenderOf(gender, 'Anh/Em trai', 'Chị/Em gái', 'Anh/Chị/Em')
}

/**
 * B, a sibling of A's parent (or of an ancestor of the same generation):
 * Bác/Chú/Cô on the Nội side by who is older, Cậu/Dì on the Ngoại side, both
 * lists when the side is not known.
 */
function uncleAuntTerm(
  side: KinshipSide,
  seniority: Seniority,
  gender: Gender
): string {
  const paternal =
    seniority === 'unknown'
      ? byGenderOf(gender, 'Bác/Chú', 'Bác/Cô', 'Bác/Chú/Cô')
      : seniority === 'junior'
        ? 'Bác'
        : byGenderOf(gender, 'Chú', 'Cô', 'Chú/Cô')
  const maternal = byGenderOf(gender, 'Cậu', 'Dì', 'Cậu/Dì')
  if (side === 'paternal') return paternal
  if (side === 'maternal') return maternal
  return joinAlternatives(paternal, maternal)
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B
 */
export function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[], // Từ A lên tới LCA (không bao gồm LCA)
  pathB: PersonNode[], // Từ B lên tới LCA (không bao gồm LCA)
  // Whether two children of the common ancestor have the same parents
  sameParents: (x: PersonNode, y: PersonNode) => boolean = () => true
): [string, string, KinshipDescription] {
  const genderA = personA.gender
  const genderB = personB.gender

  // 1. QUAN HỆ TRỰC HỆ (A là con cháu B hoặc ngược lại)
  if (depthA === 0) {
    // A chính là LCA. B là con cháu của A.
    // Xác định vế Nội/Ngoại của B đối với A: Dựa vào người con đầu tiên của A trên đường tới B
    const firstChildOfA = pathB[pathB.length - 1]
    if (!firstChildOfA) return ['Hậu duệ', 'Tiền bối', { kind: 'direct' }]

    const side = lineSide(pathB, personA)

    const bCallsA = getDirectAncestorTerm(depthB, genderA, side)
    const aCallsB = getDirectDescendantTerm(depthB)
    return [aCallsB, bCallsA, { kind: 'direct' }]
  }

  if (depthB === 0) {
    // B chính là LCA. A là con cháu của B.
    const firstChildOfB = pathA[pathA.length - 1]
    if (!firstChildOfB) return ['Tiền bối', 'Hậu duệ', { kind: 'direct' }]

    const side = lineSide(pathA, personB)

    const aCallsB = getDirectAncestorTerm(depthA, genderB, side)
    const bCallsA = getDirectDescendantTerm(depthA)
    return [aCallsB, bCallsA, { kind: 'direct' }]
  }

  // 2. QUAN HỆ NGANG HÀNG (Anh chị em ruột hoặc họ hàng)
  const branchA = pathA[pathA.length - 1] // Con của LCA phía A
  const branchB = pathB[pathB.length - 1] // Con của LCA phía B

  if (!branchA || !branchB)
    return ['Họ hàng', 'Họ hàng', { kind: 'relativesGeneric' }]

  const seniority = compareSeniority(
    branchA,
    branchB,
    sameParents(branchA, branchB)
  )
  const withSeniority = (description: KinshipDescription, isGuess: boolean) =>
    isGuess ? uncertain(description, branchA, branchB) : description

  // Bên Nội/Ngoại của A: theo cha/mẹ trực tiếp của A trên đường lên tổ chung
  const sideA = lineSide(pathA, branchA)

  // Anh chị em ruột (Cùng bố mẹ)
  if (depthA === 1 && depthB === 1) {
    if (seniority === 'unknown') {
      return [
        siblingTerm(genderB, 'unknown'),
        siblingTerm(genderA, 'unknown'),
        uncertain({ kind: 'siblings' }, personA, personB)
      ]
    }
    if (seniority === 'senior') {
      return [
        siblingTerm(genderB, 'younger'),
        siblingTerm(genderA, 'older'),
        { kind: 'siblings' }
      ]
    } else {
      return [
        siblingTerm(genderB, 'older'),
        siblingTerm(genderA, 'younger'),
        { kind: 'siblings' }
      ]
    }
  }

  // Chú/Bác/Cô/Cậu/Dì (Vế trên - Vế dưới)
  if (depthA > 1 && depthB === 1) {
    // B là anh/chị/em của tổ tiên A
    // Danh xưng theo người cùng đời với B trên nhánh A (ông nội/bà nội → Chú/Cô
    // hay Cậu/Dì); bên Nội/Ngoại theo cha/mẹ của A.
    const branchSide = sideOf(branchA)
    const termForB = uncleAuntTerm(branchSide, seniority, genderB)

    // Nếu cách nhiều đời (ví dụ B là anh của ông nội)
    let prefix = ''
    if (depthA === 3) prefix = byGenderOf(genderB, 'Ông ', 'Bà ', 'Ông/Bà ')
    else if (depthA === 4)
      prefix = byGenderOf(genderB, 'Cụ ông ', 'Cụ bà ', 'Cụ ông/bà ')
    else if (depthA > 4) prefix = ancestorTitle(depthA - 1) + ' '

    return [
      (prefix + termForB).trim(),
      // Collateral grandchildren are 'Cháu' (Chắt/Chít only for direct
      // descendants); past the term table keep 'Cháu đời N'.
      depthA >= DESCENDANTS.length ? getDirectDescendantTerm(depthA) : 'Cháu',
      withSeniority(
        { kind: 'upperBranch', side: sideA },
        branchSide !== 'maternal' && seniority === 'unknown'
      )
    ]
  }

  // Ngược lại của trường hợp trên
  if (depthA === 1 && depthB > 1) {
    const [bCallsA, aCallsB, desc] = resolveBloodTerms(
      depthB,
      depthA,
      personB,
      personA,
      pathB,
      pathA,
      sameParents
    )
    return [aCallsB, bCallsA, desc]
  }

  // Anh em họ (Cùng thế hệ hoặc lệch thế hệ nhưng không trực hệ)
  if (depthA > 1 && depthB > 1) {
    const side = sideA

    if (depthA === depthB) {
      // Cùng thế hệ
      const unsure = (gender: Gender) =>
        byGenderOf(gender, 'Anh/Em họ', 'Chị/Em họ', 'Anh/Chị/Em họ')
      const older = (gender: Gender) =>
        byGenderOf(gender, 'Anh họ', 'Chị họ', 'Anh/Chị họ')
      if (seniority === 'unknown') {
        return [
          unsure(genderB),
          unsure(genderA),
          uncertain({ kind: 'cousins', side }, branchA, branchB)
        ]
      }
      if (seniority === 'senior') {
        return ['Em họ', older(genderA), { kind: 'cousins', side }]
      } else {
        return [older(genderB), 'Em họ', { kind: 'cousins', side }]
      }
    } else {
      // Lệch thế hệ
      const genDiff = depthA - depthB
      if (genDiff > 0) {
        // B ở vế trên
        // B cùng đời với cha/mẹ của A: Bác/Chú/Cô họ hay Cậu/Dì họ
        const termForB =
          genDiff === 1
            ? `${uncleAuntTerm(side, seniority, genderB)} họ`
            : byGenderOf(genderB, 'Ông họ', 'Bà họ', 'Ông/Bà họ')
        return [
          termForB,
          'Cháu họ',
          withSeniority(
            { kind: 'relatives', side },
            genDiff === 1 && side !== 'maternal' && seniority === 'unknown'
          )
        ]
      } else {
        const [bCallsA, aCallsB, desc] = resolveBloodTerms(
          depthB,
          depthA,
          personB,
          personA,
          pathB,
          pathA,
          sameParents
        )
        return [aCallsB, bCallsA, desc]
      }
    }
  }

  return ['Người trong họ', 'Người trong họ', { kind: 'relativesGeneric' }]
}

export function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  { personsMap, parentMap }: Pick<KinshipGraph, 'personsMap' | 'parentMap'>
): KinshipTerms | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap)
  const ancB = getAncestryData(personB.id, parentMap, personsMap)

  const lca = findLca(ancA, ancB)
  if (!lca) return null
  const { id: lcaId, distance: minDistance } = lca

  const dataA = ancA.get(lcaId)!
  const dataB = ancB.get(lcaId)!

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
    (x, y) => shareAllParents(x, y, parentMap)
  )

  const lcaName = personsMap.get(lcaId)?.full_name ?? null
  const pathParts: KinshipPathStep[] = []
  if (personA.id !== lcaId) {
    pathParts.push({
      kind: 'generations',
      name: personA.full_name,
      ancestor: lcaName,
      depth: dataA.depth
    })
  }
  if (personB.id !== lcaId) {
    pathParts.push({
      kind: 'generations',
      name: personB.full_name,
      ancestor: lcaName,
      depth: dataB.depth
    })
  }

  return {
    aCallsB,
    bCallsA,
    description: { ...description, commonAncestor: lcaName },
    distance: minDistance,
    pathLabels: pathParts
  }
}
