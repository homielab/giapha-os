import { Person } from '@/types'

import { compareBirth } from './compareBirth'

type ParentsOf = Map<string, string[]>
type SpousesOf = Map<string, string[]>

export function sortPersonsFlat(persons: Person[], sortOption: string) {
  return [...persons].sort((a, b) => {
    switch (sortOption) {
      case 'birth_asc':
        return compareBirth(a, b, { useOrder: false })
      case 'birth_desc':
        return compareBirth(a, b, { useOrder: false, direction: 'desc' })
      case 'name_asc':
        return a.full_name.localeCompare(b.full_name, 'vi')
      case 'name_desc':
        return b.full_name.localeCompare(a.full_name, 'vi')
      case 'updated_desc':
        return (
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
        )
      case 'updated_asc':
        return (
          new Date(a.updated_at || 0).getTime() -
          new Date(b.updated_at || 0).getTime()
        )
      default:
        return 0
    }
  })
}

// --- Complex Generation Sorting (Grouped by Family) ---
// Family groups share the same parents, or are spouses. A family groupId is
// derived from (a) the parents' IDs, or (b) a marriage cluster's min ID.
const getGroupId = (
  personId: string,
  parentsOf: ParentsOf,
  spousesOf: SpousesOf
) => {
  const parents = parentsOf.get(personId) || []
  if (parents.length > 0) {
    // Has parents -> group by parents
    return 'parents_' + [...parents].sort().join('_')
  }

  // No parents -> check spouses and then check if those spouses have parents
  // Use a small BFS to find the whole marriage cluster
  const visited = new Set<string>([personId])
  const queue = [personId]
  const cluster: string[] = []

  while (queue.length > 0) {
    const curr = queue.shift()!
    cluster.push(curr)
    const pts = parentsOf.get(curr)
    if (pts && pts.length > 0) {
      // Found a bloodline member in the marriage cluster!
      return 'parents_' + [...pts].sort().join('_')
    }

    const sps = spousesOf.get(curr) || []
    for (const s of sps) {
      if (!visited.has(s)) {
        visited.add(s)
        queue.push(s)
      }
    }
  }

  // No one in marriage cluster has parents -> group by the cluster's min ID
  return 'spouses_' + [...cluster].sort()[0]
}

export type FamilySortedPerson = Person & { _familyId?: string }

export function sortPersonsByGeneration(
  filteredPersons: Person[],
  sortOption: string,
  personMap: Map<string, Person>,
  parentsOf: ParentsOf,
  spousesOf: SpousesOf
): FamilySortedPerson[] {
  // 3. Group the filtered persons into their families
  const families = new Map<string, Person[]>()
  filteredPersons.forEach((p) => {
    const groupId = getGroupId(p.id, parentsOf, spousesOf)
    if (!families.has(groupId)) families.set(groupId, [])
    families.get(groupId)!.push(p)
  })

  // 4. Sort families and persons within families
  // To sort families, we need a representative "score" based on the parents' birth order
  // or the primary member's birth order/birth year.
  const getFamilyScore = (members: Person[]) => {
    // Find the "core" member (usually the bloodline, not in-law)
    const coreMember = members.find((m) => !m.is_in_law) || members[0]

    // Score is [generation, parentBirthOrder, ownBirthOrder, birthYear]
    const parents = parentsOf.get(coreMember.id) || []
    let parentBirthOrder = 999
    if (parents.length > 0) {
      const p1 = personMap.get(parents[0])
      if (p1) parentBirthOrder = p1.birth_order || 999
    }

    return {
      parentBirthOrder,
      ownBirthOrder: coreMember.birth_order || 999,
      birthYear: coreMember.birth_year || 9999
    }
  }

  const familyScores = new Map(
    Array.from(families.entries()).map(([groupId, members]) => [
      groupId,
      getFamilyScore(members)
    ])
  )

  const sortedGroups = Array.from(families.entries()).sort((a, b) => {
    const scoreA = familyScores.get(a[0])!
    const scoreB = familyScores.get(b[0])!

    if (scoreA.parentBirthOrder !== scoreB.parentBirthOrder) {
      return scoreA.parentBirthOrder - scoreB.parentBirthOrder
    }
    if (scoreA.ownBirthOrder !== scoreB.ownBirthOrder) {
      return scoreA.ownBirthOrder - scoreB.ownBirthOrder
    }
    return scoreA.birthYear - scoreB.birthYear
  })

  // 5. Flatten the grouped and sorted families
  const finalSorted: FamilySortedPerson[] = []
  sortedGroups.forEach(([groupId, members]) => {
    // Sort within the family (Siblings by birth order, spouses follow their partner)
    const getBloodlineRef = (p: Person) => {
      if (!p.is_in_law) return p
      const spIdSet = new Set(spousesOf.get(p.id) || [])
      const bloodlineSpouse = members.find(
        (m) => spIdSet.has(m.id) && !m.is_in_law
      )
      return bloodlineSpouse || p
    }

    members.sort((a, b) => {
      const refA = getBloodlineRef(a)
      const refB = getBloodlineRef(b)

      // Different bloodline partner -> sort by the bloodline partner's order/age
      if (refA.id !== refB.id) {
        if ((refA.birth_order || 999) !== (refB.birth_order || 999)) {
          return (refA.birth_order || 999) - (refB.birth_order || 999)
        }
        return (refA.birth_year || 9999) - (refB.birth_year || 9999)
      }

      // Same bloodline partner (e.g. one is bloodline, other is spouse)
      if (a.is_in_law !== b.is_in_law) {
        return a.is_in_law ? 1 : -1 // Bloodline first
      }

      // Both are spouses or both bloodline? Sort by age
      return (a.birth_year || 9999) - (b.birth_year || 9999)
    })
    finalSorted.push(...members.map((m) => ({ ...m, _familyId: groupId })))
  })

  // 6. Ensure generation is the primary sort key; the UI groups by generation
  // and preserves array order inside each generation bucket.
  finalSorted.sort((a, b) => {
    const genA = a.generation || 999
    const genB = b.generation || 999
    if (genA !== genB) {
      return sortOption === 'generation_desc' ? genB - genA : genA - genB
    }
    // If same generation, preserve the family sorting we just did
    return 0
  })

  return finalSorted
}

