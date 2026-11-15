import { describe, expect, test } from 'bun:test'

import { createCollapseStore } from './treeCollapseStore'

describe('createCollapseStore', () => {
  test('starts from the automatic baseline', () => {
    const store = createCollapseStore()
    const auto = new Set(['a'])
    expect(store.collapsed(auto)).toBe(auto)
    expect(store.branchState('a', auto)).toBe('collapsed')
    expect(store.branchState('b', auto)).toBe('expanded')
  })

  test('a toggle notifies and marks only the expanded branch as opened', () => {
    const store = createCollapseStore()
    const auto = new Set(['a', 'b'])
    let calls = 0
    store.subscribe(() => calls++)

    store.toggle('a', auto)
    expect(calls).toBe(1)
    expect(store.branchState('a', auto)).toBe('opened')
    expect(store.branchState('b', auto)).toBe('collapsed')

    store.toggle('b', auto)
    expect(store.branchState('a', auto)).toBe('expanded')
    expect(store.branchState('b', auto)).toBe('opened')

    store.toggle('a', auto)
    expect(store.branchState('a', auto)).toBe('collapsed')
    expect(store.branchState('b', auto)).toBe('expanded')
  })

  test('the collapsed set keeps its identity between toggles', () => {
    const store = createCollapseStore()
    const auto = new Set<string>()
    store.toggle('a', auto)
    expect(store.collapsed(auto)).toBe(store.collapsed(auto))
  })

  test('a new baseline drops manual toggles', () => {
    const store = createCollapseStore()
    store.toggle('a', new Set(['a']))
    const next = new Set(['a'])
    expect(store.collapsed(next)).toBe(next)
    expect(store.branchState('a', next)).toBe('collapsed')
  })
})
