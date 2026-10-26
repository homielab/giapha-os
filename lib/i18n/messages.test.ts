import { describe, expect, test } from 'bun:test'

import { messages } from './messages'

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
})
