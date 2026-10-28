import { describe, expect, test } from 'bun:test'

import type { LimitedTextLabel } from '@/utils/limits'

import { globalErrorMessages } from './globalErrorMessages'
import { interpolate, messages, translate } from './messages'

describe('messages', () => {
  test('vi and en define the same keys', () => {
    expect(Object.keys(messages.en).sort()).toEqual(
      Object.keys(messages.vi).sort()
    )
  })

  test('english text of the date helpers has no Vietnamese words', () => {
    const keys = [
      'unknownDate',
      'leapMonth',
      'lunarDayMonth',
      'treeCanvasLabel',
      'treeKeyboardHint',
      'bubbleTreeLabel',
      'bubbleNodeBorn',
      'approvalEmailSubject',
      'approvalEmailTitle',
      'approvalEmailIntro',
      'approvalEmailButton',
      'approvalEmailExpiry',
      'approvalEmailText'
    ] as const
    for (const key of keys) {
      expect(messages.en[key]).not.toMatch(
        /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i
      )
    }
  })

  test('mergeFailedGeneric is a full sentence without a placeholder', () => {
    for (const locale of ['vi', 'en'] as const) {
      expect(messages[locale].mergeFailedGeneric).toBeTruthy()
      expect(messages[locale].mergeFailedGeneric).not.toContain('{')
    }
  })

  test('aboutDescription names the site through {siteName}', () => {
    for (const locale of ['vi', 'en'] as const) {
      expect(messages[locale].aboutDescription).toContain('{siteName}')
      expect(messages[locale].aboutDescription).not.toContain('Gia Phả OS')
    }
  })

  test('english backupPhotosNote contains photo', () => {
    expect(messages.en.backupPhotosNote.toLowerCase()).toContain('photo')
  })
})

describe('interpolate', () => {
  test('replaces every occurrence of a placeholder', () => {
    expect(interpolate('{name} và {name}', { name: 'An' })).toBe('An và An')
  })

  test('keeps $ patterns in values literal', () => {
    expect(interpolate('Vợ của {name}', { name: 'A$&B $1 $$' })).toBe(
      'Vợ của A$&B $1 $$'
    )
  })

  test('does not interpolate placeholders inside values', () => {
    expect(interpolate('{a} - {b}', { a: '{b}', b: 'Bình' })).toBe('{b} - Bình')
  })

  test('leaves unknown placeholders and templates without values as is', () => {
    expect(interpolate('{count} người', { name: 'An' })).toBe('{count} người')
    expect(interpolate('{count} người')).toBe('{count} người')
    expect(interpolate('{count} người', { count: 0 })).toBe('0 người')
  })

  test('translate uses the same interpolation', () => {
    expect(translate('en', 'spouseOf', { name: 'Tom $& Jerry' })).toBe(
      'Spouse of Tom $& Jerry'
    )
  })
})

describe('globalErrorMessages', () => {
  test('match the main dictionary', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const [key, value] of Object.entries(globalErrorMessages[locale])) {
        expect(messages[locale][key as keyof typeof messages.vi]).toBe(value)
      }
    }
  })

  test('every field checked by checkTextLength has a label in vi and en', () => {
    const labels: LimitedTextLabel[] = [
      'fullName',
      'note',
      'eventName',
      'location',
      'details'
    ]
    for (const locale of ['vi', 'en'] as const) {
      for (const label of labels) {
        const text = translate(locale, 'textTooLong', {
          field: translate(locale, label),
          max: 200
        })
        expect(text).toContain(messages[locale][label])
        expect(text).toContain('200')
        expect(text).not.toContain('{')
      }
    }
  })
})
