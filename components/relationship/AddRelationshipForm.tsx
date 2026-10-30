'use client'

import { useId, useState } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { Person, RelationshipType } from '@/types'
import { formatDisplayDate } from '@/utils/dateHelpers'
import { MAX_NOTE } from '@/utils/limits'
import { isImeComposing, pickerKeyNavigation } from '@/utils/pickerNavigation'

interface AddRelationshipFormProps {
  newRelNote: string
  onNoteChange: (value: string) => void
  newRelDirection: 'parent' | 'child' | 'spouse'
  onDirectionChange: (value: 'parent' | 'child' | 'spouse') => void
  newRelType: RelationshipType
  onTypeChange: (value: RelationshipType) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  searchResults: PickerPerson[]
  recentMembers: PickerPerson[]
  selectedTargetId: string | null
  onTargetSelect: (person: PickerPerson) => void
  processing: boolean
  onSave: () => void
  onCancel: () => void
}

/** The few person fields the relationship picker lists and needs to choose one. */
export type PickerPerson = Pick<
  Person,
  | 'id'
  | 'full_name'
  | 'gender'
  | 'birth_year'
  | 'birth_month'
  | 'birth_day'
  | 'other_names'
>

export default function AddRelationshipForm({
  newRelNote,
  onNoteChange,
  newRelDirection,
  onDirectionChange,
  newRelType,
  onTypeChange,
  searchTerm,
  onSearchTermChange,
  searchResults,
  recentMembers,
  selectedTargetId,
  onTargetSelect,
  processing,
  onSave,
  onCancel
}: AddRelationshipFormProps) {
  const { t } = useI18n()
  const listId = useId()
  const [active, setActive] = useState(0)
  // Escape or a choice hides the list until the text changes again.
  const [dismissed, setDismissed] = useState(false)

  const showingRecent =
    searchResults.length === 0 &&
    searchTerm.length === 0 &&
    !selectedTargetId &&
    recentMembers.length > 0
  const options = searchResults.length > 0 ? searchResults : recentMembers
  const listOpen = !dismissed && (searchResults.length > 0 || showingRecent)
  const optionId = (i: number) => `${listId}-opt-${i}`

  const choose = (p: PickerPerson) => {
    onTargetSelect(p)
    setDismissed(true)
  }

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!listOpen || isImeComposing(e)) return
    const result = pickerKeyNavigation(e.key, active, options.length)
    if (!result.handled) return
    e.preventDefault()
    setActive(Math.max(result.active, 0))
    if (result.action === 'close') setDismissed(true)
    else if (result.action === 'select') choose(options[result.active])
  }

  return (
    <div className='mt-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5'>
      <h4 className='mb-3 text-base font-semibold text-stone-800'>
        {t('relationshipAddTitle')}
      </h4>

      <div className='space-y-3'>
        <div>
          <label
            htmlFor='rel-note'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('relationshipNote')}
          </label>
          <input
            id='rel-note'
            name='rel-note'
            type='text'
            placeholder={t('relationshipNotePlaceholder')}
            maxLength={MAX_NOTE}
            value={newRelNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className='mb-3 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-amber-500 sm:p-2.5'
          />
        </div>

        <div>
          <label
            htmlFor='rel-direction'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('relationshipType')}
          </label>
          <select
            id='rel-direction'
            name='rel-direction'
            value={newRelDirection}
            onChange={(e) =>
              onDirectionChange(e.target.value as 'parent' | 'child' | 'spouse')
            }
            className='block w-full max-w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 transition-colors focus:border-amber-500 focus:ring-amber-500 sm:p-2.5'>
            <option value='parent'>{t('relationParentOption')}</option>
            <option value='spouse'>{t('relationSpouseOption')}</option>
            <option value='child'>{t('relationChildOption')}</option>
          </select>
        </div>

        {/* Child Type Sub-selection */}
        {(newRelDirection === 'child' || newRelDirection === 'parent') && (
          <div>
            <label
              htmlFor='rel-type'
              className='mb-1 block text-sm font-medium text-stone-600'>
              {t('relationshipDetails')}
            </label>
            <select
              id='rel-type'
              name='rel-type'
              value={newRelType}
              onChange={(e) => onTypeChange(e.target.value as RelationshipType)}
              className='block w-full max-w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 transition-colors focus:border-amber-500 focus:ring-amber-500 sm:p-2.5'>
              <option value='biological_child'>{t('biologicalChild')}</option>
              <option value='adopted_child'>{t('adoptedChild')}</option>
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor='rel-search'
            className='mb-1 block text-sm font-medium text-stone-600'>
            {t('searchRelative')}
          </label>
          <input
            id='rel-search'
            name='rel-search'
            type='text'
            placeholder={t('searchRelativePlaceholder')}
            value={searchTerm}
            role='combobox'
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-autocomplete='list'
            aria-activedescendant={listOpen ? optionId(active) : undefined}
            autoComplete='off'
            onKeyDown={onSearchKeyDown}
            onChange={(e) => {
              onSearchTermChange(e.target.value)
              setActive(0)
              setDismissed(false)
            }}
            className='block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-amber-500 sm:p-2.5'
          />
          {/* Search Results Dropdown */}
          {listOpen && (
            <div className='mt-2 max-h-62.5 overflow-y-auto rounded-md border border-stone-200 bg-white'>
              <div
                id={`${listId}-label`}
                className='sticky top-0 z-10 border-b border-stone-200 bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-500'>
                {searchResults.length > 0
                  ? t('searchResults')
                  : t('recentMembers')}
              </div>
              <ul
                id={listId}
                role='listbox'
                aria-labelledby={`${listId}-label`}>
                {options.map((p, i) => (
                  <li
                    key={p.id}
                    id={optionId(i)}
                    role='option'
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                    className={`flex cursor-pointer items-center justify-between border-b border-stone-100 px-3 py-2 text-sm last:border-0 hover:bg-amber-50 ${
                      i === active ? 'bg-amber-50' : ''
                    }`}>
                    <div className='flex items-center gap-2'>
                      <span
                        aria-hidden='true'
                        className={`flex size-3 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${
                          p.gender === 'male'
                            ? 'bg-sky-500'
                            : p.gender === 'female'
                              ? 'bg-rose-500'
                              : 'bg-stone-400'
                        }`}>
                        {p.gender === 'male'
                          ? '♂'
                          : p.gender === 'female'
                            ? '♀'
                            : '?'}
                      </span>
                      <span className='font-medium text-stone-800'>
                        {p.full_name}
                      </span>
                    </div>
                    <span className='text-sm text-stone-400'>
                      {formatDisplayDate(
                        p.birth_year,
                        p.birth_month,
                        p.birth_day,
                        t
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p role='status' aria-live='polite' className='sr-only'>
            {listOpen ? t('pickerResultsCount', { count: options.length }) : ''}
          </p>
          {selectedTargetId && (
            <p className='mt-1 text-sm text-green-600'>
              {t('selectedPerson', { name: searchTerm })}
            </p>
          )}
        </div>

        <div className='flex gap-2 pt-2'>
          <button
            onClick={onSave}
            disabled={!selectedTargetId || processing}
            className='flex-1 rounded-md bg-amber-700 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50 sm:rounded-lg sm:py-2.5'>
            {processing ? t('saving') : t('save')}
          </button>
          <button
            onClick={onCancel}
            className='rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 sm:rounded-lg sm:py-2.5'>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
