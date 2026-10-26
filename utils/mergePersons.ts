/**
 * Preview of merging two possibly-duplicate members, mirroring what the
 * `merge_persons` RPC (docs/migrations/…add_merge_persons.sql) does: the kept
 * member wins everywhere, the dropped member's unique data moves over and the
 * dropped member is deleted. Pure: reads nothing, writes nothing.
 */

export interface MergePerson {
  id: string
  full_name: string
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  death_year: number | null
  death_month: number | null
  death_day: number | null
  death_lunar_year: number | null
  death_lunar_month: number | null
  death_lunar_day: number | null
  is_deceased: boolean
  is_in_law: boolean
  birth_order: number | null
  generation: number | null
  other_names: string | null
  avatar_url: string | null
  note: string | null
}

export interface MergeRelationshipRow {
  id: string
  type: string
  person_a: string
  person_b: string
}

export interface MergePrivateDetails {
  phone_number: string | null
  occupation: string | null
  current_residence: string | null
}

export interface MergePreviewRelationship extends MergeRelationshipRow {
  /** The member on the other end (never the merged pair itself). */
  otherId: string
  /** Display name of the other member, filled by the server action. */
  otherName?: string
}

export type MergeFillKey =
  | 'birthYear'
  | 'birthMonth'
  | 'birthDay'
  | 'deathYear'
  | 'deathMonth'
  | 'deathDay'
  | 'deathLunarYear'
  | 'deathLunarMonth'
  | 'deathLunarDay'
  | 'isDeceased'
  | 'isInLaw'
  | 'birthOrder'
  | 'generation'
  | 'avatar'

export interface MergePreview {
  /** Relationships of the dropped member that are re-pointed to the keeper. */
  moved: MergePreviewRelationship[]
  /** The relationship(s) between the two members themselves. */
  droppedPair: MergePreviewRelationship[]
  /** Relationships the keeper already has (a marriage either way round). */
  droppedDuplicates: MergePreviewRelationship[]
  /** Keeper columns that take the dropped member's value. */
  personFills: Array<{ key: MergeFillKey; value: string | number | boolean }>
  /** True when the keeper has no private-details row and takes the other's. */
  privateMoved: boolean
  /** Private fields of the keeper that take the dropped member's value. */
  privateFills: Array<{
    key: 'phone' | 'occupation' | 'residence'
    value: string
  }>
  /** Names remembered in other_names because they differ from the keeper's. */
  otherNamesAdded: string[]
  /** True when the dropped member's note is appended to the keeper's. */
  noteAppended: boolean
}

const FILLED_COLUMNS: Array<{
  key: MergeFillKey
  column: keyof MergePerson
}> = [
  { key: 'birthYear', column: 'birth_year' },
  { key: 'birthMonth', column: 'birth_month' },
  { key: 'birthDay', column: 'birth_day' },
  { key: 'deathYear', column: 'death_year' },
  { key: 'deathMonth', column: 'death_month' },
  { key: 'deathDay', column: 'death_day' },
  { key: 'deathLunarYear', column: 'death_lunar_year' },
  { key: 'deathLunarMonth', column: 'death_lunar_month' },
  { key: 'deathLunarDay', column: 'death_lunar_day' },
  { key: 'birthOrder', column: 'birth_order' },
  { key: 'generation', column: 'generation' },
  { key: 'avatar', column: 'avatar_url' }
]

/** Same list convention as the GEDCOM export: comma, semicolon or newline. */
export function splitOtherNames(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/[,;\n]/)
    .map((name) => name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function previewMerge(input: {
  keep: MergePerson
  drop: MergePerson
  /** Every relationship of either member. */
  relationships: MergeRelationshipRow[]
  privateKeep: MergePrivateDetails | null
  privateDrop: MergePrivateDetails | null
}): MergePreview {
  const { keep, drop, relationships, privateKeep, privateDrop } = input
  const isBetweenPair = (r: MergeRelationshipRow) =>
    (r.person_a === keep.id && r.person_b === drop.id) ||
    (r.person_a === drop.id && r.person_b === keep.id)
  const withOther = (r: MergeRelationshipRow, otherId: string) => ({
    ...r,
    otherId
  })
  const dropSide = relationships
    .filter((r) => r.person_a === drop.id || r.person_b === drop.id)
    .map((r) => withOther(r, r.person_a === drop.id ? r.person_b : r.person_a))

  const droppedPair = dropSide.filter((r) => isBetweenPair(r))
  const keeperPair = (r: MergeRelationshipRow) => ({
    type: r.type,
    person_a: r.person_a === drop.id ? keep.id : r.person_a,
    person_b: r.person_b === drop.id ? keep.id : r.person_b
  })
  const keeperHasSame = (r: MergeRelationshipRow) => {
    const pair = keeperPair(r)
    return relationships.some(
      (k) =>
        k.id !== r.id &&
        k.type === r.type &&
        ((k.person_a === pair.person_a && k.person_b === pair.person_b) ||
          (r.type === 'marriage' &&
            k.person_a === pair.person_b &&
            k.person_b === pair.person_a))
    )
  }
  const remaining = dropSide.filter((r) => !isBetweenPair(r))
  const droppedDuplicates = remaining.filter((r) => keeperHasSame(r))
  const moved = remaining.filter((r) => !keeperHasSame(r))

  const personFills: MergePreview['personFills'] = FILLED_COLUMNS.flatMap(
    ({ key, column }) => {
      const value = drop[column]
      if (keep[column] != null || value == null) return []
      return [{ key, value: value as string | number }]
    }
  )
  if (!keep.is_deceased && drop.is_deceased)
    personFills.push({ key: 'isDeceased', value: true })
  if (!keep.is_in_law && drop.is_in_law)
    personFills.push({ key: 'isInLaw', value: true })

  const privateMoved = privateKeep == null && privateDrop != null
  const empty = (value: string | null | undefined) =>
    (value ?? '').trim() === ''
  const privateFills =
    privateKeep == null || privateDrop == null
      ? []
      : (
          [
            { key: 'phone', column: 'phone_number' },
            { key: 'occupation', column: 'occupation' },
            { key: 'residence', column: 'current_residence' }
          ] as const
        ).flatMap(({ key, column }) =>
          empty(privateKeep[column]) && !empty(privateDrop[column])
            ? [{ key, value: (privateDrop[column] ?? '').trim() }]
            : []
        )

  const otherNamesAdded = splitOtherNames(drop.other_names)
  // Plain lowercase like the RPC: 'Nguyen Van An' is kept as an aka of
  // 'Nguyễn Văn An', only the exact spelling is dropped.
  if (drop.full_name.toLowerCase() !== keep.full_name.toLowerCase())
    otherNamesAdded.unshift(drop.full_name)
  const unique = new Set<string>()
  const added = otherNamesAdded.filter((name) => {
    const key = name.toLowerCase()
    if (unique.has(key)) return false
    unique.add(key)
    return true
  })

  return {
    moved,
    droppedPair,
    droppedDuplicates,
    personFills,
    privateMoved,
    privateFills,
    otherNamesAdded: added,
    noteAppended: (drop.note ?? '').trim() !== ''
  }
}

/**
 * Columns the merge preview reads from `persons` (everything the RPC may
 * change or move).
 */
export const MERGE_PERSON_COLUMNS =
  'id, full_name, birth_year, birth_month, birth_day, death_year, ' +
  'death_month, death_day, death_lunar_year, death_lunar_month, ' +
  'death_lunar_day, is_deceased, is_in_law, birth_order, generation, ' +
  'other_names, avatar_url, note'
