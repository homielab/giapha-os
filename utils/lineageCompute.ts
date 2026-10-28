import { Person, Relationship } from '@/types'

import { compareBirth } from './compareBirth'

export interface ComputedUpdate {
  id: string
  full_name: string
  old_generation: number | null
  new_generation: number | null
  old_birth_order: number | null
  new_birth_order: number | null
  old_is_in_law: boolean
  new_is_in_law: boolean
  gender: string
  changed: boolean
}

export function computeGenerations(
  persons: Person[],
  relationships: Relationship[]
): Map<string, number> {
  // Build child→parents map (only biological/adopted relationships)
  const childParents = new Map<string, string[]>()
  // Build parent→children map
  const parentChildren = new Map<string, string[]>()

  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      // person_a = parent, person_b = child
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, [])
      childParents.get(r.person_b)!.push(r.person_a)

      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, [])
      parentChildren.get(r.person_a)!.push(r.person_b)
    }
  }

  // Build marriage map: person → spouses
  const spouseMap = new Map<string, string[]>()
  for (const r of relationships) {
    if (r.type === 'marriage') {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, [])
      spouseMap.get(r.person_a)!.push(r.person_b)
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, [])
      spouseMap.get(r.person_b)!.push(r.person_a)
    }
  }

  // Roots = persons who have NO parents AND NO spouses
  // (If they have a spouse, we'll try to get their generation from the spouse later or vice versa)
  const trueRoots = persons.filter(
    (p) => !childParents.has(p.id) && !spouseMap.has(p.id)
  )

  // Also include persons who have spouses, but neither they nor any of their spouses have parents
  // (to jumpstart disconnected families)
  const processedRoots = new Set(trueRoots.map((p) => p.id))
  for (const p of persons.filter(
    (p) => !childParents.has(p.id) && spouseMap.has(p.id)
  )) {
    const spouses = spouseMap.get(p.id) || []
    const anySpouseHasParents = spouses.some((sId) => childParents.has(sId))
    if (
      !anySpouseHasParents &&
      !processedRoots.has(p.id) &&
      !spouses.some((sId) => processedRoots.has(sId))
    ) {
      // If neither this person nor their spouse has parents, pick one as a root
      trueRoots.push(p)
      processedRoots.add(p.id)
    }
  }

  const genMap = new Map<string, number>()

  // BFS from roots
  const queue: Array<{ id: string; gen: number }> = trueRoots.map((r) => ({
    id: r.id,
    gen: 1
  }))

  // A real tree has at most one generation per person. Deeper paths only come
  // from a parent-child loop in the data, which would otherwise never stop.
  const maxGeneration = persons.length

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!

    if (gen > maxGeneration) continue

    // Use the longest path (deepest generation)
    // If we've already found a path that makes this person an equal or deeper generation, stop
    if (genMap.has(id) && gen <= genMap.get(id)!) {
      continue
    }

    genMap.set(id, gen)

    // Propagate to children
    const children = parentChildren.get(id) || []
    for (const childId of children) {
      queue.push({ id: childId, gen: gen + 1 })
    }

    // Propagate to spouses to ensure they process their children too,
    // and they get an equal generation.
    const spouses = spouseMap.get(id) || []
    for (const spouseId of spouses) {
      // We don't want to endlessly loop between spouses, so only push if spouse has a smaller/no generation
      if (!genMap.has(spouseId) || gen > genMap.get(spouseId)!) {
        queue.push({ id: spouseId, gen: gen })
      }
    }
  }

  // Fallback for anyone missed (e.g. disconnected loops)
  // Assign generation to spouses based on their partner's generation
  let changed = true
  while (changed) {
    changed = false
    for (const p of persons) {
      if (genMap.has(p.id)) continue
      const spouses = spouseMap.get(p.id) || []
      for (const spouseId of spouses) {
        if (genMap.has(spouseId)) {
          genMap.set(p.id, genMap.get(spouseId)!)
          changed = true
          break
        }
      }
    }
  }

  // Persons not reachable from any root (orphaned or disconnected in-laws)
  // leave generation as null -- we don't assign them
  return genMap
}

export function computeInLaws(
  persons: Person[],
  relationships: Relationship[]
): Map<string, boolean> {
  // A person is an in-law if they have a spouse in the tree but no parents in the tree
  const childParents = new Map<string, string[]>()
  const spouseMap = new Map<string, string[]>()

  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, [])
      childParents.get(r.person_b)!.push(r.person_a)
    } else if (r.type === 'marriage') {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, [])
      spouseMap.get(r.person_a)!.push(r.person_b)
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, [])
      spouseMap.get(r.person_b)!.push(r.person_a)
    }
  }

  const inLawMap = new Map<string, boolean>()

  // Identify "roots" - people with no parents
  for (const p of persons) {
    const hasParents = childParents.has(p.id)
    const hasSpouse = spouseMap.has(p.id)

    // Rule: If they have parents in the tree, they are bloodline (NOT in-law)
    if (hasParents) {
      inLawMap.set(p.id, false)
      continue
    }

    // Rule: If they have no parents but DO have a spouse
    if (hasSpouse) {
      // Ambiguity check: If NEITHER spouse has parents, one is root, one is in-law.
      // Usually, we keep the one already marked as NOT in-law as the root,
      // or we use gender as a fallback (male = bloodline in many traditional Vietnamese genealogies).
      const spouses = spouseMap.get(p.id) || []
      const anySpouseHasParents = spouses.some((sId) => childParents.has(sId))

      if (anySpouseHasParents) {
        // Spouse is bloodline -> this person is definitely an in-law
        inLawMap.set(p.id, true)
      } else {
        // Neither has parents. Identify the "core" ancestor.
        // If one is already marked as not in-law in DB, keep it.
        // Otherwise, prioritize male.
        const spousesData = spouses.map((sId) =>
          persons.find((per) => per.id === sId)
        )
        const shouldBeBloodline =
          !p.is_in_law ||
          (p.gender === 'male' &&
            spousesData.every((s) => s?.gender !== 'male'))

        inLawMap.set(p.id, !shouldBeBloodline)
      }
    } else {
      // No parents and no spouse -> Root (Generation 1) -> NOT in-law
      inLawMap.set(p.id, false)
    }
  }

  return inLawMap
}

export function computeBirthOrders(
  persons: Person[],
  relationships: Relationship[]
): Map<string, number> {
  // For each parent→children group, sort by birth_year and assign order
  const parentChildren = new Map<string, Set<string>>()

  for (const r of relationships) {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!parentChildren.has(r.person_a))
        parentChildren.set(r.person_a, new Set())
      parentChildren.get(r.person_a)!.add(r.person_b)
    }
  }

  const personsById = new Map(persons.map((p) => [p.id, p]))
  const orderMap = new Map<string, number>()

  for (const [, childIds] of parentChildren) {
    // Sort by birth date (the stored birth_order is what we recompute)
    const sorted = Array.from(childIds)
      .flatMap((id) => personsById.get(id) ?? [])
      .sort((a, b) => compareBirth(a, b, { useOrder: false }))
      .map((p) => p.id)

    // Only assign order to non-in-law children
    let order = 1
    for (const childId of sorted) {
      const p = personsById.get(childId)
      if (p && !p.is_in_law) {
        // Keep the largest order if already assigned from another parent
        // (e.g., father has 3 kids, mother has 1 kid. the mother's 1st kid might be father's 3rd. assign 3rd)
        if (!orderMap.has(childId) || orderMap.get(childId)! < order) {
          orderMap.set(childId, order)
        }
        order++
      }
    }
  }

  return orderMap
}
