import { afterEach, describe, expect, test } from 'bun:test'

import {
  databaseUrl,
  supabasePublishableKey,
  supabaseSecretKey
} from '@/utils/supabase/env'

const NAMES = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_DB_URL',
  'POSTGRES_URL_NON_POOLING'
]
const saved = Object.fromEntries(NAMES.map((n) => [n, process.env[n]]))

afterEach(() => {
  for (const n of NAMES) {
    if (saved[n] === undefined) delete process.env[n]
    else process.env[n] = saved[n]
  }
})

function clear() {
  for (const n of NAMES) delete process.env[n]
}

describe('Supabase settings', () => {
  test('the documented names win', () => {
    clear()
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'documented'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'vercel'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'documented'
    process.env.SUPABASE_SECRET_KEY = 'vercel'
    process.env.SUPABASE_DB_URL = ' postgres://documented '
    process.env.POSTGRES_URL_NON_POOLING = 'postgres://vercel'
    expect(supabasePublishableKey()).toBe('documented')
    expect(supabaseSecretKey()).toBe('documented')
    expect(databaseUrl()).toBe('postgres://documented')
  })

  test('falls back to the names of the Vercel integration', () => {
    clear()
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'vercel'
    process.env.SUPABASE_SECRET_KEY = 'vercel'
    process.env.SUPABASE_DB_URL = ''
    process.env.POSTGRES_URL_NON_POOLING = 'postgres://vercel'
    expect(supabasePublishableKey()).toBe('vercel')
    expect(supabaseSecretKey()).toBe('vercel')
    expect(databaseUrl()).toBe('postgres://vercel')
  })

  test('accepts the legacy anon key name', () => {
    clear()
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    expect(supabasePublishableKey()).toBe('anon')
  })
})
