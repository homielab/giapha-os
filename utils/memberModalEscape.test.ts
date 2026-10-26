import { describe, expect, it } from 'bun:test'

import { shouldCloseMemberModalOnEscape } from './memberModalEscape'

describe('shouldCloseMemberModalOnEscape', () => {
  it('closes the detail view', () => {
    expect(
      shouldCloseMemberModalOnEscape({
        isEditing: false,
        showCreateMember: false
      })
    ).toBe(true)
  })

  it('keeps the edit form open', () => {
    expect(
      shouldCloseMemberModalOnEscape({
        isEditing: true,
        showCreateMember: false
      })
    ).toBe(false)
  })

  it('keeps the create form open', () => {
    expect(
      shouldCloseMemberModalOnEscape({
        isEditing: false,
        showCreateMember: true
      })
    ).toBe(false)
  })
})
