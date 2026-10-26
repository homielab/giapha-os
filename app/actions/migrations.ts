'use server'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import postgres from 'postgres'

import { getServerTranslations } from '@/lib/i18n/server'
import packageJson from '@/package.json'
import { getIsAdmin } from '@/utils/supabase/queries'
import { compareVersions, parseVersion } from '@/utils/version'

const SOURCE_REPOSITORY = 'homielab/giapha-os'
const SOURCE_BRANCH = 'main'
const SOURCE_README_URL = `https://github.com/${SOURCE_REPOSITORY}/blob/${SOURCE_BRANCH}/README.md#hướng-dẫn-cập-nhật-source-code`
const SOURCE_README_EN_URL = `https://github.com/${SOURCE_REPOSITORY}/blob/${SOURCE_BRANCH}/README.en.md#source-code-updates`
const SOURCE_PACKAGE_URL = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${SOURCE_BRANCH}/package.json`

interface MigrationDefinition {
  id: string
  file: string
  sql: string
}

export interface MigrationStatus {
  configured: boolean
  databaseReachable: boolean
  error?: string
  source: SourceVersionStatus
  migrations: Array<{
    id: string
    file: string
    appliedAt: string | null
  }>
}

export type SourceVersionState = 'current' | 'outdated' | 'unknown'

export interface SourceVersionStatus {
  state: SourceVersionState
  currentVersion: string | null
  latestVersion: string | null
  readmeUrl: string
  error?: string
}

export async function getSourceVersionStatus(): Promise<SourceVersionStatus> {
  const { locale, t } = await getServerTranslations()
  const sourceReadmeUrl =
    locale === 'en' ? SOURCE_README_EN_URL : SOURCE_README_URL
  const currentVersion = parseVersion(packageJson.version)
  const currentVersionLabel =
    typeof packageJson.version === 'string' ? packageJson.version : null

  try {
    const response = await fetch(SOURCE_PACKAGE_URL, {
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`)
    }

    const data = (await response.json()) as { version?: unknown }
    const latestVersionLabel =
      typeof data.version === 'string' ? data.version : null
    const latestVersion = parseVersion(data.version)

    if (!latestVersion || !latestVersionLabel) {
      throw new Error('GitHub package.json did not include a valid version.')
    }

    const comparison = currentVersion
      ? compareVersions(currentVersion, latestVersion)
      : null

    return {
      state:
        comparison === null
          ? 'unknown'
          : comparison < 0
            ? 'outdated'
            : 'current',
      currentVersion: currentVersionLabel,
      latestVersion: latestVersionLabel,
      readmeUrl: sourceReadmeUrl,
      ...(comparison !== null ? {} : { error: t('sourceVersionUnknownError') })
    }
  } catch (error) {
    console.error('Cannot inspect source version:', error)
    return {
      state: 'unknown',
      currentVersion: currentVersionLabel,
      latestVersion: null,
      readmeUrl: sourceReadmeUrl,
      error: t('sourceVersionFetchError')
    }
  }
}

// schema.sql first, then every docs/migrations/*.sql in file-name (timestamp)
// order — the same bundle as /setup, so a new migration needs no list update.
async function getMigrationDefinitions(): Promise<MigrationDefinition[]> {
  const schemaPath = path.join(process.cwd(), 'docs', 'schema.sql')
  const migrationsPath = path.join(process.cwd(), 'docs', 'migrations')
  const migrationFiles = (await fs.readdir(migrationsPath))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()

  return Promise.all([
    fs.readFile(schemaPath, 'utf8').then((sql) => ({
      id: 'docs/schema.sql',
      file: 'docs/schema.sql',
      sql
    })),
    ...migrationFiles.map(async (fileName) => ({
      id: `docs/migrations/${fileName}`,
      file: `docs/migrations/${fileName}`,
      sql: await fs.readFile(path.join(migrationsPath, fileName), 'utf8')
    }))
  ])
}

function createDatabaseClient() {
  const databaseUrl = process.env.SUPABASE_DB_URL?.trim()
  if (!databaseUrl) return null

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('SUPABASE_DB_URL must be a PostgreSQL connection string.')
  }

  return postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false
  })
}

