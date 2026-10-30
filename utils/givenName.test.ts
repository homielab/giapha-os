import { describe, expect, test } from 'bun:test'

import { compareByGivenName, givenName } from './givenName'

describe('givenName', () => {
  test('takes the last word', () => {
    expect(givenName('Nguyễn Văn An')).toBe('An')
    expect(givenName('  Hoa  ')).toBe('Hoa')
    expect(givenName('')).toBe('')
  })
})

describe('compareByGivenName', () => {
  test('sorts a one-surname family by given name', () => {
    const names = [
      'Nguyễn Văn An',
      'Nguyễn Thị Hoa',
      'Nguyễn Đức Bình',
      'Nguyễn Văn Cường'
    ]
    expect(names.sort(compareByGivenName)).toEqual([
      'Nguyễn Văn An',
      'Nguyễn Đức Bình',
      'Nguyễn Văn Cường',
      'Nguyễn Thị Hoa'
    ])
  })

  test('uses Vietnamese order for diacritics and one-word names', () => {
    expect(['Ấn', 'Lê Ân', 'An'].sort(compareByGivenName)).toEqual([
      'An',
      'Lê Ân',
      'Ấn'
    ])
  })

  test('falls back to the full name for the same given name', () => {
    expect(['Trần Văn An', 'Lê Thị An'].sort(compareByGivenName)).toEqual([
      'Lê Thị An',
      'Trần Văn An'
    ])
  })
})
