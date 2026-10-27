'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

import MemberList from '@/components/MemberList'
import RootSelector from '@/components/RootSelector'
import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'

const FamilyTree = dynamic(() => import('@/components/FamilyTree'))
const MindmapTree = dynamic(() => import('@/components/MindmapTree'))
const BubbleMapTree = dynamic(
  () =>
    import('@/components/BubbleMapTree').catch((err) => {
      console.error('Failed to load BubbleMapTree:', err)
      return {
        default: function BubbleMapFallback() {
          const { t } = useI18n()

          return (
            <div className='absolute inset-0 flex items-center justify-center rounded-2xl border border-stone-200/60 bg-stone-50 p-4 text-center text-stone-500'>
              {t('unsupportedBrowserNoDetails')}
            </div>
          )
        }
      }
    }),
  { ssr: false }
)

interface MembersViewsProps {
  persons: Person[]
  relationships: Relationship[]
  canEdit?: boolean
}

export default function MembersViews({
  persons,
  relationships,
  canEdit = false
}: MembersViewsProps) {
  const { view: currentView, rootId, setRootId } = useMemberListView()
  const searchParams = useSearchParams()
  const hasRestored = useRef(false)

  // Prepare map and roots for tree views
  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>()
    persons.forEach((p) => pMap.set(p.id, p))

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === 'biological_child' || r.type === 'adopted_child'
        )
        .map((r) => r.person_b)
    )

    let finalRootId = rootId

    // If no rootId is provided, fallback to generation 1 or earliest birth year
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id))
      if (rootsFallback.length > 0) {
        const gen1 = rootsFallback.filter((p) => p.generation === 1)
        const sortByBirthYear = (a: Person, b: Person) => {
          const ya = a.birth_year ?? Infinity
          const yb = b.birth_year ?? Infinity
          return ya - yb
        }

        if (gen1.length > 0) {
          finalRootId = gen1.sort(sortByBirthYear)[0].id
        } else {
          finalRootId = rootsFallback.sort(sortByBirthYear)[0].id
        }
      } else if (persons.length > 0) {
        finalRootId = persons[0].id // ultimate fallback
      }
    }

    let calculatedRoots: Person[] = []
    if (finalRootId && pMap.has(finalRootId)) {
      calculatedRoots = [pMap.get(finalRootId)!]
    }

    return {
      personsMap: pMap,
      roots: calculatedRoots,
      defaultRootId: finalRootId
    }
  }, [persons, relationships, rootId])

  const activeRootId = rootId || defaultRootId

  // Khôi phục lựa chọn từ localStorage
  useEffect(() => {
    if (hasRestored.current) return

    const urlRootId = searchParams.get('rootId')

    if (!urlRootId) {
      try {
        const savedRootId = localStorage.getItem('members_rootId')

        if (!urlRootId && savedRootId && savedRootId !== rootId) {
          setRootId(savedRootId)
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e)
      }
    }

    hasRestored.current = true
  }, [rootId, searchParams, setRootId])

  // Lưu lựa chọn vào localStorage
  useEffect(() => {
    if (!hasRestored.current) return

    const timeout = setTimeout(() => {
      try {
        if (activeRootId) localStorage.setItem('members_rootId', activeRootId)
      } catch (e) {
        console.warn('Failed to write to localStorage:', e)
      }
    }, 100)

    return () => clearTimeout(timeout)
  }, [currentView, activeRootId])

  return (
    <>
      <main className='flex flex-1 flex-col overflow-auto bg-stone-50/50'>
        {currentView !== 'list' && persons.length > 0 && activeRootId && (
          <div className='relative z-20 mx-auto flex w-full max-w-7xl flex-col flex-wrap items-center gap-4 px-4 pt-6 pb-2 sm:flex-row sm:justify-between sm:px-6 lg:px-8'>
            <RootSelector persons={persons} currentRootId={activeRootId} />
            <div
              id='tree-toolbar-portal'
              className='flex flex-wrap items-center justify-center gap-2'
            />
          </div>
        )}

        {currentView === 'list' && (
          <div className='relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
            <MemberList
              initialPersons={persons}
              relationships={relationships}
              canEdit={canEdit}
            />
          </div>
        )}

        <div className='relative z-10 w-full flex-1'>
          {currentView === 'tree' && (
            <FamilyTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === 'mindmap' && (
            <MindmapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === 'bubble' && (
            <BubbleMapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
        </div>
      </main>
    </>
  )
}
