import { compareSeniority, findBloodKinship } from './blood'
import { buildKinshipGraph, type KinshipGraph } from './graph'
import {
  callSpouseRelative,
  termForSpouseOfRelative,
  termRelativeCallsInLaw
} from './terms'
import {
  byGenderOf,
  genderBranch,
  isAmbiguousTerm,
  UNKNOWN_TERM,
  type Gender,
  type KinshipDescription,
  type KinshipPathStep,
  type KinshipResult,
  type KinshipTerms,
  type PersonNode,
  type RelEdge
} from './types'

/** The "who is older" guess of a blood relation survives going through a spouse. */
function carryUncertain({ uncertain, uncertainPeople }: KinshipDescription) {
  return uncertain ? { uncertain, uncertainPeople } : {}
}

function spouseStep(person: PersonNode, spouse: PersonNode): KinshipPathStep {
  return {
    kind: 'spouseOf',
    name: person.full_name,
    spouse: spouse.full_name,
    spouseRole: byGenderOf(person.gender, 'husband', 'wife', 'spouse')
  }
}

/**
 * " vợ" or " chồng" for how `person` calls their spouse's relatives ("Bố
 * vợ"); for gender 'other' it follows the spouse's gender, else both.
 */
function spouseSuffix(person: PersonNode, spouse: PersonNode): string {
  const own = genderBranch(person.gender)
  if (own === 'male') return ' vợ'
  if (own === 'female') return ' chồng'
  return byGenderOf(spouse.gender, ' chồng', ' vợ', ' vợ/chồng')
}

function isParentOf(
  parent: PersonNode,
  child: PersonNode,
  graph: KinshipGraph
): boolean {
  return (graph.parentMap.get(child.id) ?? []).includes(parent.id)
}

/**
 * A step-parent and the child of their spouse (not their own child): "Bố
 * dượng" / "Mẹ kế" and "Con riêng của vợ" / "Con riêng của chồng".
 */
