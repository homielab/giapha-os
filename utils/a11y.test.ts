import { describe, expect, test } from 'bun:test'

import {
  clickableProps,
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

describe('clickableProps', () => {
  const key = (k: string) => {
    let prevented = false
    return {
      key: k,
      preventDefault: () => {
        prevented = true
      },
      get prevented() {
        return prevented
      }
    }
  }

  test('nothing to do: no role and not in the Tab order', () => {
    expect(clickableProps(null)).toEqual({})
  })

  test('a button in the Tab order that opens on click', () => {
    let calls = 0
    const props = clickableProps(() => calls++)
    expect(props.role).toBe('button')
    expect(props.tabIndex).toBe(0)
    props.onClick?.()
    expect(calls).toBe(1)
  })

  test('Enter and Space open it without scrolling the page', () => {
    let calls = 0
    const props = clickableProps(() => calls++)
    for (const k of ['Enter', ' ']) {
      const e = key(k)
      props.onKeyDown?.(e)
      expect(e.prevented).toBe(true)
    }
    expect(calls).toBe(2)
  })

  test('other keys do nothing', () => {
    let calls = 0
    const props = clickableProps(() => calls++)
    const e = key('Tab')
    props.onKeyDown?.(e)
    expect(e.prevented).toBe(false)
    expect(calls).toBe(0)
  })
})
