import { SupabaseClient } from '@supabase/supabase-js'

import {
  EnrichedRelationship,
  RelationshipStats
} from '@/components/relationship/relationshipTypes'
import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import type { Person, RelationshipType } from '@/types'
import { NO_SIGNED_AVATAR_URLS, type SignedAvatarUrls } from '@/utils/avatar'
import { signAvatarUrls } from '@/utils/avatarSigning'
import { fetchAllRows, fetchInChunks } from '@/utils/supabase/fetchAll'

import { PERSON_LIST_COLUMNS } from './personColumns'

type Translate = (key: TranslationKey, values?: TranslationValues) => string

// Relationship columns read here: the link, its note and when it was added
// (spouse order). The other person is
// embedded with the list columns only (no `note`, `created_at`), which is all
// the relationship list, the bulk-add form and the stats read.
const LINK_COLUMNS = 'id, type, note, created_at'
const targetColumns = (side: 'person_a' | 'person_b') =>
  `${LINK_COLUMNS}, target:persons!${side}(${PERSON_LIST_COLUMNS})`
// The embedded person carries only PERSON_LIST_COLUMNS.
interface LinkRow {
  id: string
  type: RelationshipType
  note: string | null
  created_at?: string | null
  target: Person
}
interface MarriageRow extends Omit<LinkRow, 'target'> {
  person_a: string
  person_b: string
  person_a_data: Person | null
  person_b_data: Person | null
}
const CHILD_MARRIAGE_COLUMNS = `${LINK_COLUMNS}, person_a, person_b, person_a_data:persons!person_a(${PERSON_LIST_COLUMNS}), person_b_data:persons!person_b(${PERSON_LIST_COLUMNS})`

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
  // The person can be on either side of a relationship, so query both columns.
  const [{ data: relsA, error: errA }, { data: relsB, error: errB }] =
    await Promise.all([
      supabase
        .from('relationships')
        .select(targetColumns('person_b')) // if I am A, target is B
        .eq('person_a', personId)
        .overrideTypes<LinkRow[], { merge: false }>(),
      supabase
        .from('relationships')
        .select(targetColumns('person_a')) // if I am B, target is A
        .eq('person_b', personId)
        .overrideTypes<LinkRow[], { merge: false }>()
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
      note: r.note,
      createdAt: r.created_at
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
      note: r.note,
      createdAt: r.created_at
    })
  })

  const children = formattedRels.filter((r) => r.direction === 'child')
  const childrenIds = children.map((r) => r.targetPerson.id)
  const childIdsOf = (gender: string) =>
    children
      .filter((r) => r.targetPerson.gender === gender)
      .map((r) => r.targetPerson.id)

  // The children's marriages (in-laws) and the grandchildren counts only need
  // the children's ids, so they are sent together.
  const [childrenMarriages, paternalGrandchildren, maternalGrandchildren] =
    await Promise.all([
      fetchChildrenMarriages(supabase, childrenIds),
      countGrandchildren(supabase, childIdsOf('male')),
      countGrandchildren(supabase, childIdsOf('female'))
    ])

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

  const stats = computeRelationshipStats(
    formattedRels,
    paternalGrandchildren,
    maternalGrandchildren
  )

  return { relationships: formattedRels, stats }
}

async function fetchChildrenMarriages(
  supabase: SupabaseClient,
  childrenIds: string[]
): Promise<MarriageRow[]> {
  // Chunked so the .or() list stays within the URL limit, each chunk paged
  // past the response row cap. A marriage between two children in different
  // chunks comes back twice and is kept once.
  const { data, error } = await fetchInChunks(childrenIds, (chunk) => {
    const ids = chunk.join(',')
    return fetchAllRows<MarriageRow>((from, to) =>
      supabase
        .from('relationships')
        .select(CHILD_MARRIAGE_COLUMNS)
        .eq('type', 'marriage')
        .or(`person_a.in.(${ids}),person_b.in.(${ids})`)
        .order('id')
        .range(from, to)
        .overrideTypes<MarriageRow[], { merge: false }>()
    )
  })

  if (error) throw error
  const seen = new Set<string>()
  return data.filter((m) => !seen.has(m.id) && !!seen.add(m.id))
}

// Counts the child links (biological or adopted) whose parent is one of
// `parentIds`, without downloading the rows.
async function countGrandchildren(
  supabase: SupabaseClient,
  parentIds: string[]
): Promise<number> {
  if (parentIds.length === 0) return 0
  const { count, error } = await supabase
    .from('relationships')
    .select('id', { count: 'exact', head: true })
    .in('type', ['biological_child', 'adopted_child'])
    .in('person_a', parentIds)

  if (error) throw error
  return count ?? 0
}

function computeRelationshipStats(
  formattedRels: EnrichedRelationship[],
  paternalGrandchildren: number,
  maternalGrandchildren: number
): RelationshipStats {
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

// Signs the avatars of every relative in one storage request, instead of one
// `/api/avatar` round trip per photo. Never throws: when signing fails the
// list still shows and the photos fall back to `/api/avatar`.
export async function signRelationshipAvatars(
  supabase: SupabaseClient,
  relationships: EnrichedRelationship[]
): Promise<SignedAvatarUrls> {
  try {
    return await signAvatarUrls(
      supabase,
      relationships.map((r) => r.targetPerson)
    )
  } catch (err) {
    console.error('Cannot sign relative avatars:', err)
    return NO_SIGNED_AVATAR_URLS
  }
}
