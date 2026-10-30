'use client'

import { m } from 'framer-motion'
import { Crown, Hourglass, Moon, Star, Users } from 'lucide-react'
import Link from 'next/link'

import StatCardsGrid from '@/components/StatCardsGrid'
import { useI18n } from '@/lib/i18n/useI18n'
import type { FamilyStatsResult, LifespanPerson } from '@/utils/familyStats'

interface FamilyStatsProps {
  stats: FamilyStatsResult
}

function GenerationRow({
  gen,
  count,
  max,
  delay
}: {
  gen: number
  count: number
  max: number
  delay: number
}) {
  const { t } = useI18n()
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className='flex items-center gap-3'>
      <span className='w-14 shrink-0 text-sm font-medium text-stone-500'>
        {t('generationLabel', { generation: gen })}
      </span>
      <div className='h-2 flex-1 overflow-hidden rounded-full bg-stone-100'>
        <m.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
          style={{ width: `${pct}%` }}
          className='h-full origin-left rounded-full bg-amber-400'
        />
      </div>
      <span className='w-8 shrink-0 text-right text-sm font-medium text-stone-700'>
        {count}
      </span>
    </div>
  )
}

function LifespanPersonRow({
  label,
  person
}: {
  label: string
  person: LifespanPerson | null
}) {
  const { t } = useI18n()
  return (
    <div>
      <dt className='text-sm text-stone-500'>{label}</dt>
      <dd className='mt-1 text-base font-semibold text-stone-800'>
        {person ? (
          <>
            <Link
              href={`/dashboard/members/${person.id}`}
              className='text-amber-700 underline-offset-2 hover:underline'>
              {person.name}
            </Link>{' '}
            <span className='font-normal text-stone-600'>
              — {t('lifespanAge', { age: person.age })}
            </span>
          </>
        ) : (
          '—'
        )}
      </dd>
    </div>
  )
}

