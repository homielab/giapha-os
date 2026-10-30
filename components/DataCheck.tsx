'use client'

import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { checkTreeData, type DataCheckResult } from '@/app/actions/dataCheck'
import DataCard from '@/components/DataCard'
import ImportStatusMessage from '@/components/ImportStatusMessage'
import type { TranslationKey } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n/useI18n'
import { DATA_CHECK_KINDS, type DataCheckFinding } from '@/utils/dataChecks'

const KIND_TITLES = {
  deathBeforeBirth: 'dataCheckKindDeathBeforeBirth',
  bornAfterMotherDeath: 'dataCheckKindBornAfterMotherDeath',
  fatherDiedBeforeBirth: 'dataCheckKindFatherDiedBeforeBirth',
  parentTooYoung: 'dataCheckKindParentTooYoung',
  parentTooOld: 'dataCheckKindParentTooOld',
  futureDate: 'dataCheckKindFutureDate',
  implausibleAge: 'dataCheckKindImplausibleAge',
  duplicateRelationship: 'dataCheckKindDuplicateRelationship',
  tooManyParents: 'dataCheckKindTooManyParents',
  singleParentWithSpouse: 'dataCheckKindSingleParentWithSpouse',
  marriageWithRelative: 'dataCheckKindMarriageWithRelative',
  marriageAfterDeath: 'dataCheckKindMarriageAfterDeath',
  parentChildLoop: 'dataCheckKindParentChildLoop',
  selfLink: 'dataCheckKindSelfLink',
  generationMismatch: 'dataCheckKindGenerationMismatch',
  birthOrderConflict: 'dataCheckKindBirthOrderConflict',
  isolatedPerson: 'dataCheckKindIsolatedPerson',
  missingBirthYear: 'dataCheckKindMissingBirthYear',
  missingDeathYear: 'dataCheckKindMissingDeathYear',
  deceasedFlagMissing: 'dataCheckKindDeceasedFlagMissing',
  missingGender: 'dataCheckKindMissingGender'
} as const satisfies Record<(typeof DATA_CHECK_KINDS)[number], TranslationKey>

function messageKey(f: DataCheckFinding): TranslationKey {
  switch (f.kind) {
    case 'deathBeforeBirth':
      return 'dataCheckDeathBeforeBirth'
    case 'bornAfterMotherDeath':
      return 'dataCheckBornAfterMotherDeath'
    case 'fatherDiedBeforeBirth':
      return 'dataCheckFatherDiedBeforeBirth'
    case 'parentTooYoung':
    case 'parentTooOld':
      return 'dataCheckParentAge'
    case 'futureDate':
      return f.params.field === 'death'
        ? 'dataCheckFutureDeath'
        : 'dataCheckFutureBirth'
    case 'implausibleAge':
      return f.params.field === 'death'
        ? 'dataCheckDiedTooOld'
        : 'dataCheckLivingTooOld'
    case 'duplicateRelationship':
      return f.params.type === 'marriage'
        ? 'dataCheckDuplicateMarriage'
        : 'dataCheckDuplicateChild'
    case 'tooManyParents':
      return 'dataCheckTooManyParents'
    case 'singleParentWithSpouse':
      return 'dataCheckSingleParentWithSpouse'
    case 'marriageWithRelative':
      return f.params.relation === 'parent'
        ? 'dataCheckMarriageParent'
        : 'dataCheckMarriageSibling'
    case 'marriageAfterDeath':
      return 'dataCheckMarriageAfterDeath'
    case 'parentChildLoop':
      return 'dataCheckParentChildLoop'
    case 'selfLink':
      return f.params.type === 'marriage'
        ? 'dataCheckSelfMarriage'
        : 'dataCheckSelfChild'
    case 'generationMismatch':
      return 'dataCheckGenerationMismatch'
    case 'birthOrderConflict':
      return f.params.type === 'same'
        ? 'dataCheckBirthOrderSame'
        : 'dataCheckBirthOrderReversed'
    case 'isolatedPerson':
      return 'dataCheckIsolatedPerson'
    case 'missingBirthYear':
    case 'missingDeathYear':
    case 'deceasedFlagMissing':
    case 'missingGender':
      return 'dataCheckMissingPerson'
  }
}

export default function DataCheck() {
  const { t } = useI18n()
  const [result, setResult] = useState<DataCheckResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const res = await checkTreeData()
      if ('error' in res) {
        setResult(null)
        setError(res.error)
        return
      }
      setResult(res)
    } catch {
      setResult(null)
      setError(t('dataCheckFailed'))
    } finally {
      setIsRunning(false)
    }
  }

  const total = result
    ? Object.values(result.counts).reduce((sum, n) => sum + n, 0)
    : 0

  return (
    <DataCard
      icon={<ShieldCheck className='size-6' />}
      title={t('dataCheckTitle')}
      description={t('dataCheckDescription')}
      accent='amber'>
      <button
        onClick={handleRun}
        disabled={isRunning}
        className='btn w-full sm:w-auto'>
        {isRunning ? t('dataCheckRunning') : t('dataCheckRun')}
      </button>

      {error && (
        <div className='mt-4'>
          <ImportStatusMessage status={{ type: 'error', message: error }} />
        </div>
      )}

      {result && (
        <div className='mt-4 space-y-3'>
          {total === 0 ? (
            <p className='text-sm text-stone-500'>{t('dataCheckNone')}</p>
          ) : (
            <>
              <p className='text-sm text-stone-500'>
                {t('dataCheckFound', { count: total })}
              </p>
              <div className='max-h-96 space-y-3 overflow-auto'>
                {DATA_CHECK_KINDS.map((kind) => {
                  const items = result.findings.filter((f) => f.kind === kind)
                  if (items.length === 0) return null
                  return (
                    <section
                      key={kind}
                      className='overflow-hidden rounded-2xl border border-stone-200/80'>
                      <h3 className='border-b border-stone-200/80 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700'>
                        {t(KIND_TITLES[kind])} ({result.counts[kind]})
                      </h3>
                      <ul className='divide-y divide-stone-100 text-sm'>
                        {items.map((f, i) => (
                          <li
                            key={`${f.people.map((p) => p.id).join('-')}-${i}`}
                            className='flex flex-wrap items-center justify-between gap-2 px-4 py-2'>
                            <span className='text-stone-700'>
                              {t(messageKey(f), f.params)}
                            </span>
                            <span className='flex gap-3 whitespace-nowrap'>
                              {f.people.map((p) => (
                                <Link
                                  key={p.id}
                                  href={`/dashboard/members/${p.id}`}
                                  target='_blank'
                                  rel='noopener'
                                  aria-label={`${t('dataCheckOpen')}: ${p.name}`}
                                  className='font-medium text-amber-700 hover:underline'>
                                  {f.people.length > 1
                                    ? p.name
                                    : t('dataCheckOpen')}
                                </Link>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {result.counts[kind] > items.length && (
                        <p className='border-t border-stone-100 px-4 py-2 text-xs text-stone-500'>
                          {t('dataCheckLimited', { shown: items.length })}
                        </p>
                      )}
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </DataCard>
  )
}
