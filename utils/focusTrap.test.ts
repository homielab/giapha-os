import { describe, expect, test } from 'bun:test'

import { focusTrapTarget } from './focusTrap'

const list = ['a', 'b', 'c']

describe('focusTrapTarget', () => {
  test('Tab on the last item wraps to the first', () => {
    expect(focusTrapTarget(list, 'c', false)).toBe('a')
  })

  test('Shift+Tab on the first item wraps to the last', () => {
    expect(focusTrapTarget(list, 'a', true)).toBe('c')
  })

  test('leaves the middle of the list to the browser', () => {
    expect(focusTrapTarget(list, 'b', false)).toBeNull()
    expect(focusTrapTarget(list, 'b', true)).toBeNull()
    expect(focusTrapTarget(list, 'a', false)).toBeNull()
    expect(focusTrapTarget(list, 'c', true)).toBeNull()
  })

  test('focus outside the list goes to the first item', () => {
    expect(focusTrapTarget(list, 'x', false)).toBe('a')
    expect(focusTrapTarget(list, 'x', true)).toBe('a')
    expect(focusTrapTarget(list, null, false)).toBe('a')
  })

  test('an empty list gives null', () => {
    expect(focusTrapTarget([], null, false)).toBeNull()
    expect(focusTrapTarget([], 'x', true)).toBeNull()
  })

  test('a single item keeps focus on itself', () => {
    expect(focusTrapTarget(['a'], 'a', false)).toBe('a')
    expect(focusTrapTarget(['a'], 'a', true)).toBe('a')
  })
})