async function ensureMigrationTable(sql: ReturnType<typeof postgres>) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.app_migrations (
      migration_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.app_migrations FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS "No client access to app migrations" ON public.app_migrations;
    CREATE POLICY "No client access to app migrations"
      ON public.app_migrations
      FOR ALL TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  `)
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  const { locale, t } = await getServerTranslations()
  const sourceReadmeUrl =
    locale === 'en' ? SOURCE_README_EN_URL : SOURCE_README_URL
  const isAdmin = await getIsAdmin()
  const definitions = await getMigrationDefinitions()

  if (!isAdmin) {
    return {
      configured: Boolean(process.env.SUPABASE_DB_URL),
      databaseReachable: false,
      error: t('migrationAccessDenied'),
      source: {
        state: 'unknown',
        currentVersion: null,
        latestVersion: null,
        readmeUrl: sourceReadmeUrl
      },
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  }

  const source = await getSourceVersionStatus()

  const sql = createDatabaseClient()
  if (!sql) {
    return {
      configured: false,
      databaseReachable: false,
      error: t('databaseConfigMissing'),
      source,
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  }

  try {
    await ensureMigrationTable(sql)
    const rows = await sql.unsafe<
      Array<{
        migration_id: string
        applied_at: string
      }>
    >(
      `SELECT migration_id, applied_at FROM public.app_migrations ORDER BY applied_at ASC`
    )
    const applied = new Map(
      rows.map((row) => [
        row.migration_id,
        new Date(row.applied_at).toISOString()
      ])
    )

    return {
      configured: true,
      databaseReachable: true,
      source,
      migrations: definitions.map((migration) => ({
        id: migration.id,
        file: migration.file,
        appliedAt: applied.get(migration.id) || null
      }))
    }
  } catch (error) {
    console.error('Cannot inspect migration status:', error)
    return {
      configured: true,
      databaseReachable: false,
      error: t('migrationStatusError'),
      source,
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

export async function runPendingMigrations() {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])
  if (!isAdmin) return { success: false, error: t('migrationAccessDenied') }

  const source = await getSourceVersionStatus()
  if (source.state !== 'current') {
    return {
      success: false,
      error:
        source.state === 'outdated'
          ? t('sourceOutdatedError')
          : t('sourceVersionCheckError')
    }
  }

  const sql = createDatabaseClient()
  if (!sql) {
    return {
      success: false,
      error: t('databaseConfigMissing')
    }
  }

  try {
    const definitions = await getMigrationDefinitions()
    const result = await sql.begin(async (transaction) => {
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS public.app_migrations (
          migration_id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.app_migrations FROM PUBLIC, anon, authenticated;
        DROP POLICY IF EXISTS "No client access to app migrations" ON public.app_migrations;
        CREATE POLICY "No client access to app migrations"
          ON public.app_migrations
          FOR ALL TO anon, authenticated
          USING (false)
          WITH CHECK (false);
        SELECT pg_advisory_xact_lock(hashtext('giapha_os_app_migrations'));
      `)

      const rows = await transaction.unsafe<
        Array<{ migration_id: string; applied_at: string }>
      >(`SELECT migration_id, applied_at FROM public.app_migrations`)
      const applied = new Map(
        rows.map((row) => [row.migration_id, row.applied_at])
      )
      const appliedNow: string[] = []

      for (const migration of definitions) {
        if (applied.has(migration.id)) continue

        try {
          await transaction.unsafe(migration.sql)
          await transaction`
            INSERT INTO public.app_migrations (migration_id, file_name)
            VALUES (${migration.id}, ${migration.file})
            ON CONFLICT (migration_id) DO NOTHING
          `
          appliedNow.push(migration.file)
        } catch (error) {
          console.error(`Migration failed: ${migration.file}`, error)
          throw new Error(`Migration failed: ${migration.file}`)
        }
      }

      return appliedNow
    })

    return {
      success: true,
      applied: result,
      message: result.length
        ? t('migrationsApplied', { count: result.length })
        : t('databaseAlreadyCurrent')
    }
  } catch (error) {
    console.error('Cannot run pending migrations:', error)
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith('Migration failed:')
          ? t('migrationFailed', {
              file: error.message.replace('Migration failed: ', '')
            })
          : t('migrationRunError')
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}
