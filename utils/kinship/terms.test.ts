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
    ['Mẹ', 'Mẹ vợ'],
    ['Anh trai', 'Anh vợ'],
    ['Chị gái', 'Chị vợ'],
    ['Em trai', 'Em vợ'],
    ['Em họ', 'Em vợ (họ)'],
    ['Chị họ', 'Chị vợ (họ)'],
    ['Anh họ', 'Anh vợ (họ)'],
    ['Anh/Em trai', 'Anh/Em vợ'],
    ['Chị/Em gái', 'Chị/Em vợ'],
    ['Anh/Em họ', 'Anh/Em vợ (họ)'],
    ['Chị/Em họ', 'Chị/Em vợ (họ)']
  ])('%s takes the suffix: %s', (term, expected) => {
    expect(callSpouseRelative(term, ' vợ')).toBe(expected)
  })

  test('parents and siblings of the husband take chồng', () => {
    expect(callSpouseRelative('Mẹ', ' chồng')).toBe('Mẹ chồng')
    expect(callSpouseRelative('Chị gái', ' chồng')).toBe('Chị chồng')
  })

  // "Cô vợ" would mean the wife herself: the other relatives are called
  // as the spouse calls them.
  test.each([
    'Cô',
    'Dì',
    'Bác',
    'Chú',
    'Cậu',
    'Bác họ',
    'Cậu họ',
    'Ông nội',
    'Bà ngoại',
    'Cụ bà (bà cố) nội',
    'Bà Cô',
    'Bác/Chú',
    'Bác/Cô họ',
    'Con',
    'Cháu họ',
    'Chắt'
  ])('%s keeps the spouse’s term', (term) => {
    expect(callSpouseRelative(term, ' vợ')).toBe(term)
    expect(callSpouseRelative(term, ' chồng')).toBe(term)
  })
})

describe('in-law terms when the relative age is unknown', () => {
  test.each([
    ['Anh/Em trai', 'male', 'Anh/Em rể', 'Anh/Em rể'],
    ['Anh/Em trai', 'female', 'Chị/Em dâu', 'Chị/Em dâu'],
    ['Chị/Em gái', 'male', 'Anh/Em rể', 'Anh/Em rể'],
    ['Chị/Em gái', 'female', 'Chị/Em dâu', 'Chị/Em dâu'],
    ['Anh/Em họ', 'female', 'Chị/Em dâu (họ)', 'Chị/Em dâu (họ)'],
    ['Chị/Em họ', 'male', 'Anh/Em rể (họ)', 'Anh/Em rể (họ)'],
    ['Bác/Chú', 'female', 'Bác gái/Thím', 'Bác gái/Thím'],
    ['Bác/Cô', 'male', 'Bác/Dượng', 'Bác/Dượng'],
    ['Bác/Chú họ', 'female', 'Bác gái/Thím họ', 'Bác gái/Thím họ']
  ] as const)('%s, %s', (term, gender, calledByRelative, spouseOf) => {
    expect(termRelativeCallsInLaw(term, gender)).toBe(calledByRelative)
    expect(termForSpouseOfRelative(term, gender)).toBe(spouseOf)
  })
})

describe('calling the person who married in', () => {
  test.each([
    ['Ông Cậu', 'female', 'Bà Mợ'],
    ['Bà Dì', 'male', 'Ông Dượng'],
    ['Bà Bác', 'male', 'Ông Bác'],
    ['Ông Bác', 'female', 'Bà Bác'],
    ['Cậu họ', 'female', 'Mợ họ'],
    ['Dì họ', 'male', 'Dượng họ'],
    ['Cô họ', 'male', 'Dượng họ']
  ] as const)('spouse of %s (%s) is %s', (term, gender, spouse) => {
    expect(termForSpouseOfRelative(term, gender)).toBe(spouse)
    expect(termRelativeCallsInLaw(term, gender)).toBe(spouse)
  })

  test('the spouse of Bác họ is Bác gái họ / Bác trai họ', () => {
    expect(termForSpouseOfRelative('Bác họ', 'female')).toBe('Bác gái họ')
    expect(termForSpouseOfRelative('Bác họ', 'male')).toBe('Bác trai họ')
  })

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
    expect(termForSpouseOfRelative('Bác họ', 'female')).toBe('Bác gái họ')
  })

  test('descendants and cousins keep the dâu/rể form', () => {
    expect(termForSpouseOfRelative('Chắt', 'female')).toBe('Chắt dâu')
    expect(termForSpouseOfRelative('Chắt', 'male')).toBe('Chắt rể')
    expect(termForSpouseOfRelative('Chít', 'female')).toBe('Chít dâu')
    expect(termForSpouseOfRelative('Chẹt', 'male')).toBe('Chẹt rể')
    expect(termRelativeCallsInLaw('Chút', 'female')).toBe('Chút dâu')
    expect(termForSpouseOfRelative('Cháu họ', 'female')).toBe('Cháu dâu (họ)')
    expect(termForSpouseOfRelative('Cháu họ', 'male')).toBe('Cháu rể (họ)')
  })

  test('terms without an entry fall back to husband/wife of', () => {
    expect(termRelativeCallsInLaw('Cháu đời 9', 'male')).toBe(
      'Chồng của Cháu đời 9'
    )
    expect(termRelativeCallsInLaw('constructor', 'female')).toBe(
      'Vợ của constructor'
    )
  })
})
