'use client'

import { Minus, Plus } from 'lucide-react'
import React from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { EXPORT_IGNORE_PROPS } from '@/utils/exportFilter'

import FamilyNodeCard from './FamilyNodeCard'

interface TreeData {
  person: Person | null
  spouses: { person: Person }[]
  children: { id: string }[]
}

interface FamilyTreeNodeRendererProps {
  roots: Person[]
  getTreeData: (personId: string) => TreeData
  collapsedNodes: Set<string>
  showAvatar: boolean
  hideExpandButtons: boolean
  toggleCollapse: (personId: string) => void
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
  onToggle: () => void
}) {
  const { t } = useI18n()
  return (
    <button
      type='button'
      {...EXPORT_IGNORE_PROPS}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onToggle()
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

/** Recursively renders the CSS-tree node list. */
export default function FamilyTreeNodeRenderer({
  roots,
  getTreeData,
  collapsedNodes,
  showAvatar,
  hideExpandButtons,
  toggleCollapse
}: FamilyTreeNodeRendererProps) {
  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string>,
    level: number
  ): React.ReactNode => {
    if (visited.has(personId)) return null // cycle guard
    visited.add(personId)

    const data = getTreeData(personId)
    if (!data.person) return null

    const hasChildren = data.children.length > 0
    const isCollapsed = collapsedNodes.has(personId)

    return (
      <li>
        <div
          className='node-container inline-flex flex-col items-center'
          data-level={level}>
          {/* Main Person & Spouses Row */}
          <div
            className={`relative z-10 flex h-full items-stretch ${showAvatar ? 'rounded-2xl border border-stone-200/80 bg-white' : ''}`}>
            <FamilyNodeCard person={data.person} level={level} />

            {data.spouses.map((spouseData, idx) => (
              <div key={spouseData.person.id} className='relative flex'>
                <FamilyNodeCard
                  isRingVisible={idx === 0}
                  isPlusVisible={idx > 0}
                  person={spouseData.person}
                  level={level}
                />
              </div>
            ))}

            {/* Expand/Collapse Toggle – centered on the row */}
            {!hideExpandButtons && hasChildren && (
              <TreeExpandToggle
                name={data.person.full_name}
                isCollapsed={isCollapsed}
                onToggle={() => toggleCollapse(personId)}
              />
            )}
          </div>
        </div>

        {/* Render Children (if any and not collapsed) */}
        {hasChildren && !isCollapsed && (
          <ul>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited), level + 1)}
              </React.Fragment>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return roots.map((root) => (
    <React.Fragment key={root.id}>
      {renderTreeNode(root.id, new Set(), 0)}
    </React.Fragment>
  ))
}
