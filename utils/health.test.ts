import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, test } from 'bun:test'

import { checkHealth } from '@/utils/health'

function clientReturning(
  result: { error: { code: string; message: string } | null } | Error
) {
  return {
    from: () => ({
      select: () => ({
        limit: async () => {
          if (result instanceof Error) throw result
          return result
        }
      })
    })
  } as unknown as SupabaseClient
}

describe('checkHealth', () => {
  test('ok when the query succeeds', async () => {
    expect(await checkHealth(clientReturning({ error: null }))).toEqual({
      status: 'ok',
      database: 'ok'
    })
  })

  test('ok when only the table permission is missing: the database answered', async () => {
    const result = await checkHealth(
      clientReturning({
        error: { code: '42501', message: 'permission denied' }
      })
    )
    expect(result.status).toBe('ok')
  })

  test('error when the database fails or cannot be reached', async () => {
    expect(
      await checkHealth(
        clientReturning({ error: { code: 'PGRST000', message: 'down' } })
      )
    ).toEqual({ status: 'error', database: 'unreachable' })
    expect(
      await checkHealth(clientReturning(new Error('fetch failed')))
    ).toEqual({
      status: 'error',
      database: 'unreachable'
    })
  })

  test('error without Supabase settings', async () => {
    expect(await checkHealth(null)).toEqual({
      status: 'error',
      database: 'not_configured'
    })
  })
})
