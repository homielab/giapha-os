'use client'

import { ArrowUpDown, Filter, Plus, Search, X } from 'lucide-react'

import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { generationFilterOption } from '@/utils/memberFilters'
import { isImeComposing } from '@/utils/pickerNavigation'

interface MemberListToolbarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  filterOption: string
  generations: number[]
  onFilterOptionChange: (value: string) => void
  sortOption: string
  onSortOptionChange: (value: string) => void
  canEdit: boolean
}

export default function MemberListToolbar({
  searchTerm,
  onSearchTermChange,
  filterOption,
  generations,
  onFilterOptionChange,
  sortOption,
  onSortOptionChange,
  canEdit
}: MemberListToolbarProps) {
  const { t } = useI18n()
  const { setShowCreateMember } = useMemberListView()

  return (
    <div className='relative mb-8'>
      <div className='relative z-10 flex w-full flex-col items-start justify-between gap-4 rounded-2xl border border-stone-200/60 bg-white/60 p-4 backdrop-blur-xl transition-colors duration-300 sm:flex-row sm:items-center sm:p-5'>
        <div className='flex w-full flex-1 flex-col gap-4 sm:w-auto sm:flex-row'>
          <div className='group relative max-w-sm flex-1'>
            <Search className='absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-amber-500' />
            <input
              type='search'
              placeholder={t('searchMembers')}
              aria-label={t('searchMembers')}
              className='w-full rounded-xl border border-stone-200/80 bg-white/90 py-2.5 pr-10 pl-10 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none'
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && !isImeComposing(e))
                  onSearchTermChange('')
              }}
            />
            {searchTerm && (
              <button
                type='button'
                onClick={() => onSearchTermChange('')}
                className='absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700'
                aria-label={t('clearSearch')}
                title={t('clearSearch')}>
                <X className='size-4' />
              </button>
            )}
          </div>
          <div className='flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-3'>
            <div className='relative w-full sm:w-auto'>
              <Filter className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400' />
              <select
                aria-label={t('filterLabel')}
                className='w-full appearance-none rounded-xl border border-stone-200/80 bg-white/90 py-2.5 pr-8 pl-9 text-sm font-medium text-stone-700 transition hover:border-amber-300 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none sm:w-40'
                value={filterOption}
                onChange={(e) => onFilterOptionChange(e.target.value)}>
                <option value='all'>{t('all')}</option>
                <option value='male'>{t('male')}</option>
                <option value='female'>{t('female')}</option>
                <option value='in_law_female'>{t('daughterInLaw')}</option>
                <option value='in_law_male'>{t('sonInLaw')}</option>
                <option value='deceased'>{t('deceased')}</option>
                <option value='first_child'>{t('firstChild')}</option>
                <option value='alive'>{t('filterAlive')}</option>
                <option value='missingBirthYear'>
                  {t('filterMissingBirthYear')}
                </option>
                {generations.length > 0 && (
                  <optgroup label={t('filterGenerationGroup')}>
                    {generations.map((n) => (
                      <option key={n} value={generationFilterOption(n)}>
                        {t('filterGeneration', { n })}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2'>
                <svg
                  className='size-4 text-stone-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M19 9l-7 7-7-7'></path>
                </svg>
              </div>
            </div>

            <div className='relative w-full sm:w-auto'>
              <ArrowUpDown className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400' />
              <select
                aria-label={t('sortLabel')}
                className='w-full appearance-none rounded-xl border border-stone-200/80 bg-white/90 py-2.5 pr-8 pl-9 text-sm font-medium text-stone-700 transition hover:border-amber-300 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none sm:w-52'
                value={sortOption}
                onChange={(e) => onSortOptionChange(e.target.value)}>
                <option value='birth_asc'>{t('birthAsc')}</option>
                <option value='birth_desc'>{t('birthDesc')}</option>
                <option value='name_asc'>{t('nameAsc')}</option>
                <option value='name_desc'>{t('nameDesc')}</option>
                <option value='updated_desc'>{t('updatedDesc')}</option>
                <option value='updated_asc'>{t('updatedAsc')}</option>
                <option value='generation_asc'>{t('generationAsc')}</option>
                <option value='generation_desc'>{t('generationDesc')}</option>
              </select>
              <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2'>
                <svg
                  className='size-4 text-stone-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M19 9l-7 7-7-7'></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateMember(true)}
            className='btn-primary'>
            <Plus className='size-4' strokeWidth={2.5} />
            {t('addMember')}
          </button>
        )}
      </div>
    </div>
  )
}
