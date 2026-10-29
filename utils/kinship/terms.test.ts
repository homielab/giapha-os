import { describe, expect, test } from 'bun:test'

import {
  callSpouseRelative,
  getDirectAncestorTerm,
  getDirectDescendantTerm,
  termForSpouseOfRelative,
  termRelativeCallsInLaw
} from './terms'

describe('direct line terms', () => {
  test('ancestors by depth, gender and side', () => {
    expect(getDirectAncestorTerm(1, 'male', true)).toBe('Bố')
    expect(getDirectAncestorTerm(1, 'female', true)).toBe('Mẹ')
    expect(getDirectAncestorTerm(2, 'female', false)).toBe('Bà ngoại')
    expect(getDirectAncestorTerm(3, 'male', true)).toBe('Cụ ông (ông cố) nội')
    expect(getDirectAncestorTerm(9, 'male', true)).toBe('Diễn')
    expect(getDirectAncestorTerm(10, 'male', true)).toBe('Tổ đời 10')
  })

  test('descendants by depth', () => {
    expect(getDirectDescendantTerm(1)).toBe('Con')
    expect(getDirectDescendantTerm(8)).toBe('Chẹt')
    expect(getDirectDescendantTerm(9)).toBe('Cháu đời 9')
  })
})

describe('calling the blood relative of a spouse', () => {
  test.each([
    ['Bố', 'Bố vợ'],
    ['Ông nội', 'Ông nội vợ'],
    ['Cụ bà (bà cố) nội', 'Cụ bà (bà cố) nội vợ'],
    ['Anh trai', 'Anh vợ'],
    ['Chị gái', 'Chị vợ'],
    ['Em trai', 'Em vợ'],
    ['Em họ', 'Em vợ (họ)'],
    ['Chị họ', 'Chị vợ (họ)'],
    ['Anh họ', 'Anh vợ (họ)'],
    ['Bác', 'Bác vợ'],
    ['Cậu họ', 'Cậu vợ'],
    ['Cháu họ', 'Cháu vợ'],
    ['Con', 'Con'],
    ['Chắt', 'Chắt']
  ])('%s', (term, expected) => {
    expect(callSpouseRelative(term, ' vợ', true)).toBe(expected)
  })

  test('the "họ" is kept when the spouse side is B', () => {
    expect(callSpouseRelative('Bác họ', ' chồng', false)).toBe('Bác họ chồng')
    expect(callSpouseRelative('Bác họ', ' chồng', true)).toBe('Bác chồng')
  })
})

describe('calling the person who married in', () => {
  test('Con and Cháu depend on the gender', () => {
    expect(termRelativeCallsInLaw('Con', 'male')).toBe('Con rể')
    expect(termRelativeCallsInLaw('Con', 'female')).toBe('Con dâu')
    expect(termForSpouseOfRelative('Cháu', 'male')).toBe('Cháu rể')
  })

  test('older and younger siblings differ between the two directions', () => {
    expect(termRelativeCallsInLaw('Anh trai', 'other')).toBe('Chị dâu')
    expect(termForSpouseOfRelative('Anh trai', 'other')).toBe('Anh rể')
    expect(termForSpouseOfRelative('Chị gái', 'male')).toBe('Anh rể')
  })

  test('spouses of uncles and aunts are Thím, Mợ, Dượng, Bác gái', () => {
    expect(termForSpouseOfRelative('Chú', 'female')).toBe('Thím')
    expect(termForSpouseOfRelative('Cậu', 'female')).toBe('Mợ')
    expect(termForSpouseOfRelative('Cô', 'male')).toBe('Dượng')
    expect(termForSpouseOfRelative('Dì', 'male')).toBe('Dượng')
    expect(termForSpouseOfRelative('Bác', 'female')).toBe('Bác gái')
    expect(termForSpouseOfRelative('Bác', 'male')).toBe('Bác')
    expect(termRelativeCallsInLaw('Chú', 'female')).toBe('Thím')
    expect(termRelativeCallsInLaw('Cậu', 'female')).toBe('Mợ')
    expect(termForSpouseOfRelative('Bà Cô', 'male')).toBe('Ông Dượng')
    expect(termRelativeCallsInLaw('Bác họ', 'female')).toBe('Bác họ')
    expect(termForSpouseOfRelative('Bác họ', 'female')).toBe('Vợ của Bác họ')
  })

  test('terms without an entry fall back to husband/wife of', () => {
    expect(termRelativeCallsInLaw('Chắt', 'male')).toBe('Chồng của Chắt')
    expect(termRelativeCallsInLaw('constructor', 'female')).toBe(
      'Vợ của constructor'
    )
  })
})
