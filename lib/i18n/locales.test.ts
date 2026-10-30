import { describe, expect, test } from 'bun:test'

import { localeFromAcceptLanguage } from './locales'

describe('localeFromAcceptLanguage', () => {
  test('English browsers get English', () => {
    expect(localeFromAcceptLanguage('en-US,en;q=0.9')).toBe('en')
    expect(localeFromAcceptLanguage('EN')).toBe('en')
  })

  test('Vietnamese, other or missing languages get Vietnamese', () => {
    expect(localeFromAcceptLanguage('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi')
    expect(localeFromAcceptLanguage('fr-FR,de;q=0.8')).toBe('vi')
    expect(localeFromAcceptLanguage('*')).toBe('vi')
    expect(localeFromAcceptLanguage('')).toBe('vi')
    expect(localeFromAcceptLanguage(null)).toBe('vi')
  })

  test('follows q values, then order', () => {
    expect(localeFromAcceptLanguage('fr,en;q=0.5,vi;q=0.4')).toBe('en')
    expect(localeFromAcceptLanguage('en;q=0.3,vi;q=0.7')).toBe('vi')
    expect(localeFromAcceptLanguage('en;q=0,fr')).toBe('vi')
    expect(localeFromAcceptLanguage('vi,en')).toBe('vi')
  })
})
