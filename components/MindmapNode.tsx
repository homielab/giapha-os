'use client'

import { AnimatePresence, m } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { memo, useMemo, useState } from 'react'

import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person, Relationship } from '@/types'
import { EXPORT_IGNORE_PROPS } from '@/utils/exportFilter'
import { lifeYearsLabel } from '@/utils/memberSearch'
import { getAvatarBg } from '@/utils/styleHelpers'
import {
  AdjacencyLists,
  childrenOffPath,
  extendPath,
  getFilteredTreeData
} from '@/utils/treeHelpers'

import DefaultAvatar from './DefaultAvatar'

export interface MindmapContextData {
  personsMap: Map<string, Person>
  relationships: Relationship[]
  adj: AdjacencyLists
  hideDaughtersInLaw: boolean
  hideSonsInLaw: boolean
  hideDaughters: boolean
  hideSons: boolean
  hideMales: boolean
  hideFemales: boolean
  showAvatar: boolean
  hideExpandButtons: boolean
  autoCollapseLevel: number
  expandSignal: { type: 'expand' | 'collapse'; ts: number } | null
  setMemberModalId: (id: string | null) => void
}

const NO_ANCESTORS: ReadonlySet<string> = new Set()

const getTreeData = (personId: string, ctx: MindmapContextData) => {
  return getFilteredTreeData(personId, ctx.personsMap, ctx.adj, {
    hideDaughtersInLaw: ctx.hideDaughtersInLaw,
    hideSonsInLaw: ctx.hideSonsInLaw,
    hideDaughters: ctx.hideDaughters,
    hideSons: ctx.hideSons,
    hideMales: ctx.hideMales,
    hideFemales: ctx.hideFemales
  })
}

function NodeAvatar({ person }: { person: Person }) {
  const avatarUrl = useAvatarUrl()
  return (
    <div className='relative shrink-0'>
      <div
        className={`flex size-10 items-center justify-center overflow-hidden rounded-full text-sm font-medium text-white shadow-md ring-2 ring-white transition-transform duration-300 group-hover/card:scale-105 ${getAvatarBg(person.gender)}`}>
        {avatarUrl(person.avatar_url) ? (
          <Image
            unoptimized
            src={avatarUrl(person.avatar_url)!}
            alt=''
            width={40}
            height={40}
            className='h-full w-full object-cover'
          />
        ) : (
          <DefaultAvatar gender={person.gender} size={40} />
        )}
      </div>
    </div>
  )
}

