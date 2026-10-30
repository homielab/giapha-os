import { describe, expect, test } from 'bun:test'

import {
  canConfirmMerge,
  mergeIdsProblem,
  previewMerge,
  splitOtherNames,
  type MergePerson,
  type MergePrivateDetails,
  type MergeRelationshipRow
} from './mergePersons'

const person = (overrides: Partial<MergePerson>): MergePerson => ({
  id: '00000000-0000-0000-0000-000000000000',
  full_name: 'Nguyễn Văn An',
  birth_year: 1950,
  birth_month: null,
  birth_day: null,
  death_year: null,
  death_month: null,
  death_day: null,
  death_lunar_year: null,
  death_lunar_month: null,
  death_lunar_day: null,
  is_deceased: false,
  is_in_law: false,
  birth_order: null,
  generation: null,
  other_names: null,
  avatar_url: null,
  note: null,
  ...overrides
})

const A = person({ id: 'aaaaaaaa-0000-0000-0000-000000000001' })
const B = person({
  id: 'aaaaaaaa-0000-0000-0000-000000000002',
  full_name: 'Nguyen Van An'
})
const X = 'aaaaaaaa-0000-0000-0000-000000000003'
const Y = 'aaaaaaaa-0000-0000-0000-000000000004'

const rel = (
  id: string,
  type: string,
  person_a: string,
  person_b: string
): MergeRelationshipRow => ({ id, type, person_a, person_b })

const baseInput = {
  keep: A,
  drop: B,
  relationships: [] as MergeRelationshipRow[],
  privateKeep: null as MergePrivateDetails | null,
  privateDrop: null as MergePrivateDetails | null
}

describe('splitOtherNames', () => {
  test('splits on comma, semicolon and newline and cleans up', () => {
    expect(splitOtherNames('An Ba; An Ba,  \n An Tư /')).toEqual([
      'An Ba',
      'An Ba',
      'An Tư'
    ])
    expect(splitOtherNames(null)).toEqual([])
  })
})

describe('previewMerge', () => {
  test('classifies relationships: moved, the pair itself and duplicates', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        // between the two members: goes away
        rel('r1', 'marriage', A.id, B.id),
        // keeper already married to X: B's marriage to X is a duplicate
        rel('r2', 'marriage', A.id, X),
        // B married to X the other way round: also a duplicate
        rel('r3', 'marriage', X, B.id),
        // B is a parent of Y: moves to A
        rel('r4', 'biological_child', B.id, Y)
      ]
    })
    expect(preview.droppedPair.map((r) => r.id)).toEqual(['r1'])
    // r2 is the keeper's own marriage and just stays; B's marriage to X the
    // other way round (r3) is the duplicate.
    expect(preview.droppedDuplicates.map((r) => r.id)).toEqual(['r3'])
    expect(preview.moved.map((r) => r.id)).toEqual(['r4'])
    expect(preview.moved[0]?.otherId).toBe(Y)
  })

  test('parent-child duplicates are matched in order, not swapped', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        rel('r1', 'biological_child', A.id, Y),
        // B is Y's CHILD, not parent: not a duplicate of A being Y's parent
        rel('r2', 'biological_child', Y, B.id)
      ]
    })
    expect(preview.droppedDuplicates).toEqual([])
    expect(preview.moved.map((r) => r.id)).toEqual(['r2'])
  })

  test('empty keeper columns take the dropped values', () => {
    const preview = previewMerge({
      ...baseInput,
      drop: person({
        ...B,
        birth_month: 3,
        birth_day: 5,
        death_year: 2020,
        death_lunar_day: 12,
        is_deceased: true,
        generation: 2,
        avatar_url: 'avatars/b.jpg'
      })
    })
    const keys = preview.personFills.map((fill) => fill.key)
    expect(keys).toContain('birthMonth')
    expect(keys).toContain('birthDay')
    expect(keys).toContain('deathYear')
    expect(keys).toContain('deathLunarDay')
    expect(keys).toContain('isDeceased')
    expect(keys).toContain('generation')
    expect(keys).toContain('avatar')
    expect(keys).not.toContain('birthYear')
  })

  test('filled keeper columns are not overwritten', () => {
    const preview = previewMerge({
      ...baseInput,
      keep: person({ ...A, birth_year: 1951, death_year: 1999 }),
      drop: person({ ...B, birth_year: 1950, death_year: 2020 })
    })
    const keys = preview.personFills.map((fill) => fill.key)
    expect(keys).not.toContain('birthYear')
    expect(keys).not.toContain('deathYear')
  })

  test('private details: whole row moves or single fields fill', () => {
    const moved = previewMerge({
      ...baseInput,
      privateDrop: {
        phone_number: '0901',
        occupation: null,
        current_residence: null
      }
    })
    expect(moved.privateMoved).toBe(true)
    expect(moved.privateFills).toEqual([])

    const filled = previewMerge({
      ...baseInput,
      privateKeep: {
        phone_number: '0901',
        occupation: null,
        current_residence: 'Hà Nội'
      },
      privateDrop: {
        phone_number: '0999',
        occupation: 'Giáo viên',
        current_residence: null
      }
    })
    expect(filled.privateMoved).toBe(false)
    expect(filled.privateFills).toEqual([
      { key: 'occupation', value: 'Giáo viên' }
    ])
  })

  test('a different name and notes are reported, same name is not', () => {
    const different = previewMerge({
      ...baseInput,
      drop: person({ ...B, other_names: 'An Ba', note: 'Ghi chú trùng' })
    })
    expect(different.otherNamesAdded).toEqual(['Nguyen Van An', 'An Ba'])
    expect(different.noteAppended).toBe(true)

    const same = previewMerge({
      ...baseInput,
      drop: person({ ...B, full_name: 'nguyễn văn an', other_names: 'AN' })
    })
    // The same name (ignoring accents and case) is not added again, but the
    // other_names entries of the dropped member are kept, like the RPC does.
    expect(same.otherNamesAdded).toEqual(['AN'])
    expect(same.noteAppended).toBe(false)
  })

  test('an empty burial place of the keeper takes the dropped one', () => {
    const filled = previewMerge({
      ...baseInput,
      keep: person({ ...A, burial_place: '  ' }),
      drop: person({ ...B, burial_place: ' Nghĩa trang Văn Điển ' })
    })
    expect(filled.personFills).toContainEqual({
      key: 'burialPlace',
      value: 'Nghĩa trang Văn Điển'
    })

    // Missing on a database without the column: nothing to fill.
    const missing = previewMerge({ ...baseInput, keep: A, drop: B })
    expect(missing.personFills.map((f) => f.key)).not.toContain('burialPlace')

    const kept = previewMerge({
      ...baseInput,
      keep: person({ ...A, burial_place: 'Quê nội' }),
      drop: person({ ...B, burial_place: 'Quê ngoại' })
    })
    expect(kept.personFills.map((f) => f.key)).not.toContain('burialPlace')
  })
})

