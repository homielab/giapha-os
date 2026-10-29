'use client'

import { Plus } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import MemberGenerationView from '@/components/MemberGenerationView'
import MemberListToolbar from '@/components/MemberListToolbar'
import PersonCard from '@/components/PersonCard'
import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import {
  MEMBER_BATCH_SIZE,
  nextVisibleCount,
  takeBatch
} from '@/utils/batchedList'
import { listGenerations, matchesPersonFilter } from '@/utils/memberFilters'
import { sortPersonsByGeneration, sortPersonsFlat } from '@/utils/memberSorting'
import {
  buildPersonSearchIndex,
  matchesPersonSearch,
  type PersonSearchIndex
} from '@/utils/search'

const EMPTY_RELATIONSHIPS: Relationship[] = []

export default function MemberList({
  initialPersons,
  relationships = EMPTY_RELATIONSHIPS,
  canEdit = false
}: {
  initialPersons: Person[]
  relationships?: Relationship[]
  canEdit?: boolean
}) {
  const { t } = useI18n()
  const { setShowCreateMember } = useMemberListView()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('generation_asc')

  const [filterOption, setFilterOption] = useState('all')

  // Typing stays responsive: filtering/sorting large lists runs at lower priority
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const deferredFilterOption = useDeferredValue(filterOption)
  const deferredSortOption = useDeferredValue(sortOption)
  const isStale =
    deferredSearchTerm !== searchTerm ||
    deferredFilterOption !== filterOption ||
    deferredSortOption !== sortOption

  const personMap = useMemo(() => {
    const map = new Map<string, Person>()
    initialPersons.forEach((p) => map.set(p.id, p))
    return map
  }, [initialPersons])

  // Accent-insensitive search index over names and birth/death years
  const searchIndex = useMemo(() => {
    const index = new Map<string, PersonSearchIndex>()
    initialPersons.forEach((p) => index.set(p.id, buildPersonSearchIndex(p)))
    return index
  }, [initialPersons])

  const filteredPersons = useMemo(() => {
    const query = deferredSearchTerm
    const filterOption = deferredFilterOption

    return initialPersons.filter((person) => {
      const index = searchIndex.get(person.id)
      const matchesSearch =
        !query.trim() || (!!index && matchesPersonSearch(index, query))

      return matchesSearch && matchesPersonFilter(person, filterOption)
    })
  }, [initialPersons, searchIndex, deferredSearchTerm, deferredFilterOption])

  const generations = useMemo(
    () => listGenerations(initialPersons),
    [initialPersons]
  )

  const { parentsOf, spousesOf } = useMemo(() => {
    const pOf = new Map<string, string[]>()
    const sOf = new Map<string, string[]>()

    relationships?.forEach((rel) => {
      if (rel.type === 'biological_child' || rel.type === 'adopted_child') {
        const parentId = rel.person_a
        const childId = rel.person_b
        if (!pOf.has(childId)) pOf.set(childId, [])
        pOf.get(childId)!.push(parentId)
      } else if (rel.type === 'marriage') {
        const p1 = rel.person_a
        const p2 = rel.person_b
        if (!sOf.has(p1)) sOf.set(p1, [])
        if (!sOf.has(p2)) sOf.set(p2, [])
        sOf.get(p1)!.push(p2)
        sOf.get(p2)!.push(p1)
      }
    })

    return { parentsOf: pOf, spousesOf: sOf }
  }, [relationships])

  const sortedPersons = useMemo(() => {
    // If not sorting by generation, use simple flat sort
    if (!deferredSortOption.includes('generation')) {
      return sortPersonsFlat(filteredPersons, deferredSortOption)
    }
    return sortPersonsByGeneration(
      filteredPersons,
      deferredSortOption,
      personMap,
      parentsOf,
      spousesOf
    )
  }, [filteredPersons, deferredSortOption, personMap, parentsOf, spousesOf])

  // The list shows one batch at a time; a new search, filter or sort starts
  // again from the first batch.
  const batchKey = `${deferredSearchTerm}\u0000${deferredFilterOption}\u0000${deferredSortOption}`
  const [batch, setBatch] = useState({
    key: batchKey,
    visible: MEMBER_BATCH_SIZE
  })
  const visibleCount =
    batch.key === batchKey ? batch.visible : MEMBER_BATCH_SIZE
  const { shown, remaining, nextCount } = takeBatch(sortedPersons, visibleCount)

  return (
    <>
      <MemberListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filterOption={filterOption}
        generations={generations}
        onFilterOptionChange={setFilterOption}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        canEdit={canEdit}
      />

      {(searchTerm || filterOption !== 'all') && (
        <p
          className='-mt-4 mb-6 px-1 text-sm text-stone-500'
          aria-live='polite'>
          {t('showingMembers', {
            shown: filteredPersons.length,
            total: initialPersons.length
          })}
        </p>
      )}

      <div
        className={`transition-opacity duration-150 ${isStale ? 'opacity-60' : ''}`}>
        {sortedPersons.length > 0 ? (
          deferredSortOption.includes('generation') ? (
            <MemberGenerationView
              sortedPersons={shown}
              generationSort={
                deferredSortOption as 'generation_asc' | 'generation_desc'
              }
              parentsOf={parentsOf}
              spousesOf={spousesOf}
              personMap={personMap}
            />
          ) : (
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {shown.map((person) => (
                <div
                  key={person.id}
                  className='[contain-intrinsic-size:auto_120px] [content-visibility:auto]'>
                  <PersonCard person={person} />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className='flex flex-col items-center gap-3 py-12 text-center'>
            <p className='text-sm text-stone-500'>
              {initialPersons.length > 0
                ? t('noMatchingMembers')
                : t('noMembers')}
            </p>
            {initialPersons.length > 0 &&
              (searchTerm || filterOption !== 'all') && (
                <button
                  type='button'
                  onClick={() => {
                    setSearchTerm('')
                    setFilterOption('all')
                  }}
                  className='btn'>
                  {t('clearFilters')}
                </button>
              )}
            {initialPersons.length === 0 && canEdit && (
              <button
                type='button'
                onClick={() => setShowCreateMember(true)}
                className='btn-primary'>
                <Plus className='size-4' strokeWidth={2.5} />
                {t('addMember')}
              </button>
            )}
          </div>
        )}

        {remaining > 0 && (
          <div className='mt-8 flex flex-col items-center gap-3'>
            <p className='text-sm text-stone-500' aria-live='polite'>
              {t('membersShownOfTotal', {
                shown: shown.length,
                total: sortedPersons.length
              })}
            </p>
            <button
              type='button'
              onClick={() =>
                setBatch({
                  key: batchKey,
                  visible: nextVisibleCount(visibleCount, sortedPersons.length)
                })
              }
              className='btn'>
              {t('showMoreMembers', { count: nextCount })}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
