import { describe, expect, test } from 'bun:test'

import { Person } from '@/types'

import {
  getMemberFormInitialValues,
  hasGenerationChanged,
  toNumberOrEmpty
} from './memberFormInit'

const person: Person = {
  id: 'p1',
  full_name: 'Nguyễn Văn An',
  gender: 'female',
  birth_year: 1950,
  birth_month: 3,
  birth_day: 7,
  death_year: 2020,
  death_month: 11,
  death_day: 2,
  avatar_url: null,
  note: 'Ghi chú',
  created_at: '',
  updated_at: '',
  phone_number: '0900000000',
  occupation: 'Giáo viên',
  current_residence: 'Huế',
  death_lunar_year: 2020,
  death_lunar_month: 9,
  death_lunar_day: 17,
  is_deceased: true,
  is_in_law: true,
  birth_order: 2,
  generation: 3,
  other_names: 'Tư',
  burial_place: 'Nghĩa trang X'
}

describe('getMemberFormInitialValues', () => {
  test('a new member starts empty, male, alive and updating descendants', () => {
    expect(getMemberFormInitialValues()).toEqual({
      fullName: '',
      otherNames: '',
      gender: 'male',
      birthYear: '',
      birthMonth: '',
      birthDay: '',
      deathYear: '',
      deathMonth: '',
      deathDay: '',
      deathLunarYear: '',
      deathLunarMonth: '',
      deathLunarDay: '',
      isDeceased: false,
      burialPlace: '',
      isInLaw: false,
      birthOrder: '',
      generation: '',
      updateDescendantGenerations: true,
      note: '',
      phoneNumber: '',
      occupation: '',
      currentResidence: ''
    })
  })

  test('an existing member fills every field', () => {
    expect(getMemberFormInitialValues(person)).toEqual({
      fullName: 'Nguyễn Văn An',
      otherNames: 'Tư',
      gender: 'female',
      birthYear: 1950,
      birthMonth: 3,
      birthDay: 7,
      deathYear: 2020,
      deathMonth: 11,
      deathDay: 2,
      deathLunarYear: 2020,
      deathLunarMonth: 9,
      deathLunarDay: 17,
      isDeceased: true,
      burialPlace: 'Nghĩa trang X',
      isInLaw: true,
      birthOrder: 2,
      generation: 3,
      updateDescendantGenerations: true,
      note: 'Ghi chú',
      phoneNumber: '0900000000',
      occupation: 'Giáo viên',
      currentResidence: 'Huế'
    })
  })

  test('null columns and missing private fields become empty values', () => {
    const sparse: Person = {
      ...person,
      birth_year: null,
      birth_month: null,
      birth_day: null,
      death_year: null,
      note: null,
      other_names: null,
      birth_order: null,
      generation: null,
      is_deceased: false,
      is_in_law: false,
      phone_number: undefined,
      occupation: null,
      current_residence: undefined,
      burial_place: null
    }
    const values = getMemberFormInitialValues(sparse)
    expect(values.birthYear).toBe('')
    expect(values.deathYear).toBe('')
    expect(values.note).toBe('')
    expect(values.otherNames).toBe('')
    expect(values.birthOrder).toBe('')
    expect(values.generation).toBe('')
    expect(values.phoneNumber).toBe('')
    expect(values.occupation).toBe('')
    expect(values.currentResidence).toBe('')
    expect(values.isDeceased).toBe(false)
    expect(values.burialPlace).toBe('')
  })
})

describe('hasGenerationChanged', () => {
  test('only when editing and the generation really changed', () => {
    expect(hasGenerationChanged(true, person, 4)).toBe(true)
    expect(hasGenerationChanged(true, person, 3)).toBe(false)
  })

  test('is false when creating, clearing the field or without a saved value', () => {
    expect(hasGenerationChanged(false, person, 4)).toBe(false)
    expect(hasGenerationChanged(true, person, '')).toBe(false)
    expect(hasGenerationChanged(true, undefined, 4)).toBe(false)
  })
})

describe('toNumberOrEmpty', () => {
  test('converts digits and keeps an empty input empty', () => {
    expect(toNumberOrEmpty('12')).toBe(12)
    expect(toNumberOrEmpty('')).toBe('')
    expect(toNumberOrEmpty('0')).toBe(0)
  })
})