describe('previewMerge warnings', () => {
  const F1 = 'aaaaaaaa-0000-0000-0000-000000000011'
  const F2 = 'aaaaaaaa-0000-0000-0000-000000000012'
  const M = 'aaaaaaaa-0000-0000-0000-000000000013'

  test('two different fathers on the two profiles', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        rel('r1', 'biological_child', F1, A.id),
        rel('r2', 'biological_child', F2, B.id)
      ],
      genders: { [F1]: 'male', [F2]: 'male' }
    })
    expect(preview.warnings).toEqual(['sameGenderParents'])
  })

  test('more than two birth parents', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        rel('r1', 'biological_child', F1, A.id),
        rel('r2', 'biological_child', M, A.id),
        rel('r3', 'biological_child', F2, B.id)
      ],
      genders: { [F1]: 'male', [F2]: 'male', [M]: 'female' }
    })
    expect(preview.warnings).toEqual(['tooManyParents'])
  })

  test('the dropped member is the keeper’s grandfather: a loop', () => {
    // B (dropped) -> X -> A (kept): A would become their own grandfather.
    const lineage = [
      rel('r1', 'biological_child', B.id, X),
      rel('r2', 'biological_child', X, A.id)
    ]
    const preview = previewMerge({
      ...baseInput,
      relationships: lineage,
      lineage,
      genders: { [X]: 'male' }
    })
    expect(preview.warnings).toEqual(['loop'])
    // Kept the other way round, the same loop.
    expect(
      previewMerge({ ...baseInput, keep: B, drop: A, lineage }).warnings
    ).toEqual(['loop'])
  })

  test('an ordinary merge has no warning', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        // Same father on both profiles, a mother only on the dropped one.
        rel('r1', 'biological_child', F1, A.id),
        rel('r2', 'biological_child', F1, B.id),
        rel('r3', 'biological_child', M, B.id),
        // A direct parent link between the two is just deleted.
        rel('r4', 'biological_child', B.id, A.id),
        rel('r5', 'biological_child', A.id, Y)
      ],
      genders: { [F1]: 'male', [M]: 'female' }
    })
    expect(preview.warnings).toEqual([])
  })

  test('parents of unknown gender are not compared', () => {
    const preview = previewMerge({
      ...baseInput,
      relationships: [
        rel('r1', 'biological_child', F1, A.id),
        rel('r2', 'biological_child', F2, B.id)
      ],
      genders: { [F1]: 'other', [F2]: 'other' }
    })
    expect(preview.warnings).toEqual([])
  })
})

describe('canConfirmMerge', () => {
  const ok = { confirmText: ' Nguyen Van An ', dropName: 'Nguyen Van An' }

  test('needs the preview and the exact name', () => {
    expect(canConfirmMerge({ ...ok, preview: null, acknowledged: false })).toBe(
      false
    )
    expect(
      canConfirmMerge({ ...ok, preview: { warnings: [] }, acknowledged: false })
    ).toBe(true)
    expect(
      canConfirmMerge({
        ...ok,
        confirmText: 'Nguyen Van',
        preview: { warnings: [] },
        acknowledged: false
      })
    ).toBe(false)
  })

  test('warnings block the merge until acknowledged', () => {
    const preview = { warnings: ['loop' as const] }
    expect(canConfirmMerge({ ...ok, preview, acknowledged: false })).toBe(false)
    expect(canConfirmMerge({ ...ok, preview, acknowledged: true })).toBe(true)
  })
})

describe('mergeIdsProblem', () => {
  const a = '3b241101-e2bb-4255-8caf-4136c566a962'
  const b = '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f'

  test('two different UUIDs pass', () => {
    expect(mergeIdsProblem(a, b)).toBeNull()
  })

  test('the same or an empty id is the same-member error', () => {
    expect(mergeIdsProblem(a, a)).toBe('same')
    expect(mergeIdsProblem('', b)).toBe('same')
  })

  test('a string that is not a UUID is blocked before the filter', () => {
    expect(mergeIdsProblem(`${a}),id.neq.(x`, b)).toBe('invalid')
    expect(mergeIdsProblem(a, 'abc')).toBe('invalid')
  })
})
