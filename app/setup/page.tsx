import { promises as fs } from 'fs'
import path from 'path'

import { ArrowLeft, Database, Play } from 'lucide-react'
import Link from 'next/link'

import Footer from '@/components/Footer'
import { getServerTranslations } from '@/lib/i18n/server'
import { databaseUrl } from '@/utils/supabase/env'

import CopyButton from './CopyButton'
import InstallButton from './InstallButton'

export default async function SetupPage() {
  const { t } = await getServerTranslations()
  // With a database connection (SUPABASE_DB_URL, or the one the Vercel
  // integration sets) the page installs the schema itself.
  const canInstall = Boolean(databaseUrl())
  let sqlBundle = ''
  try {
    const schemaPath = path.join(process.cwd(), 'docs', 'schema.sql')
    const migrationsPath = path.join(process.cwd(), 'docs', 'migrations')
    const migrationFiles = (await fs.readdir(migrationsPath))
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort()
    const schemaContent = await fs.readFile(schemaPath, 'utf-8')
    const migrationContents = await Promise.all(
      migrationFiles.map((fileName) =>
        fs.readFile(path.join(migrationsPath, fileName), 'utf-8')
      )
    )

    sqlBundle = [
      '-- GIAPHA-OS: schema + all migrations (idempotent bundle)',
      '-- Run this entire script once in Supabase SQL Editor.',
      '',
      '-- docs/schema.sql',
      schemaContent,
      ...migrationContents.flatMap((content, index) => [
        '',
        `-- docs/migrations/${migrationFiles[index]}`,
        content
      ])
    ].join('\n')
  } catch (error) {
    console.error('Error reading database SQL bundle:', error)
    sqlBundle =
      '-- Error: Could not read the database initialization SQL bundle.'
  }

  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-[#fafaf9] select-none selection:bg-amber-200 selection:text-amber-900'>
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]'></div>
      <div className='pointer-events-none absolute inset-x-0 top-0 flex h-screen justify-center overflow-hidden'>
        <div className='absolute top-[-10%] right-[-5%] h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-indigo-300/20 mix-blend-multiply blur-[100px]' />
        <div className='absolute bottom-[0%] left-[-10%] h-[60vw] max-h-[800px] w-[60vw] max-w-[800px] rounded-full bg-teal-200/20 mix-blend-multiply blur-[120px]' />
      </div>

      <div className='relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 py-12'>
        <div className='relative mb-8 w-full overflow-hidden rounded-3xl border border-stone-200 bg-white p-8 sm:p-10'>
          <div className='mb-6 flex items-center gap-4'>
            <div className='rounded-2xl bg-indigo-50 p-4 text-indigo-600'>
              <Database className='size-8' />
            </div>
            <div>
              <h2 className='text-2xl font-semibold text-stone-900 sm:text-3xl'>
                {t('setupTitle')}
              </h2>
              <p className='font-medium text-stone-500'>
                {t('setupDescription')}
              </p>
            </div>
          </div>

          {canInstall && (
            <div className='mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6'>
              <p className='mb-4 text-stone-600'>{t('setupInstallHint')}</p>
              <InstallButton />
            </div>
          )}

          {canInstall && (
            <h3 className='mb-4 font-semibold text-stone-900'>
              {t('setupManualTitle')}
            </h3>
          )}

          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div className='space-y-6'>
              <div className='h-full rounded-2xl border border-stone-200 bg-stone-50 p-6'>
                <h3 className='mb-4 flex items-center gap-2 font-semibold text-stone-900'>
                  <Play className='size-5 text-stone-500' />
                  {t('setupInstructions')}
                </h3>

                <ol className='list-inside list-decimal space-y-4 text-stone-600'>
                  <li className='leading-relaxed'>
                    {t('clickButton')}{' '}
                    <strong className='text-indigo-600'>
                      {t('copyAllSql')}
                    </strong>{' '}
                    {t('copyBundleDescription')}
                  </li>
                  <li className='leading-relaxed'>
                    {t('open')}{' '}
                    <a
                      href='https://supabase.com/dashboard/project/_/sql/new'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-medium text-amber-600 hover:underline'>
                      Supabase SQL Editor
                    </a>{' '}
                    {t('openSqlEditor')}
                  </li>
                  <li className='leading-relaxed'>{t('pasteSql')}</li>
                  <li className='leading-relaxed'>{t('runSql')}</li>
                  <li className='leading-relaxed'>{t('returnAndReload')}</li>
                </ol>

                <div className='mt-8'>
                  <CopyButton content={sqlBundle} />
                </div>
              </div>
            </div>

            <div className='col-span-1 flex h-[400px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#1e1e1e]'>
              <div className='flex items-center justify-between border-b border-stone-800 bg-[#2d2d2d] px-4 py-2'>
                <span className='font-mono text-sm text-stone-400'>
                  {t('sqlBundle')}
                </span>
              </div>
              <div className='custom-scrollbar w-full flex-grow overflow-y-auto p-4'>
                <pre className='font-mono text-sm leading-relaxed whitespace-pre text-stone-300 sm:text-sm'>
                  <code>{sqlBundle}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link
        href='/login'
        className='absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full border border-stone-200 bg-white/60 px-5 py-2.5 text-sm font-medium text-stone-500 transition-colors duration-300 hover:border-stone-300 hover:text-stone-900'>
        <ArrowLeft className='size-4' />
        {t('backToLogin')}
      </Link>

      <Footer className='relative z-10 mt-auto border-none bg-transparent' />
    </div>
  )
}
