import { describe, expect, test } from 'bun:test'

import { isFormDirty, type MemberFormValues } from '@/utils/memberForm/dirty'
import { getMemberFormInitialValues } from '@/utils/memberFormInit'

const blank = (): MemberFormValues => {
  const values: Partial<ReturnType<typeof getMemberFormInitialValues>> =
    getMemberFormInitialValues()
  delete values.updateDescendantGenerations
  return values as MemberFormValues
}

describe('isFormDirty', () => {
  test('untouched form is clean', () => {
    expect(isFormDirty(blank(), blank())).toBe(false)
  })

  test('whitespace-only differences are clean', () => {
    const initial = { ...blank(), fullName: 'Nguyễn Văn A', note: '' }
    const current = { ...initial, fullName: '  Nguyễn Văn A ', note: '   ' }
    expect(isFormDirty(initial, current)).toBe(false)
  })

  test('any changed field makes it dirty', () => {
    const changes: Partial<MemberFormValues>[] = [
      { fullName: 'A' },
      { gender: 'female' },
      { birthYear: 1950 },
      { deathLunarDay: 3 },
      { isDeceased: true },
      { isInLaw: true },
      { generation: 2 },
      { note: 'ghi chú' },
      { phoneNumber: '0912' },
      { currentResidence: 'Hà Nội' }
    ]
    for (const change of changes) {
      expect(isFormDirty(blank(), { ...blank(), ...change })).toBe(true)
    }
  })

  test('clearing a saved value is dirty', () => {
    const initial = { ...blank(), birthYear: 1950 as const }
    expect(isFormDirty(initial, { ...initial, birthYear: '' })).toBe(true)
  })

  test('picked or removed avatar is dirty', () => {
    expect(isFormDirty(blank(), blank(), true)).toBe(true)
  })
})
