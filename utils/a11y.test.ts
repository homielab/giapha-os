import { describe, expect, test } from 'bun:test'

import {
  disclosureButtonProps,
  noticeAria,
  noticeRole,
  toggleButtonProps
} from '@/utils/a11y'

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

describe('toggleButtonProps', () => {
  test('names the button and reports whether it is selected', () => {
    expect(toggleButtonProps('Danh sách', true)).toEqual({
      'aria-label': 'Danh sách',
      'aria-pressed': true
    })
    expect(toggleButtonProps('Cây', false)).toEqual({
      'aria-label': 'Cây',
      'aria-pressed': false
    })
  })
})

describe('disclosureButtonProps', () => {
  test('names the button, its panel and whether the panel is open', () => {
    expect(disclosureButtonProps('Hiển thị', false, 'panel-1')).toEqual({
      'aria-label': 'Hiển thị',
      'aria-expanded': false,
      'aria-controls': 'panel-1'
    })
    expect(disclosureButtonProps('Hiển thị', true, 'panel-1')).toMatchObject({
      'aria-expanded': true
    })
  })
})
