import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  getMessages,
  type TranslationKey,
  type TranslationValues
} from '@/lib/i18n/messages'
import packageJson from '@/package.json'

import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from './testing/fakeSupabase'

// Admin-only server actions in app/actions/ (data, mergePersons, dataCheck,
// duplicateScan, lunarRecompute, migrations) with Supabase, the database
// driver, translations and the Next.js cache replaced. A non-admin must be
// refused before anything reaches the database.
const vi = getMessages('vi')

let isAdmin = false
let respond: (call: FakeCall) => FakeResult = () => ({ data: [] })
let calls: FakeCall[] = []
const getSupabase = mock(async () => {
  const fake = fakeSupabase((call) => respond(call))
  calls = fake.calls
  return fake.client
})
const revalidatePath = mock((path: string) => {
  void path
})

// postgres(): the tagged client of a transaction and the pool it came from.
let migrationSqlFails = false
const databaseEnd = mock(async (options?: unknown) => {
  void options
})
const transaction = Object.assign(
  async (strings: TemplateStringsArray, ...values: unknown[]) => {
    void strings
    void values
    return []
  },
  {
    unsafe: async (sql: string) => {
      if (migrationSqlFails && !sql.includes('app_migrations'))
        throw new Error('syntax error')
      return []
    }
  }
)
const database = {
  unsafe: async () => [],
  begin: async (run: (tx: typeof transaction) => Promise<unknown>) =>
    run(transaction),
  end: databaseEnd
}
const postgres = mock((url: string, options: unknown) => {
  void url
  void options
  return database
})

mock.module('@/utils/supabase/queries', () => ({
  getIsAdmin: async () => isAdmin,
  // Not used here; mock.module outlives the file, so keep every export.
  getUser: async () => null,
  getProfile: async () => null,
  getSupabase
}))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'vi',
    dictionary: vi,
    t: (key: TranslationKey, values?: TranslationValues) => {
      void values
      return vi[key]
    }
  })
}))
mock.module('next/cache', () => ({ revalidatePath }))
mock.module('postgres', () => ({ default: postgres }))

const { exportData, importData } = await import('@/app/actions/data')
const { checkTreeData } = await import('@/app/actions/dataCheck')
const { scanPossibleDuplicates } = await import('@/app/actions/duplicateScan')
const { applyLunarRecompute, previewLunarRecompute } =
  await import('@/app/actions/lunarRecompute')
const { loadMergePreview, mergePersons } =
  await import('@/app/actions/mergePersons')
const { getMigrationStatus, runPendingMigrations } =
  await import('@/app/actions/migrations')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

function backup() {
  return {
    version: 3,
    persons: [
      {
        id: A,
        full_name: 'Nguyễn Văn An',
        gender: 'male',
        is_deceased: false,
        is_in_law: false
      }
    ],
    relationships: [],
    person_details_private: [],
    custom_events: []
  } as unknown as Parameters<typeof importData>[0]
}

const originalFetch = globalThis.fetch
const originalError = console.error
const originalDatabaseUrl = process.env.SUPABASE_DB_URL
let fetchedVersion: string | null = packageJson.version
const fetchMock = mock(async (url: unknown) => {
  void url
  if (fetchedVersion === null) return new Response('nope', { status: 500 })
  return Response.json({ version: fetchedVersion })
})

beforeEach(() => {
  isAdmin = false
  respond = () => ({ data: [] })
  calls = []
  migrationSqlFails = false
  fetchedVersion = packageJson.version
  process.env.SUPABASE_DB_URL = 'postgres://user:pass@localhost:5432/db'
  globalThis.fetch = fetchMock as unknown as typeof fetch
  console.error = () => {}
  getSupabase.mockClear()
  revalidatePath.mockClear()
  postgres.mockClear()
  databaseEnd.mockClear()
  fetchMock.mockClear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.error = originalError
  if (originalDatabaseUrl === undefined) delete process.env.SUPABASE_DB_URL
  else process.env.SUPABASE_DB_URL = originalDatabaseUrl
})

