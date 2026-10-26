'use client'

import { m } from 'framer-motion'
import {
  Crown,
  Flower2,
  Heart,
  HeartOff,
  Mars,
  Moon,
  Skull,
  Star,
  Users,
  Venus
} from 'lucide-react'

import StatCardsGrid from '@/components/StatCardsGrid'
import { useI18n } from '@/lib/i18n/useI18n'
import type { FamilyStatsResult } from '@/utils/familyStats'

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
            </>
          )}
        </div>
        <div className='mt-3 flex gap-6 text-sm'>
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
