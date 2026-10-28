import { describe, expect, test } from 'bun:test'

import type { SupabaseClient } from '@supabase/supabase-js'

import { fakeSupabase } from '@/utils/testing/fakeSupabase'

import { createSessionQueries, type RequestCache } from './sessionQueries'

// Like React's server `cache` within one request: one result per function and
// argument list.
function requestCache(): RequestCache {
  return (fn) => {
    const results = new Map<string, ReturnType<typeof fn>>()
    return (...args) => {
      const key = JSON.stringify(args)
      if (!results.has(key)) results.set(key, fn(...args))
      return results.get(key)!
    }
  }
}

function setup(user: { id: string } | null) {
  const fake = fakeSupabase((call) =>
    call.table === 'profiles'
      ? { data: { id: user?.id, role: 'admin', is_active: true } }
      : { data: null }
  )
  let authChecks = 0
  let clients = 0
  const client = {
    ...fake.client,
    auth: {
      getUser: async () => {
        authChecks++
        return { data: { user } }
      }
    }
  } as unknown as SupabaseClient
  const queries = createSessionQueries(requestCache(), async () => {
    clients++
    return client
  })
  const profileQueries = () =>
    fake.calls.filter((call) => call.table === 'profiles').length
  return {
    queries,
    profileQueries,
    authChecks: () => authChecks,
    clients: () => clients,
    calls: fake.calls
  }
}

describe('createSessionQueries', () => {
  test('a dashboard layout and its page read the profile once', async () => {
    const { queries, profileQueries, authChecks, clients, calls } = setup({
      id: 'user-1'
    })

    // app/dashboard/layout.tsx
    const user = await queries.getUser()
    const layoutProfile = await queries.getProfile()
    // A page such as members/page.tsx, plus an admin check.
    const pageProfile = await queries.getProfile()
    const isAdmin = await queries.getIsAdmin()

    expect(user?.id).toBe('user-1')
    expect(pageProfile).toBe(layoutProfile)
    expect(isAdmin).toBe(true)
    expect(profileQueries()).toBe(1)
    expect(calls[0].filters).toEqual([['eq', 'id', 'user-1']])
    expect(authChecks()).toBe(1)
    expect(clients()).toBe(1)
  })

  test('a signed-out request reads no profile', async () => {
    const { queries, profileQueries } = setup(null)

    expect(await queries.getProfile()).toBeNull()
    expect(await queries.getIsAdmin()).toBe(false)
    expect(profileQueries()).toBe(0)
  })
})