function LifespanCard({ lifespan }: Pick<FamilyStatsResult, 'lifespan'>) {
  const { t } = useI18n()
  if (lifespan.counted === 0 && !lifespan.oldestLiving) return null
  const maxAvg = Math.max(0, ...lifespan.byDecade.map((d) => d.average))
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className='card-feature'>
      <h2 className='mb-5 flex items-center gap-2 text-base font-semibold text-stone-700'>
        <Hourglass className='size-4 text-emerald-600' />
        {t('lifespanTitle')}
      </h2>
      <dl className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div>
          <dt className='text-sm text-stone-500'>{t('lifespanAverage')}</dt>
          <dd className='mt-1 text-base font-semibold text-stone-800'>
            {lifespan.average != null
              ? t('lifespanAge', { age: lifespan.average })
              : '—'}
          </dd>
        </div>
        <LifespanPersonRow
          label={t('lifespanLongestLived')}
          person={lifespan.longestLived}
        />
        <LifespanPersonRow
          label={t('lifespanOldestLiving')}
          person={lifespan.oldestLiving}
        />
      </dl>
      {lifespan.byDecade.length > 0 && (
        <>
          <h3 className='mt-6 mb-3 text-sm font-semibold text-stone-600'>
            {t('lifespanByDecade')}
          </h3>
          <div className='space-y-3'>
            {lifespan.byDecade.map(({ decade, average, count }) => (
              <div key={decade} className='flex items-center gap-3'>
                <span className='w-14 shrink-0 text-sm font-medium text-stone-500'>
                  {t('lifespanDecade', { decade })}
                </span>
                <div className='h-2 flex-1 overflow-hidden rounded-full bg-stone-100'>
                  <div
                    style={{
                      width: `${maxAvg > 0 ? (average / maxAvg) * 100 : 0}%`
                    }}
                    className='h-full rounded-full bg-emerald-400'
                  />
                </div>
                <span className='w-28 shrink-0 text-right text-sm text-stone-700'>
                  {t('lifespanAge', { age: average })}{' '}
                  <span className='text-stone-400'>({count})</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className='mt-4 text-sm text-stone-400 italic'>
        {t('lifespanCountedHint', { count: lifespan.counted })}
      </p>
    </m.div>
  )
}

export default function FamilyStats({ stats }: FamilyStatsProps) {
  const { t } = useI18n()

  return (
    <div className='space-y-8'>
      {/* Stat Cards Grid */}
      <StatCardsGrid stats={stats} />

      {/* Generation Breakdown */}
      {stats.generationBreakdown.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className='card-feature'>
          <h2 className='mb-5 flex items-center gap-2 text-base font-semibold text-stone-700'>
            <Crown className='size-4 text-amber-500' />
            {t('generationDistribution')}
          </h2>
          <div className='space-y-3'>
            {stats.generationBreakdown.map(({ gen, count }, i) => (
              <GenerationRow
                key={gen}
                gen={gen}
                count={count}
                max={stats.total}
                delay={0.55 + i * 0.07}
              />
            ))}
          </div>
          <p className='mt-4 text-sm text-stone-400 italic'>
            {t('generationAssignedHint')}
          </p>
        </m.div>
      )}

      <LifespanCard lifespan={stats.lifespan} />

      {/* Gender ratio visual */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className='rounded-2xl border border-stone-200/60 bg-white/80 p-6'>
        <h2 className='mb-5 flex items-center gap-2 text-base font-semibold text-stone-700'>
          <Users className='size-4 text-stone-500' />
          {t('genderRatio')}
        </h2>
        <div className='flex h-5 gap-px overflow-hidden rounded-full'>
          {stats.total > 0 && (
            <>
              <m.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.male }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className='flex items-center justify-center bg-blue-400'
                title={`${t('male')}: ${stats.male}`}
              />
              <m.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.female }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className='flex items-center justify-center bg-pink-400'
                title={`${t('female')}: ${stats.female}`}
              />
              {stats.other > 0 && (
                <m.div
                  initial={{ flex: 0 }}
                  animate={{ flex: stats.other }}
                  transition={{ duration: 0.7, delay: 0.7 }}
                  className='flex items-center justify-center bg-stone-400'
                  title={`${t('otherGender')}: ${stats.other}`}
                />
              )}
            </>
          )}
        </div>
        <div className='mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
          <span className='flex items-center gap-2 text-stone-600'>
            <span className='inline-block size-3 rounded-full bg-blue-400' />
            {t('male')} — {t('peopleCount', { count: stats.male })} (
            {stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}
            %)
          </span>
          <span className='flex items-center gap-2 text-stone-600'>
            <span className='inline-block size-3 rounded-full bg-pink-400' />
            {t('female')} — {t('peopleCount', { count: stats.female })} (
            {stats.total > 0
              ? Math.round((stats.female / stats.total) * 100)
              : 0}
            %)
          </span>
          {stats.other > 0 && (
            <span className='flex items-center gap-2 text-stone-600'>
              <span className='inline-block size-3 rounded-full bg-stone-400' />
              {t('otherGender')} — {t('peopleCount', { count: stats.other })} (
              {Math.round((stats.other / stats.total) * 100)}%)
            </span>
          )}
        </div>
      </m.div>

      {/* Grid for Zodiacs */}
      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        {/* Zodiac Breakdown */}
        {stats.zodiacBreakdown.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className='card-feature'>
            <h2 className='mb-5 flex items-center gap-2 text-base font-semibold text-stone-700'>
              <Star className='size-4 text-purple-500' />
              {t('zodiacSigns')}
            </h2>
            <div className='space-y-3'>
              {stats.zodiacBreakdown.map(({ name, count }, i) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={name} className='flex items-center gap-3'>
                    <span className='w-24 shrink-0 text-sm font-medium text-stone-500'>
                      {t(name)}
                    </span>
                    <div className='h-2 flex-1 overflow-hidden rounded-full bg-stone-100'>
                      <m.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        style={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.6,
                          delay: 0.85 + i * 0.07,
                          ease: 'easeOut'
                        }}
                        className='h-full origin-left rounded-full bg-purple-400'
                      />
                    </div>
                    <span className='w-8 shrink-0 text-right text-sm font-medium text-stone-700'>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className='mt-4 text-sm text-stone-400 italic'>
              {t('zodiacSolarHint')}
            </p>
          </m.div>
        )}

        {/* Chinese Zodiac Breakdown */}
        {stats.chineseZodiacBreakdown.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.95 }}
            className='card-feature'>
            <h2 className='mb-5 flex items-center gap-2 text-base font-semibold text-stone-700'>
              <Moon className='size-4 text-orange-500' />
              {t('chineseZodiac')}
            </h2>
            <div className='space-y-3'>
              {stats.chineseZodiacBreakdown.map(({ name, count }, i) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={name} className='flex items-center gap-3'>
                    <span className='w-24 shrink-0 text-sm font-medium text-stone-500'>
                      {t(name)}
                    </span>
                    <div className='h-2 flex-1 overflow-hidden rounded-full bg-stone-100'>
                      <m.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        style={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.6,
                          delay: 1 + i * 0.07,
                          ease: 'easeOut'
                        }}
                        className='h-full origin-left rounded-full bg-orange-400'
                      />
                    </div>
                    <span className='w-8 shrink-0 text-right text-sm font-medium text-stone-700'>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className='mt-4 text-sm text-stone-400 italic'>
              {t('chineseZodiacLunarHint')}
            </p>
          </m.div>
        )}
      </div>
    </div>
  )
}