const adminActions = {
  exportData: () => exportData(),
  importData: () => importData(backup()),
  checkTreeData: () => checkTreeData(),
  scanPossibleDuplicates: () => scanPossibleDuplicates(),
  previewLunarRecompute: () => previewLunarRecompute(),
  applyLunarRecompute: () => applyLunarRecompute([A]),
  loadMergePreview: () => loadMergePreview(A, B),
  mergePersons: () => mergePersons(A, B),
  runPendingMigrations: () => runPendingMigrations()
}

describe('admin server actions', () => {
  test.each(Object.entries(adminActions))(
    '%s refuses a non-admin without touching the database',
    async (_name, run) => {
      const result = (await run()) as { error?: string }
      expect([
        vi.dataAccessDenied,
        vi.migrationAccessDenied
      ] as string[]).toContain(result.error ?? '')
      expect(getSupabase).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(postgres).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    }
  )

  test('getMigrationStatus gives a non-admin only the file list', async () => {
    const status = await getMigrationStatus()
    expect(status.error).toBe(vi.migrationAccessDenied)
    expect(status.databaseReachable).toBe(false)
    expect(status.migrations.length).toBeGreaterThan(1)
    expect(status.migrations.every((m) => m.appliedAt === null)).toBe(true)
    expect(postgres).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('importData', () => {
  beforeEach(() => {
    isAdmin = true
  })

  test('refuses an invalid backup before the database', async () => {
    const result = await importData({ persons: [] } as never)
    expect('error' in result).toBe(true)
    expect(getSupabase).not.toHaveBeenCalled()
  })

  test('restores through the restore_backup function', async () => {
    const counts = { persons: 1, relationships: 0 }
    respond = () => ({ data: counts })
    const result = await importData(backup())
    expect(result).toMatchObject({ success: true, imported: counts })
    expect(calls.map((c) => c.table)).toEqual(['rpc:restore_backup'])
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/members')
  })

  test('reports a failed restore and keeps the cache as it was', async () => {
    respond = () => ({ error: { message: 'boom', code: 'XX000' } })
    expect(await importData(backup())).toEqual({
      error: vi.restoreTransactionError
    })
    expect(calls).toHaveLength(1)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('falls back to the legacy restore when the function is missing', async () => {
    respond = (call) =>
      call.op === 'rpc'
        ? { error: { message: 'not found', code: 'PGRST202' } }
        : { data: [] }
    const result = await importData(backup())
    expect(result).toMatchObject({
      success: true,
      warning: vi.restoreUpgradeDatabase
    })
    const ops = calls.map((c) => `${c.op}:${c.table}`)
    expect(ops.slice(0, 5)).toEqual([
      'rpc:rpc:restore_backup',
      'delete:custom_events',
      'delete:relationships',
      'delete:person_details_private',
      'delete:persons'
    ])
    expect(ops).toContain('insert:persons')
    expect(revalidatePath).toHaveBeenCalled()
  })

  test('the legacy restore stops at the first failed delete', async () => {
    respond = (call) => {
      if (call.op === 'rpc')
        return { error: { message: 'not found', code: '42883' } }
      if (call.table === 'relationships')
        return { error: { message: 'fk violation' } }
      return { data: [] }
    }
    const result = await importData(backup())
    expect(result).toEqual({
      error: `${vi.deleteRelationshipsError} ${vi.restoreUpgradeDatabase}`
    })
    expect(calls.some((c) => c.op === 'insert')).toBe(false)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('the legacy restore reports a failed insert', async () => {
    respond = (call) => {
      if (call.op === 'rpc')
        return { error: { message: 'not found', code: 'PGRST202' } }
      if (call.op === 'insert') return { error: { message: 'bad row' } }
      return { data: [] }
    }
    const result = await importData(backup())
    expect(result).toEqual({
      error: `${vi.importPersonsError} ${vi.restoreUpgradeDatabase}`
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('read-only admin scans', () => {
  beforeEach(() => {
    isAdmin = true
  })

  test('exportData reports a failed load', async () => {
    respond = () => ({ error: { message: 'down' } })
    expect(await exportData()).toEqual({ error: vi.loadDataError })
  })

  test.each([
    ['checkTreeData', checkTreeData],
    ['scanPossibleDuplicates', scanPossibleDuplicates]
  ])('%s passes a database error on', async (_name, run) => {
    respond = () => ({ error: { message: 'down' } })
    expect(await run()).toEqual({ error: 'down' })
  })

  test('previewLunarRecompute passes a database error on', async () => {
    respond = () => ({ error: { message: 'down' } })
    expect(await previewLunarRecompute()).toEqual({ error: 'down' })
  })
})

describe('lunar recompute', () => {
  beforeEach(() => {
    isAdmin = true
  })

  test('refuses a bad selection before the database', async () => {
    expect(await applyLunarRecompute(['not-an-id'])).toEqual({
      error: vi.lunarRecomputeInvalidSelection
    })
    expect(getSupabase).not.toHaveBeenCalled()
  })

  test('passes a failed load on without updating', async () => {
    respond = () => ({ error: { message: 'down' } })
    expect(await applyLunarRecompute([A])).toEqual({ error: 'down' })
    expect(calls.some((c) => c.op === 'update')).toBe(false)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('mergePersons', () => {
  beforeEach(() => {
    isAdmin = true
  })

  test.each([
    ['same member', A, A],
    ['empty id', A, '']
  ])('refuses %s before the database', async (_name, keep, drop) => {
    expect(await mergePersons(keep, drop)).toEqual({
      error: vi.mergeSameMember
    })
    expect(await loadMergePreview(keep, drop)).toEqual({
      error: vi.mergeSameMember
    })
    expect(getSupabase).not.toHaveBeenCalled()
  })

  test('asks for an upgrade when the function is missing', async () => {
    respond = () => ({ error: { message: 'none', code: 'PGRST202' } })
    expect(await mergePersons(A, B)).toEqual({ error: vi.mergeUpgradeDatabase })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('reports a failed merge without refreshing the pages', async () => {
    respond = () => ({ error: { message: 'boom', code: 'XX000' } })
    expect(await mergePersons(A, B)).toEqual({ error: vi.mergeFailed })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('merges through the merge_persons function', async () => {
    const summary = {
      relationships_moved: 1,
      relationships_dropped: 0,
      details_fields_filled: 0,
      person_fields_filled: 2
    }
    respond = () => ({ data: summary })
    expect(await mergePersons(A, B)).toEqual({ summary })
    expect(calls).toHaveLength(1)
    expect(calls[0].payload).toEqual({ keep_id: A, drop_id: B })
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/members')
  })

  test('the preview fails when a member is missing', async () => {
    respond = () => ({ data: [] })
    expect(await loadMergePreview(A, B)).toEqual({
      error: vi.mergeMemberMissing
    })
  })

  test('the preview passes a database error on', async () => {
    respond = (call) =>
      call.table === 'relationships'
        ? { error: { message: 'down' } }
        : { data: [] }
    expect(await loadMergePreview(A, B)).toEqual({ error: 'down' })
  })
})

describe('runPendingMigrations', () => {
  beforeEach(() => {
    isAdmin = true
  })

  test('stops when this copy of the app is outdated', async () => {
    fetchedVersion = '999.0.0'
    expect(await runPendingMigrations()).toEqual({
      success: false,
      error: vi.sourceOutdatedError
    })
    expect(postgres).not.toHaveBeenCalled()
  })

  test('stops when the latest version cannot be read', async () => {
    fetchedVersion = null
    expect(await runPendingMigrations()).toEqual({
      success: false,
      error: vi.sourceVersionCheckError
    })
    expect(postgres).not.toHaveBeenCalled()
  })

  test('stops without a database URL', async () => {
    delete process.env.SUPABASE_DB_URL
    expect(await runPendingMigrations()).toEqual({
      success: false,
      error: vi.databaseConfigMissing
    })
    expect(postgres).not.toHaveBeenCalled()
  })

  test('names the file of a failed migration and closes the connection', async () => {
    migrationSqlFails = true
    const result = await runPendingMigrations()
    expect(result).toEqual({
      success: false,
      error: vi.migrationFailed
    })
    expect(databaseEnd).toHaveBeenCalledTimes(1)
  })

  test('applies every pending migration', async () => {
    const result = await runPendingMigrations()
    expect(result).toMatchObject({ success: true })
    expect((result as { applied: string[] }).applied[0]).toBe('docs/schema.sql')
    expect(databaseEnd).toHaveBeenCalledTimes(1)
  })
})