function InLawBadge({ person }: { person: Person }) {
  const { t } = useI18n()
  if (!(person.is_deceased || person.is_in_law)) return null
  return (
    <div className='mt-1.5 flex shrink-0 flex-wrap items-center gap-1'>
      {person.is_in_law && (
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-sm font-medium ${
            person.gender === 'male'
              ? 'border-sky-200/60 bg-sky-50 text-sky-700'
              : person.gender === 'female'
                ? 'border-rose-200/60 bg-rose-50 text-rose-700'
                : 'border-stone-200/60 bg-stone-50 text-stone-700'
          }`}>
          {person.gender === 'male'
            ? t('inLawMale')
            : person.gender === 'female'
              ? t('inLawFemale')
              : t('inLawOther')}
        </span>
      )}
    </div>
  )
}

function NodeCard({
  person,
  ctx,
  spouses
}: {
  person: Person
  ctx: MindmapContextData
  spouses: { person: Person; note?: string | null }[]
}) {
  const { t } = useI18n()
  return (
    <div
      className={`group/card relative flex flex-wrap items-center gap-2 overflow-hidden rounded-2xl border border-stone-200/60 bg-white/60 p-2 transition duration-300 hover:border-amber-300 hover:bg-white/90 sm:p-2.5 ${person.is_deceased ? 'opacity-80 grayscale-[0.3]' : ''}`}>
      <button
        type='button'
        aria-label={person.full_name}
        className='absolute inset-0 z-20 cursor-pointer'
        onClick={() => ctx.setMemberModalId(person.id)}
      />
      <div className='relative z-10 flex w-full items-center gap-2.5'>
        <div className='flex min-w-0 flex-1 items-center gap-2.5'>
          {ctx.showAvatar && <NodeAvatar person={person} />}
          <div className='flex min-w-0 flex-1 flex-col'>
            <span className='mb-0.5 truncate text-sm leading-tight font-medium text-stone-900 transition-colors group-hover/card:text-amber-700'>
              {person.full_name}
            </span>
            <span className='flex items-center gap-1 truncate text-sm font-medium text-stone-500'>
              <svg
                className='size-3 shrink-0 text-stone-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
              <span className='truncate'>
                {lifeYearsLabel(person, t('unknownDate'))}
              </span>
            </span>
            <InLawBadge person={person} />
          </div>
        </div>

        {/* Spouses attached to node */}
        {spouses.length > 0 && <SpouseChips spouses={spouses} ctx={ctx} />}
      </div>
    </div>
  )
}

function SpouseChips({
  spouses,
  ctx
}: {
  spouses: { person: Person; note?: string | null }[]
  ctx: MindmapContextData
}) {
  const avatarUrl = useAvatarUrl()
  const { t } = useI18n()
  return (
    <div className='relative z-30 ml-1 flex flex-wrap gap-1.5 pl-2 before:absolute before:top-1/2 before:left-0 before:h-[70%] before:w-px before:-translate-y-1/2 before:bg-stone-200/80'>
      {spouses.map((spouseData) => {
        return (
          <button
            type='button'
            key={spouseData.person.id}
            onClick={(e) => {
              e.stopPropagation()
              ctx.setMemberModalId(spouseData.person.id)
            }}
            className={`group/spouse flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-stone-200/60 bg-stone-50/50 p-1.5 transition hover:border-amber-300 hover:bg-white ${spouseData.person.is_deceased ? 'opacity-80 grayscale-[0.3]' : ''}`}
            title={
              spouseData.note ||
              (spouseData.person.gender === 'male'
                ? t('inLawMale')
                : t('inLawFemale'))
            }>
            {ctx.showAvatar && (
              <div
                className={`flex size-8 items-center justify-center overflow-hidden rounded-full text-sm font-medium text-white shadow-sm ring-2 ring-white transition-transform duration-300 group-hover/spouse:scale-105 ${getAvatarBg(spouseData.person.gender)}`}>
                {avatarUrl(spouseData.person.avatar_url) ? (
                  <Image
                    unoptimized
                    src={avatarUrl(spouseData.person.avatar_url)!}
                    alt=''
                    width={32}
                    height={32}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <DefaultAvatar gender={spouseData.person.gender} size={32} />
                )}
              </div>
            )}
            <span className='max-w-12.5 truncate text-center text-sm font-medium text-stone-600'>
              {spouseData.person.full_name.split(' ').pop()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NodeConnectors({ isLast }: { isLast: boolean }) {
  return (
    <>
      <div
        className='absolute border-l-[1.5px] border-stone-300'
        style={{
          left: '0',
          top: '-16px',
          bottom: isLast ? 'auto' : '-16px',
          height: isLast ? '40px' : '100%'
        }}></div>
      <div
        className='absolute rounded-bl-xl border-b-[1.5px] border-l-[1.5px] border-stone-300'
        style={{
          left: '0',
          top: '24px',
          width: '24px',
          height: '24px'
        }}></div>
    </>
  )
}

/**
 * The chevron before a mind map node. The label names the person so a screen
 * reader can tell the buttons apart; `aria-expanded` carries the state.
 */
export function ExpandToggle({
  name,
  visible,
  isExpanded,
  onToggle
}: {
  name: string
  visible: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const { t } = useI18n()
  if (!visible) {
    return (
      <div className='h-1.5 w-1.5 rounded-full bg-stone-300 ring-2 ring-white'></div>
    )
  }
  return (
    <button
      onClick={onToggle}
      type='button'
      {...EXPORT_IGNORE_PROPS}
      className='flex size-5 items-center justify-center rounded border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-amber-50 hover:text-amber-600'
      title={isExpanded ? t('collapse') : t('expand')}
      aria-label={t('branchOf', { name })}
      aria-expanded={isExpanded}>
      {isExpanded ? (
        <ChevronDown strokeWidth={2.5} className='h-3.5 w-3.5' />
      ) : (
        <ChevronRight strokeWidth={2.5} className='h-3.5 w-3.5' />
      )}
    </button>
  )
}

export const MindmapNode = memo(
  ({
    personId,
    level = 0,
    isLast = false,
    ancestors = NO_ANCESTORS,
    ctx
  }: {
    personId: string
    level?: number
    isLast?: boolean
    /** People above this node on its path; they are never drawn again below it. */
    ancestors?: ReadonlySet<string>
    ctx: MindmapContextData
  }) => {
    const data = getTreeData(personId, ctx)
    const path = useMemo(
      () => extendPath(ancestors, personId),
      [ancestors, personId]
    )
    const children = childrenOffPath(data.children, path)
    const [isExpanded, setIsExpanded] = useState(
      ctx.autoCollapseLevel > 0 ? level < ctx.autoCollapseLevel : level < 2
    )
    const [lastSignalTs, setLastSignalTs] = useState(0)
    const [lastCollapseLevel, setLastCollapseLevel] = useState(
      ctx.autoCollapseLevel
    )

    // React to global expand/collapse signal
    if (ctx.expandSignal && ctx.expandSignal.ts !== lastSignalTs) {
      setIsExpanded(ctx.expandSignal.type === 'expand')
      setLastSignalTs(ctx.expandSignal.ts)
    }

    // React to autoCollapseLevel changes
    if (ctx.autoCollapseLevel !== lastCollapseLevel) {
      setLastCollapseLevel(ctx.autoCollapseLevel)
      if (ctx.autoCollapseLevel > 0) {
        setIsExpanded(level < ctx.autoCollapseLevel)
      }
    }

    if (!data.person) return null

    const hasChildren = children.length > 0

    return (
      <div className={`relative py-1.5 ${level > 0 ? 'pl-6' : 'pl-0'}`}>
        {/* Draw the connecting L-shape line from the parent to this node */}
        {level > 0 && <NodeConnectors isLast={isLast} />}

        <div className='group relative z-10 flex items-center gap-2'>
          {/* Expand/Collapse Toggle or spacer */}
          <div className='z-10 flex size-5 shrink-0 items-center justify-center bg-transparent'>
            <ExpandToggle
              name={data.person.full_name}
              visible={hasChildren && !ctx.hideExpandButtons}
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
            />
          </div>

          <NodeCard person={data.person} ctx={ctx} spouses={data.spouses} />
        </div>

        {/* Children Container */}
        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className='relative z-0 -mt-4 origin-top overflow-hidden pt-4'>
              <div className='pb-1'>
                {children.map((child, index) => (
                  <MindmapNode
                    key={child.id}
                    personId={child.id}
                    level={level + 1}
                    isLast={index === children.length - 1}
                    ancestors={path}
                    ctx={ctx}
                  />
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
MindmapNode.displayName = 'MindmapNode'
