import { describe, expect, test } from 'bun:test'

import { isOutsidePopup, shouldClosePopupOnKey } from './popupMenu'

describe('shouldClosePopupOnKey', () => {
  test('Escape closes an open menu', () => {
    expect(shouldClosePopupOnKey('Escape', true)).toBe(true)
  })

  test('Escape is ignored while the menu is closed', () => {
    expect(shouldClosePopupOnKey('Escape', false)).toBe(false)
  })

  test('other keys are ignored', () => {
    expect(shouldClosePopupOnKey('Enter', true)).toBe(false)
    expect(shouldClosePopupOnKey('Tab', true)).toBe(false)
    expect(shouldClosePopupOnKey('Esc', true)).toBe(false)
  })
})

describe('isOutsidePopup', () => {
  const inside = {} as Node
  const outside = {} as Node
  const container = { contains: (node: Node | null) => node === inside }

  test('a press inside the menu keeps it open', () => {
    expect(isOutsidePopup(container, inside)).toBe(false)
  })

  test('a press outside the menu closes it', () => {
    expect(isOutsidePopup(container, outside)).toBe(true)
  })

  test('nothing happens before the menu is mounted', () => {
    expect(isOutsidePopup(null, outside)).toBe(false)
  })
})
