import { findBloodKinship } from './blood'
import { buildKinshipGraph, type KinshipGraph } from './graph'
import {
  callSpouseRelative,
  termForSpouseOfRelative,
  termRelativeCallsInLaw
} from './terms'
import {
  isAmbiguousTerm,
  UNKNOWN_TERM,
  type KinshipPathStep,
  type KinshipResult,
  type KinshipTerms,
  type PersonNode,
  type RelEdge
} from './types'

function spouseStep(person: PersonNode, spouse: PersonNode): KinshipPathStep {
  return {
    kind: 'spouseOf',
    name: person.full_name,
    spouse: spouse.full_name,
    spouseRole: person.gender === 'male' ? 'husband' : 'wife'
  }
}

/** A is married to someone related by blood to B. */
function viaSpouseOfA(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  for (const sId of graph.spouseMap.get(personA.id) ?? []) {
    if (sId === personB.id) continue // Đã xử lý ở bước 0
    const spouseA = graph.personsMap.get(sId)
    if (!spouseA) continue
    const res = findBloodKinship(spouseA, personB, graph)
    if (!res) continue

    // A gọi người trong họ của vợ/chồng mình; họ gọi A là dâu/rể.
    const suffix = personA.gender === 'male' ? ' vợ' : ' chồng'
    return {
      ...res,
      aCallsB: callSpouseRelative(res.aCallsB, suffix, true),
      bCallsA: termRelativeCallsInLaw(res.bCallsA, personA.gender),
      description: { kind: 'viaSpouse', name: spouseA.full_name },
      pathLabels: [spouseStep(personA, spouseA), ...res.pathLabels]
    }
  }
  return null
}

/** B is married to someone related by blood to A. */
function viaSpouseOfB(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  for (const sId of graph.spouseMap.get(personB.id) ?? []) {
    const spouseB = graph.personsMap.get(sId)
    if (!spouseB) continue
    const res = findBloodKinship(personA, spouseB, graph)
    if (!res) continue

    const suffix = personB.gender === 'male' ? ' vợ' : ' chồng'
    return {
      ...res,
      aCallsB: termForSpouseOfRelative(res.aCallsB, personB.gender),
      bCallsA: callSpouseRelative(res.bCallsA, suffix, false),
      description: { kind: 'viaSpouse', name: spouseB.full_name },
      pathLabels: [...res.pathLabels, spouseStep(personB, spouseB)]
    }
  }
  return null
}

/** Both are married, and their spouses are related by blood. */
function viaBothSpouses(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  const spousesB = graph.spouseMap.get(personB.id) ?? []
  for (const sIdA of graph.spouseMap.get(personA.id) ?? []) {
    const spouseA = graph.personsMap.get(sIdA)
    if (!spouseA) continue
    for (const sIdB of spousesB) {
      if (sIdA === sIdB) continue
      const spouseB = graph.personsMap.get(sIdB)
      if (!spouseB) continue

      const res = findBloodKinship(spouseA, spouseB, graph)
      if (!res) continue

      // res trả về cách gọi người thân của vợ/chồng mình (spouse) nên đổi ngôi
      const prefixA = personA.gender === 'male' ? 'Chồng' : 'Vợ'
      const prefixB = personB.gender === 'male' ? 'Chồng' : 'Vợ'

      let aCallsB = `${prefixB} của ${res.aCallsB}`
      let bCallsA = `${prefixA} của ${res.bCallsA}`

      // Đặc biệt: Anh em cột chèo / Chị em dâu (nếu spouseA và spouseB là anh chị em ruột)
      if (res.description.kind === 'siblings') {
        if (
          personA.gender === 'male' &&
          personB.gender === 'male' &&
          spouseA.gender === 'female' &&
          spouseB.gender === 'female'
        ) {
          aCallsB = 'Anh em cột chèo'
          bCallsA = 'Anh em cột chèo'
        } else if (
          personA.gender === 'female' &&
          personB.gender === 'female' &&
          spouseA.gender === 'male' &&
          spouseB.gender === 'male'
        ) {
          aCallsB = 'Chị em dâu'
          bCallsA = 'Chị em dâu'
        }
      }

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: {
          kind: 'viaBothSpouses',
          nameA: spouseA.full_name,
          nameB: spouseB.full_name
        },
        pathLabels: [
          spouseStep(personA, spouseA),
          ...res.pathLabels,
          spouseStep(personB, spouseB)
        ]
      }
    }
  }
  return null
}

function resolveKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[]
): KinshipTerms | null {
  if (personA.id === personB.id) return null

  const graph = buildKinshipGraph(persons, relationships)

  // 0. Kiểm tra quan hệ hôn nhân trực tiếp
  if ((graph.spouseMap.get(personA.id) ?? []).includes(personB.id)) {
    return {
      aCallsB: personB.gender === 'female' ? 'Vợ' : 'Chồng',
      bCallsA: personA.gender === 'female' ? 'Vợ' : 'Chồng',
      description: { kind: 'marriage' },
      distance: 0,
      pathLabels: [
        { kind: 'spouses', nameA: personA.full_name, nameB: personB.full_name }
      ]
    }
  }

  return (
    // 1. Kiểm tra quan hệ huyết thống
    findBloodKinship(personA, personB, graph) ??
    // 2. Thông qua hôn nhân của A
    viaSpouseOfA(personA, personB, graph) ??
    // 3. Thông qua hôn nhân của B
    viaSpouseOfB(personA, personB, graph) ??
    // 4. Thông qua cả hôn nhân của A và B
    viaBothSpouses(personA, personB, graph) ?? {
      aCallsB: UNKNOWN_TERM,
      bCallsA: UNKNOWN_TERM,
      description: { kind: 'none' },
      distance: -1,
      pathLabels: []
    }
  )
}

export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[]
): KinshipResult | null {
  const terms = resolveKinship(personA, personB, persons, relationships)
  if (!terms) return null
  return {
    ...terms,
    hasAmbiguousTerm: isAmbiguousTerm(terms.aCallsB)
  }
}