function stepTerms(stepParent: PersonNode, parent: PersonNode) {
  return {
    stepParent: byGenderOf(
      stepParent.gender,
      'Bố dượng',
      'Mẹ kế',
      'Bố dượng/Mẹ kế'
    ),
    stepChild: byGenderOf(
      parent.gender,
      'Con riêng của chồng',
      'Con riêng của vợ',
      'Con riêng của vợ/chồng'
    )
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
    const pathLabels = [spouseStep(personA, spouseA), ...res.pathLabels]

    // B is the child of A's spouse but not A's own child.
    if (isParentOf(spouseA, personB, graph)) {
      const step = stepTerms(personA, spouseA)
      return {
        ...res,
        aCallsB: step.stepChild,
        bCallsA: step.stepParent,
        description: { kind: 'stepChild', name: spouseA.full_name },
        pathLabels
      }
    }

    // A gọi người trong họ của vợ/chồng mình; họ gọi A là dâu/rể.
    const suffix = spouseSuffix(personA, spouseA)
    return {
      ...res,
      aCallsB: callSpouseRelative(res.aCallsB, suffix),
      bCallsA: termRelativeCallsInLaw(res.bCallsA, personA.gender),
      description: {
        kind: 'viaSpouse',
        name: spouseA.full_name,
        ...carryUncertain(res.description)
      },
      pathLabels
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
    const pathLabels = [...res.pathLabels, spouseStep(personB, spouseB)]

    // A is the child of B's spouse but not B's own child.
    if (isParentOf(spouseB, personA, graph)) {
      const step = stepTerms(personB, spouseB)
      return {
        ...res,
        aCallsB: step.stepParent,
        bCallsA: step.stepChild,
        description: { kind: 'stepParent', name: spouseB.full_name },
        pathLabels
      }
    }

    const suffix = spouseSuffix(personB, spouseB)
    return {
      ...res,
      aCallsB: termForSpouseOfRelative(res.aCallsB, personB.gender),
      bCallsA: callSpouseRelative(res.bCallsA, suffix),
      description: {
        kind: 'viaSpouse',
        name: spouseB.full_name,
        ...carryUncertain(res.description)
      },
      pathLabels
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

      // Each side calls the other's spouse as their own spouse does
      // ("Cậu" → "Mợ", "Cháu" → "Cháu dâu"); unknown terms fall back to
      // "Vợ của …" / "Chồng của …".
      let aCallsB = termForSpouseOfRelative(res.aCallsB, personB.gender)
      let bCallsA = termForSpouseOfRelative(res.bCallsA, personA.gender)

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
          nameB: spouseB.full_name,
          ...carryUncertain(res.description)
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

/** Ông thông gia / Bà thông gia (miền Nam: ông sui / bà sui) by gender. */
function coParentInLawTerm(person: PersonNode): string {
  return byGenderOf(
    person.gender,
    'Ông thông gia',
    'Bà thông gia',
    'Ông/Bà thông gia'
  )
}

/** A child of A is married to a child of B: the two are thông gia. */
function viaChildInLaw(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  for (const [childId, parentIds] of graph.parentMap) {
    if (!parentIds.includes(personA.id)) continue
    const childA = graph.personsMap.get(childId)
    if (!childA) continue
    for (const sId of graph.spouseMap.get(childId) ?? []) {
      const childB = graph.personsMap.get(sId)
      if (!childB || !isParentOf(personB, childB, graph)) continue
      return {
        aCallsB: coParentInLawTerm(personB),
        bCallsA: coParentInLawTerm(personA),
        description: {
          kind: 'coParentsInLaw',
          childA: childA.full_name,
          childB: childB.full_name
        },
        distance: 2,
        pathLabels: [
          {
            kind: 'childOf',
            name: childA.full_name,
            parent: personA.full_name
          },
          {
            kind: 'spouses',
            nameA: childA.full_name,
            nameB: childB.full_name
          },
          { kind: 'childOf', name: childB.full_name, parent: personB.full_name }
        ]
      }
    }
  }
  return null
}

/** Anh kế / Chị kế / Em kế: what A calls B, by who is older. */
function stepSiblingTerm(personA: PersonNode, personB: PersonNode): string {
  const seniority = compareSeniority(personB, personA)
  if (seniority === 'junior') return 'Em kế'
  const older = byGenderOf(personB.gender, 'Anh', 'Chị', 'Anh/Chị')
  return seniority === 'senior' ? `${older} kế` : `${older}/Em kế`
}

/**
 * A's parent is married to B's parent and the two share no parent: anh/chị/em
 * kế (each is the stepchild of the other's parent).
 */
function viaStepParent(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  const parentsA = graph.parentMap.get(personA.id) ?? []
  const parentsB = graph.parentMap.get(personB.id) ?? []
  if (parentsA.some((id) => parentsB.includes(id))) return null
  for (const pId of parentsA) {
    const parentA = graph.personsMap.get(pId)
    if (!parentA) continue
    for (const sId of graph.spouseMap.get(pId) ?? []) {
      const parentB = graph.personsMap.get(sId)
      if (!parentB || !parentsB.includes(sId)) continue
      return {
        aCallsB: stepSiblingTerm(personA, personB),
        bCallsA: stepSiblingTerm(personB, personA),
        description: {
          kind: 'stepSiblings',
          parent: parentA.full_name,
          stepParent: parentB.full_name
        },
        distance: 3,
        pathLabels: [
          {
            kind: 'childOf',
            name: personA.full_name,
            parent: parentA.full_name
          },
          spouseStep(parentA, parentB),
          {
            kind: 'childOf',
            name: personB.full_name,
            parent: parentB.full_name
          }
        ]
      }
    }
  }
  return null
}

/**
 * A and B are married to the same person. There is no term without knowing
 * who married first (vợ cả / vợ lẽ), so only the description names it.
 */
function viaSharedSpouse(
  personA: PersonNode,
  personB: PersonNode,
  graph: KinshipGraph
): KinshipTerms | null {
  const spousesB = graph.spouseMap.get(personB.id) ?? []
  for (const sId of graph.spouseMap.get(personA.id) ?? []) {
    const spouse = graph.personsMap.get(sId)
    if (!spouse || !spousesB.includes(sId)) continue
    return {
      aCallsB: UNKNOWN_TERM,
      bCallsA: UNKNOWN_TERM,
      description: {
        kind: 'coSpouses',
        name: spouse.full_name,
        role: byGenderOf(spouse.gender, 'wives', 'husbands', 'spouses')
      },
      distance: 2,
      pathLabels: [spouseStep(personA, spouse), spouseStep(personB, spouse)]
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
      aCallsB: byGenderOf(personB.gender, 'Chồng', 'Vợ', 'Vợ/Chồng'),
      bCallsA: byGenderOf(personA.gender, 'Chồng', 'Vợ', 'Vợ/Chồng'),
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
    viaBothSpouses(personA, personB, graph) ??
    // 5. Con của A lấy con của B: thông gia
    viaChildInLaw(personA, personB, graph) ??
    // 6. Cha/mẹ của A lấy cha/mẹ của B: anh chị em kế
    viaStepParent(personA, personB, graph) ??
    // 7. Cùng lấy một người: hai vợ của một chồng, hai chồng của một vợ
    viaSharedSpouse(personA, personB, graph) ?? {
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
  const neutral = (gender: Gender) => genderBranch(gender) === 'neutral'
  return {
    ...terms,
    hasAmbiguousTerm: isAmbiguousTerm(terms.aCallsB),
    hasNeutralGender:
      (neutral(personA.gender) || neutral(personB.gender)) &&
      (isAmbiguousTerm(terms.aCallsB) || isAmbiguousTerm(terms.bCallsA))
  }
}
