import { SupabaseClient } from '@supabase/supabase-js'

import {
  EnrichedRelationship,
  RelationshipStats
} from '@/components/relationship/relationshipTypes'
import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'

type Translate = (key: TranslationKey, values?: TranslationValues) => string

// Loads every relationship involving `personId` (both columns), enriches each
// row with the other person, derives children-in-law from their marriages and
// computes the descendant stats shown on the member detail page.
export async function fetchRelationshipData(
  supabase: SupabaseClient,
  personId: string,
  t: Translate
): Promise<{
  relationships: EnrichedRelationship[]
  stats: RelationshipStats
}> {
  // Get all relationships where this person involved
  // This is a bit complex because we need to check both a and b columns
  const [{ data: relsA, error: errA }, { data: relsB, error: errB }] =
    await Promise.all([
      supabase
        .from('relationships')
        .select(`*, target:persons!person_b(*)`) // if I am A, target is B
        .eq('person_a', personId),
      supabase
        .from('relationships')
        .select(`*, target:persons!person_a(*)`) // if I am B, target is A
        .eq('person_b', personId)
    ])

  if (errA || errB) throw errA || errB

  const formattedRels: EnrichedRelationship[] = []

  // Process Rels where I am Person A
  relsA?.forEach((r) => {
    let direction: 'parent' | 'child' | 'spouse' = 'spouse'
    if (r.type === 'marriage') direction = 'spouse'
    else if (r.type === 'biological_child' || r.type === 'adopted_child')
      direction = 'child' // I am A (Parent), B is Child

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note
    })
  })

  // Process Rels where I am Person B
  relsB?.forEach((r) => {
    let direction: 'parent' | 'child' | 'spouse' = 'spouse'
    if (r.type === 'marriage') direction = 'spouse'
    else if (r.type === 'biological_child' || r.type === 'adopted_child')
      direction = 'parent' // I am B (Child), A is Parent

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note
    })
  })

  // Fetch in-laws (spouses of children)
  const childrenIds = formattedRels
    .filter((r) => r.direction === 'child')
    .map((r) => r.targetPerson.id)

  if (childrenIds.length > 0) {
    const { data: childrenMarriages, error: marriagesError } = await supabase
      .from('relationships')
      .select(
        `*, person_a_data:persons!person_a(*), person_b_data:persons!person_b(*)`
      )
      .eq('type', 'marriage')
      .or(
        `person_a.in.(${childrenIds.join(',')}),person_b.in.(${childrenIds.join(',')})`
      )

    if (marriagesError) throw marriagesError

    if (childrenMarriages) {
      const childIdSet = new Set(childrenIds)
      childrenMarriages.forEach((m) => {
        const isAChild = childIdSet.has(m.person_a)
        const childPerson = isAChild ? m.person_a_data : m.person_b_data
        const spousePerson = isAChild ? m.person_b_data : m.person_a_data

        if (spousePerson && childPerson) {
          const spouseGender = spousePerson.gender
          let noteLabel = t('spouseOf', { name: childPerson.full_name })
          if (spouseGender === 'female')
            noteLabel = t('daughterInLawOf', {
              name: childPerson.full_name
            })
          if (spouseGender === 'male')
            noteLabel = t('sonInLawOf', { name: childPerson.full_name })

          // Append existing marriage note if any
          if (m.note) noteLabel += ` - ${m.note}`

          formattedRels.push({
            id: m.id + '_inlaw',
            type: 'marriage',
            direction: 'child_in_law',
            targetPerson: spousePerson,
            note: noteLabel
          })
        }
      })
    }
  }

  const stats = await computeRelationshipStats(
    supabase,
    formattedRels,
    childrenIds
  )

  return { relationships: formattedRels, stats }
}

async function computeRelationshipStats(
  supabase: SupabaseClient,
  formattedRels: EnrichedRelationship[],
  childrenIds: string[]
): Promise<RelationshipStats> {
  const biologicalChildrenList = formattedRels.filter(
    (r) => r.direction === 'child' && r.type === 'biological_child'
  )
  const biologicalChildren = biologicalChildrenList.length
  const maleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === 'male'
  ).length
  const femaleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === 'female'
  ).length

  const daughterInLaw = formattedRels.filter(
    (r) => r.direction === 'child_in_law' && r.targetPerson.gender === 'female'
  ).length
  const sonInLaw = formattedRels.filter(
    (r) => r.direction === 'child_in_law' && r.targetPerson.gender === 'male'
  ).length

  // Fetch Grandchildren mapping
  let paternalGrandchildren = 0
  let maternalGrandchildren = 0
  if (childrenIds.length > 0) {
    const { data: grandchildrenData, error: grandchildrenError } =
      await supabase
        .from('relationships')
        .select('id, person_a')
        .in('type', ['biological_child', 'adopted_child'])
        .in('person_a', childrenIds)

    if (grandchildrenError) throw grandchildrenError

    if (grandchildrenData) {
      const maleChildrenIds = formattedRels
        .filter(
          (r) => r.direction === 'child' && r.targetPerson.gender === 'male'
        )
        .map((r) => r.targetPerson.id)
      const femaleChildrenIds = formattedRels
        .filter(
          (r) => r.direction === 'child' && r.targetPerson.gender === 'female'
        )
        .map((r) => r.targetPerson.id)

      const maleChildIdSet = new Set(maleChildrenIds)
      const femaleChildIdSet = new Set(femaleChildrenIds)
      paternalGrandchildren = grandchildrenData.filter((g) =>
        maleChildIdSet.has(g.person_a)
      ).length
      maternalGrandchildren = grandchildrenData.filter((g) =>
        femaleChildIdSet.has(g.person_a)
      ).length
    }
  }

  return {
    biologicalChildren,
    maleBiologicalChildren,
    femaleBiologicalChildren,
    paternalGrandchildren,
    maternalGrandchildren,
    sonInLaw,
    daughterInLaw
  }
}
