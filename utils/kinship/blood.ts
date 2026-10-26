import { findLca, getAncestryData, type KinshipGraph } from './graph'
import {
  ancestorTitle,
  getDirectAncestorTerm,
  getDirectDescendantTerm
} from './terms'
import type {
  KinshipDescription,
  KinshipPathStep,
  KinshipSide,
  KinshipTerms,
  PersonNode
} from './types'

/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ)
 * Ưu tiên: Thứ tự sinh (birth_order) -> Năm sinh (birth_year)
 */
function compareSeniority(
  a: PersonNode,
  b: PersonNode
): 'senior' | 'junior' | 'equal' {
  if (a.id === b.id) return 'equal'

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return 'senior'
    if (a.birth_order > b.birth_order) return 'junior'
  }

  if (a.birth_year != null && b.birth_year != null) {
    if (a.birth_year < b.birth_year) return 'senior'
    if (a.birth_year > b.birth_year) return 'junior'
  }

  return 'equal'
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
  pathB: PersonNode[] // Từ B lên tới LCA (không bao gồm LCA)
): [string, string, KinshipDescription] {
  const genderA = personA.gender
  const genderB = personB.gender

  // 1. QUAN HỆ TRỰC HỆ (A là con cháu B hoặc ngược lại)
  if (depthA === 0) {
    // A chính là LCA. B là con cháu của A.
    // Xác định vế Nội/Ngoại của B đối với A: Dựa vào người con đầu tiên của A trên đường tới B
    const firstChildOfA = pathB[pathB.length - 1]
    if (!firstChildOfA) return ['Hậu duệ', 'Tiền bối', { kind: 'direct' }]

    const isPaternal = firstChildOfA.gender === 'male'

    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternal)
    const aCallsB = getDirectDescendantTerm(depthB)
    return [aCallsB, bCallsA, { kind: 'direct' }]
  }

  if (depthB === 0) {
    // B chính là LCA. A là con cháu của B.
    const firstChildOfB = pathA[pathA.length - 1]
    if (!firstChildOfB) return ['Tiền bối', 'Hậu duệ', { kind: 'direct' }]

    const isPaternal = firstChildOfB.gender === 'male'

    const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternal)
    const bCallsA = getDirectDescendantTerm(depthA)
    return [aCallsB, bCallsA, { kind: 'direct' }]
  }

  // 2. QUAN HỆ NGANG HÀNG (Anh chị em ruột hoặc họ hàng)
  const branchA = pathA[pathA.length - 1] // Con của LCA phía A
  const branchB = pathB[pathB.length - 1] // Con của LCA phía B

  if (!branchA || !branchB)
    return ['Họ hàng', 'Họ hàng', { kind: 'relativesGeneric' }]

  const seniority = compareSeniority(branchA, branchB)

  // Xác định vế Nội/Ngoại: Dựa vào giới tính của người ở nhánh A (người đang gọi)
  const isPaternalA = branchA.gender === 'male'

  // Anh chị em ruột (Cùng bố mẹ)
  if (depthA === 1 && depthB === 1) {
    const aSenior = compareSeniority(personA, personB)
    if (aSenior === 'senior') {
      return [
        genderB === 'female' ? 'Em gái' : 'Em trai',
        genderA === 'female' ? 'Chị gái' : 'Anh trai',
        { kind: 'siblings' }
      ]
    } else {
      return [
        genderB === 'female' ? 'Chị gái' : 'Anh trai',
        genderA === 'female' ? 'Em gái' : 'Em trai',
        { kind: 'siblings' }
      ]
    }
  }

  // Chú/Bác/Cô/Cậu/Dì (Vế trên - Vế dưới)
  if (depthA > 1 && depthB === 1) {
    // B là anh/chị/em của tổ tiên A
    let termForB = ''
    const isPaternalSide = branchA.gender === 'male'

    if (isPaternalSide) {
      // Bên Nội (Anh em của bố)
      if (genderB === 'female') {
        termForB = seniority === 'junior' ? 'Bác' : 'Cô'
      } else {
        termForB = seniority === 'junior' ? 'Bác' : 'Chú'
      }
    } else {
      // Bên Ngoại (Anh em của mẹ)
      if (genderB === 'female') {
        termForB = 'Dì'
      } else {
        termForB = 'Cậu'
      }
    }

    // Nếu cách nhiều đời (ví dụ B là anh của ông nội)
    let prefix = ''
    if (depthA === 3) prefix = genderB === 'female' ? 'Bà ' : 'Ông '
    else if (depthA === 4) prefix = genderB === 'female' ? 'Cụ bà ' : 'Cụ ông '
    else if (depthA > 4) prefix = ancestorTitle(depthA - 1) + ' '

    return [
      (prefix + termForB).trim(),
      getDirectDescendantTerm(depthA),
      { kind: 'upperBranch', side: isPaternalSide ? 'paternal' : 'maternal' }
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
      pathA
    )
    return [aCallsB, bCallsA, desc]
  }

  // Anh em họ (Cùng thế hệ hoặc lệch thế hệ nhưng không trực hệ)
  if (depthA > 1 && depthB > 1) {
    const side: KinshipSide = isPaternalA ? 'paternal' : 'maternal'

    if (depthA === depthB) {
      // Cùng thế hệ
      if (seniority === 'senior') {
        return [
          'Em họ',
          genderA === 'female' ? 'Chị họ' : 'Anh họ',
          { kind: 'cousins', side }
        ]
      } else {
        return [
          genderB === 'female' ? 'Chị họ' : 'Anh họ',
          'Em họ',
          { kind: 'cousins', side }
        ]
      }
    } else {
      // Lệch thế hệ
      const genDiff = depthA - depthB
      if (genDiff > 0) {
        // B ở vế trên
        let termForB = 'Họ hàng'
        if (genDiff === 1) {
          const isPaternalSide = branchA.gender === 'male'
          if (isPaternalSide) {
            termForB =
              genderB === 'female'
                ? seniority === 'junior'
                  ? 'Bác họ'
                  : 'Cô họ'
                : seniority === 'junior'
                  ? 'Bác họ'
                  : 'Chú họ'
          } else {
            termForB = genderB === 'female' ? 'Dì họ' : 'Cậu họ'
          }
        } else {
          termForB = genderB === 'female' ? 'Bà họ' : 'Ông họ'
        }
        return [termForB, 'Cháu họ', { kind: 'relatives', side }]
      } else {
        const [bCallsA, aCallsB, desc] = resolveBloodTerms(
          depthB,
          depthA,
          personB,
          personA,
          pathB,
          pathA
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
    dataB.path
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
