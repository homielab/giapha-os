'use client'

import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  ServerCog
} from 'lucide-react'
import Link from 'next/link'

import type { MigrationStatus } from '@/app/actions/migrations'
import { useI18n } from '@/lib/i18n/useI18n'

export function StatusCard({
  ok,
  icon,
  title,
  description,
  children
}: {
  ok: boolean
  icon: React.ReactNode
  title: string
  description: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        ok
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-amber-200 bg-amber-50/70'
      }`}>
      <div className='flex items-start gap-3'>
        {icon}
        <div className='min-w-0'>
          <p className='text-sm font-medium text-stone-600'>{title}</p>
          <h3 className='mt-1 text-base font-semibold text-stone-900'>
            {ok ? description : title}
          </h3>
          {children}
        </div>
      </div>
    </section>
  )
}

export function UnavailablePanel({ status }: { status: MigrationStatus }) {
  const { t } = useI18n()
  return (
    <section className='rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-700' />
        <div>
          <h2 className='text-base font-semibold text-stone-900'>
            {t('migrationUnavailable')}
          </h2>
          <p className='mt-1 text-sm text-stone-600'>
            {status.error || t('migrationConfigureRetry')}
          </p>
          {!status.configured && (
            <Link
              href='/setup'
              className='mt-3 inline-flex text-sm font-medium text-stone-800 underline underline-offset-2 hover:text-amber-800'>
              {t('databaseSetupGuide')}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export function SystemUpdatedPanel() {
  const { t } = useI18n()
  return (
    <section className='rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
        <div>
          <h2 className='text-base font-semibold text-stone-900'>
            {t('systemUpdated')}
          </h2>
          <p className='mt-1 text-sm text-stone-600'>{t('systemSynced')}</p>
        </div>
      </div>
    </section>
  )
}

export function SourceStatusCard({
  status,
  sourceNeedsUpdate
}: {
  status: MigrationStatus
  sourceNeedsUpdate: boolean
}) {
  const { t } = useI18n()
  const isCurrent = status.source.state === 'current'
  const sourceStatusLabel = isCurrent
    ? t('sourceUpdated')
    : status.source.state === 'outdated'
      ? t('sourceOutdated')
      : t('sourceUnknown')
  return (
    <section
      className={`rounded-2xl border p-5 ${
        isCurrent
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-amber-200 bg-amber-50/70'
      }`}>
      <div className='flex items-start gap-3'>
        {isCurrent ? (
          <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
        ) : (
          <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-700' />
        )}
        <div className='min-w-0'>
          <p className='text-sm font-medium text-stone-600'>
            {t('sourceCodeLabel')}
          </p>
          <h3 className='mt-1 text-base font-semibold text-stone-900'>
            {sourceStatusLabel}
          </h3>
          <p className='mt-2 text-sm text-stone-600'>
            {t('runningVersion')}{' '}
            <span className='font-mono text-stone-800'>
              {status.source.currentVersion || t('unknownVersion')}
            </span>{' '}
            · {t('latestVersion')}{' '}
            <span className='font-mono text-stone-800'>
              {status.source.latestVersion || t('unknownVersion')}
            </span>
          </p>
          {status.source.error && (
            <p className='mt-2 text-sm text-stone-600'>{status.source.error}</p>
          )}
          {sourceNeedsUpdate && (
            <a
              href={status.source.readmeUrl}
              target='_blank'
              rel='noreferrer'
              className='mt-3 inline-flex text-sm font-medium text-stone-800 underline underline-offset-2 hover:text-amber-800'>
              {t('sourceUpdateGuide')}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export function DatabaseStatusCard({ status }: { status: MigrationStatus }) {
  const { t } = useI18n()
  return (
    <section
      className={`rounded-2xl border p-5 ${
        status.databaseReachable
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-amber-200 bg-amber-50/70'
      }`}>
      <div className='flex items-start gap-3'>
        {status.databaseReachable ? (
          <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
        ) : (
          <ServerCog className='mt-0.5 size-5 shrink-0 text-amber-700' />
        )}
        <div>
          <p className='text-sm font-medium text-stone-600'>{t('database')}</p>
          <h3 className='mt-1 text-base font-semibold text-stone-900'>
            {status.databaseReachable
              ? t('databaseConnected')
              : t('databaseUnavailable')}
          </h3>
          <p className='mt-2 text-sm text-stone-600'>
            {status.databaseReachable
              ? t('databaseCanUpdate')
              : status.configured
                ? t('databaseRetryConnection')
                : t('databaseNeedsConfig')}
          </p>
        </div>
      </div>
    </section>
  )
}

export function PendingMigrationsPanel({
  pendingMigrations,
  sourceNeedsUpdate,
  isRunning,
  isRefreshing,
  onRun
}: {
  pendingMigrations: MigrationStatus['migrations']
  sourceNeedsUpdate: boolean
  isRunning: boolean
  isRefreshing: boolean
  onRun: () => void
}) {
  const { t } = useI18n()
  return (
    <section className='rounded-2xl border border-stone-200/60 bg-white/70 p-5 backdrop-blur-xl sm:p-6'>
      <div className='flex items-start gap-3'>
        <div className='rounded-xl bg-amber-50 p-2.5 text-amber-700'>
          <ArrowUpCircle className='size-5' />
        </div>
        <div>
          <h2 className='text-base font-semibold text-stone-900'>
            {t('pendingChanges')}
          </h2>
          <p className='mt-1 text-sm text-stone-500'>
            {t('pendingMigrations', { count: pendingMigrations.length })}
          </p>
        </div>
      </div>

      <div className='mt-5 divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white/60'>
        {pendingMigrations.map((migration) => (
          <div
            key={migration.id}
            className='flex items-center justify-between gap-3 px-4 py-3'>
            <span className='min-w-0 truncate font-mono text-sm text-stone-600'>
              {migration.file.split('/').pop()}
            </span>
            <span className='shrink-0 text-sm font-medium text-amber-700'>
              {t('notRun')}
            </span>
          </div>
        ))}
      </div>

      {sourceNeedsUpdate ? (
        <p className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
          {t('updateSourceFirst')}
        </p>
      ) : (
        <button
          type='button'
          onClick={onRun}
          disabled={isRunning || isRefreshing}
          className='btn-primary mt-5 disabled:cursor-wait disabled:opacity-60'>
          {isRunning ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <ArrowUpCircle className='size-4' />
          )}
          {isRunning ? t('upgrading') : t('applyChanges')}
        </button>
      )}
    </section>
  )
}
