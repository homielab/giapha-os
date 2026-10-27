import { describe, expect, test } from 'bun:test'

import { noticeAria, noticeRole } from '@/utils/a11y'

describe('noticeRole', () => {
  test('errors are alerts', () => {
    expect(noticeRole('error')).toBe('alert')
  })
  test('success, info and warning are status', () => {
    expect(noticeRole('success')).toBe('status')
    expect(noticeRole('info')).toBe('status')
    expect(noticeRole('warning')).toBe('status')
  })
})

describe('noticeAria', () => {
  test('alert is assertive, status is polite', () => {
    expect(noticeAria('error')).toEqual({
      role: 'alert',
      'aria-live': 'assertive'
    })
    expect(noticeAria('success')).toEqual({
      role: 'status',
      'aria-live': 'polite'
    })
  })
})
