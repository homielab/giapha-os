import { describe, expect, test } from 'bun:test'

import {
  APPROVAL_TOKEN_TTL_DAYS,
  createApprovalToken,
  getApprovalTokenExpiry,
  hashApprovalToken
} from './approval'

describe('createApprovalToken', () => {
  test('is URL-safe and long enough to be unguessable', () => {
    const token = createApprovalToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token.length).toBeGreaterThanOrEqual(43)
  })

  test('is unique on every call', () => {
    const tokens = new Set(Array.from({ length: 200 }, createApprovalToken))
    expect(tokens.size).toBe(200)
  })
})

describe('hashApprovalToken', () => {
  test('is stable for the same token', () => {
    expect(hashApprovalToken('abc')).toBe(hashApprovalToken('abc'))
  })

  test('is a sha256 hex digest that differs per token', () => {
    const hash = hashApprovalToken('abc')
    expect(hash).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
    expect(hashApprovalToken('abd')).not.toBe(hash)
  })

  test('does not contain the token itself', () => {
    const token = createApprovalToken()
    expect(hashApprovalToken(token)).not.toContain(token)
  })
})

describe('getApprovalTokenExpiry', () => {
  test('expires in 7 days', () => {
    expect(APPROVAL_TOKEN_TTL_DAYS).toBe(7)
    const before = new Date()
    const expiry = new Date(getApprovalTokenExpiry())
    const after = new Date()
    const min = new Date(before)
    min.setDate(min.getDate() + 7)
    const max = new Date(after)
    max.setDate(max.getDate() + 7)
    expect(expiry.getTime()).toBeGreaterThanOrEqual(min.getTime())
    expect(expiry.getTime()).toBeLessThanOrEqual(max.getTime())
  })

  test('is an ISO timestamp', () => {
    const value = getApprovalTokenExpiry()
    expect(new Date(value).toISOString()).toBe(value)
  })
})
