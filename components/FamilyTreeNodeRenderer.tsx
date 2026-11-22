'use client'

import { Minus, Plus } from 'lucide-react'
import { memo, useMemo, useSyncExternalStore } from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { EXPORT_IGNORE_PROPS } from '@/utils/exportFilter'
import type { CollapseStore } from '@/utils/treeCollapseStore'

import FamilyNodeCard from './FamilyNodeCard'

interface TreeData {
  person: Person | null
  spouses: { person: Person }[]
  children: { id: string }[]
}

/** Everything nodes share; a new object re-renders the whole tree. */
export interface TreeRenderContext {
  getTreeData: (personId: string) => TreeData
  collapseStore: CollapseStore
  autoCollapsed: ReadonlySet<string>
  showAvatar: boolean
  hideExpandButtons: boolean
  /** The button is passed so the tree can keep it under the pointer. */
  toggleCollapse: (personId: string, button: HTMLElement) => void
}

/**
 * The +/- button under a tree row. The label names the person so a screen
 * reader can tell the buttons apart; `aria-expanded` carries the state.
 */
export function TreeExpandToggle({
  name,
  isCollapsed,
  onToggle
}: {
  name: string
  isCollapsed: boolean
  onToggle: (button: HTMLElement) => void
}) {
  const { t } = useI18n()
  return (
    <button
      type='button'
      {...EXPORT_IGNORE_PROPS}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onToggle(e.currentTarget)
      }}
      className='absolute -bottom-3 left-1/2 z-100 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-500 transition-colors hover:border-amber-300 hover:text-amber-600'
      title={isCollapsed ? t('expand') : t('collapse')}
      aria-label={t('branchOf', { name })}
      aria-expanded={!isCollapsed}>
      {isCollapsed ? (
        <Plus className='h-3.5 w-3.5' />
      ) : (
        <Minus className='h-3.5 w-3.5' />
      )}
    </button>
  )
}

/**
 * One person row and, unless collapsed, its children. Memoized and subscribed
 * to its own branch state, so a toggle re-renders the toggled node only.
 */
const TreeNode = memo(function TreeNode({
  personId,
  level,
  ancestors,
  ctx
}: {
  personId: string
  level: number
  /** Ids on the path from the root, to stop at circular relationships. */
  ancestors: ReadonlySet<string>
  ctx: TreeRenderContext
}) {
  const { collapseStore, autoCollapsed } = ctx
  const branch = useSyncExternalStore(
    collapseStore.subscribe,
    () => collapseStore.branchState(personId, autoCollapsed),
    () => collapseStore.branchState(personId, autoCollapsed)
  )
  // Stable while this node re-renders, so its children stay memoized
  const path = useMemo(
    () => new Set(ancestors).add(personId),
    [ancestors, personId]
  )

  if (ancestors.has(personId)) return null // cycle guard
  const data = ctx.getTreeData(personId)
  if (!data.person) return null

  const hasChildren = data.children.length > 0
  const isCollapsed = branch === 'collapsed'

  return (
    <li>
      <div
        className='node-container inline-flex flex-col items-center'
        data-level={level}>
        {/* Main Person & Spouses Row */}
        <div
          className={`relative z-10 flex h-full items-stretch ${ctx.showAvatar ? 'rounded-2xl border border-stone-200/80 bg-white' : ''}`}>
          <FamilyNodeCard person={data.person} level={level} />

          {/* A ring before every spouse: each is married to the person on
              the left (a "+" before the second read as an add button). */}
          {data.spouses.map((spouseData) => (
            <div key={spouseData.person.id} className='relative flex'>
              <FamilyNodeCard
                isRingVisible
                person={spouseData.person}
                level={level}
              />
            </div>
          ))}

          {/* Expand/Collapse Toggle – centered on the row */}
          {!ctx.hideExpandButtons && hasChildren && (
            <TreeExpandToggle
              name={data.person.full_name}
              isCollapsed={isCollapsed}
              onToggle={(button) => ctx.toggleCollapse(personId, button)}
            />
          )}
        </div>
      </div>

      {/* Children; a branch the user just opened animates in */}
      {hasChildren && !isCollapsed && (
        <ul className={branch === 'opened' ? 'tree-branch-enter' : undefined}>
          {data.children.map((child) => (
            <TreeNode
              key={child.id}
              personId={child.id}
              level={level + 1}
              ancestors={path}
              ctx={ctx}
            />
          ))}
        </ul>
      )}
    </li>
  )
})

const NO_ANCESTORS: ReadonlySet<string> = new Set()

/** Renders the CSS-tree node list. */
export default function FamilyTreeNodeRenderer({
  roots,
  ctx
}: {
  roots: Person[]
  ctx: TreeRenderContext
}) {
  return roots.map((root) => (
    <TreeNode
      key={root.id}
      personId={root.id}
      level={0}
      ancestors={NO_ANCESTORS}
      ctx={ctx}
    />
  ))
}
