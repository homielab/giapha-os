import { describe, expect, test } from 'bun:test'

import { escapeLike } from './escapeLike'

describe('escapeLike', () => {
  test('leaves a value without wildcards unchanged', () => {
    expect(escapeLike('abc/photo.jpg')).toBe('abc/photo.jpg')
  })

  test('escapes %, _ and the backslash itself', () => {
    expect(escapeLike('a_b%c\\d')).toBe('a\\_b\\%c\\\\d')
  })
})
