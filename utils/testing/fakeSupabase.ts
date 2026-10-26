import type { SupabaseClient } from '@supabase/supabase-js'

// A minimal stand-in for the Supabase query builder in unit tests. Every
// awaited query is recorded as a FakeCall and answered by `respond`, which
// returns `{ data, error }` like PostgREST does (Supabase never throws).
// Storage calls are recorded too, with `table` = `storage:<bucket>` and `op`
// = the storage method; `payload` holds its arguments.

export type FakeOp =
  | 'select'
  | 'insert'
  | 'update'
  | 'upsert'
  | 'delete'
  | 'upload'
  | 'remove'
  | 'createSignedUrls'

export interface FakeCall {
  table: string
  op: FakeOp
  payload?: unknown
  filters: [string, string, unknown][]
  single: boolean
}

export interface FakeResult {
  data?: unknown
  error?: { message: string; code?: string } | null
}

export function fakeSupabase(respond: (call: FakeCall) => FakeResult) {
  const calls: FakeCall[] = []

  const from = (table: string) => {
    const call: FakeCall = { table, op: 'select', filters: [], single: false }
    const builder = {
      select: () => builder,
      insert: (payload: unknown) => {
        call.op = 'insert'
        call.payload = payload
        return builder
      },
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        return builder
      },
      upsert: (payload: unknown) => {
        call.op = 'upsert'
        call.payload = payload
        return builder
      },
      delete: () => {
        call.op = 'delete'
        return builder
      },
      eq: (column: string, value: unknown) => {
        call.filters.push(['eq', column, value])
        return builder
      },
      in: (column: string, value: unknown) => {
        call.filters.push(['in', column, value])
        return builder
      },
      single: () => {
        call.single = true
        return builder
      },
      then: <T>(
        resolve: (value: { data: unknown; error: unknown }) => T,
        reject?: (reason: unknown) => T
      ) => {
        calls.push(call)
        try {
          const result = respond(call)
          return Promise.resolve(
            resolve({ data: result.data ?? null, error: result.error ?? null })
          )
        } catch (err) {
          return reject ? Promise.resolve(reject(err)) : Promise.reject(err)
        }
      }
    }
    return builder
  }

  const storageCall = (bucket: string, op: FakeOp, payload: unknown[]) => {
    const call: FakeCall = {
      table: `storage:${bucket}`,
      op,
      payload,
      filters: [],
      single: false
    }
    calls.push(call)
    try {
      const result = respond(call)
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null
      })
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const storage = {
    from: (bucket: string) => ({
      upload: (...args: unknown[]) => storageCall(bucket, 'upload', args),
      remove: (...args: unknown[]) => storageCall(bucket, 'remove', args),
      createSignedUrls: (...args: unknown[]) =>
        storageCall(bucket, 'createSignedUrls', args)
    })
  }

  return { client: { from, storage } as unknown as SupabaseClient, calls }
}