// Group family members into couple clusters connected by spouse relationships,
// with bloodline members balanced toward the center of each cluster.
export function groupIntoCoupleGroups(
  famPersons: Person[],
  spousesOf: SpousesOf
): Person[][] {
  const coupleGroups: Person[][] = []
  const placed = new Set<string>()
  const personById = new Map(famPersons.map((m) => [m.id, m]))

  for (const p of famPersons) {
    if (placed.has(p.id)) continue
    const group = [p]
    placed.add(p.id)

    // Find all spouses connected to this person
    const queue = [p.id]
    while (queue.length > 0) {
      const curr = queue.shift()!
      const spIds = spousesOf.get(curr) || []
      for (const spId of spIds) {
        if (!placed.has(spId)) {
          const spObj = personById.get(spId)
          if (spObj) {
            group.push(spObj)
            placed.add(spId)
            queue.push(spId)
          }
        }
      }
    }

    // Balanced Sort: Place bloodline members in the center
    // This ensures HUB -- SPOUSE links work best in a horizontal grid.
    const bloodlineMembers = group
      .filter((m) => !m.is_in_law)
      .sort((a, b) => (a.birth_year || 0) - (b.birth_year || 0))
    const inLawMembers = group
      .filter((m) => m.is_in_law)
      .sort((a, b) => (a.birth_year || 0) - (b.birth_year || 0))

    const balanced: Person[] = []
    if (group.length <= 2) {
      balanced.push(...bloodlineMembers, ...inLawMembers)
    } else {
      // For 3+ people, put the main person(s) in the middle
      // Example for 3: [InLaw 1, Bloodline, InLaw 2]
      let bIdx = 0
      let iIdx = 0
      const slots = new Array(group.length)

      // Put bloodline in center or near center
      const mid = Math.floor(group.length / 2)
      slots[mid] = bloodlineMembers[bIdx++]

      // Distribute others around
      let offset = 1
      while (bIdx < bloodlineMembers.length || iIdx < inLawMembers.length) {
        const next =
          bIdx < bloodlineMembers.length
            ? bloodlineMembers[bIdx++]
            : inLawMembers[iIdx++]
        if (mid + offset < group.length && !slots[mid + offset])
          slots[mid + offset] = next
        else if (mid - offset >= 0 && !slots[mid - offset])
          slots[mid - offset] = next
        else {
          // Find first empty slot
          const empty = slots.findIndex((s) => !s)
          if (empty !== -1) slots[empty] = next
        }
        offset++
      }
      balanced.push(...slots.filter((s) => !!s))
    }

    coupleGroups.push(balanced)
  }

  return coupleGroups
}
