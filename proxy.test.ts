import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { NextRequest } from 'next/server'

import { proxy } from './proxy'

// Without Supabase settings updateSession passes /missing-db-config through,
// so the proxy runs without a Supabase mock.
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const request = (headers: Record<string, string>) =>
  new NextRequest(new URL('/missing-db-config', 'http://localhost:3000'), {
    headers
  })

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

afterAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
})

describe('proxy locale', () => {
  test('first visit from an English browser renders and stores English', async () => {
    const req = request({ 'accept-language': 'en-US,en;q=0.9' })
    const res = await proxy(req)
    expect(req.cookies.get('locale')?.value).toBe('en')
    const cookie = res.cookies.get('locale')
    expect(cookie?.value).toBe('en')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(31536000)
  })

  test('first visit from another browser stores Vietnamese', async () => {
    const res = await proxy(request({ 'accept-language': 'fr-FR' }))
    expect(res.cookies.get('locale')?.value).toBe('vi')
  })

  test('a chosen language is kept', async () => {
    const req = request({
      'accept-language': 'en-US,en;q=0.9',
      cookie: 'locale=vi'
    })
    const res = await proxy(req)
    expect(req.cookies.get('locale')?.value).toBe('vi')
    expect(res.cookies.get('locale')).toBeUndefined()
  })
})
