'use client'

import Image from 'next/image'
import { memo } from 'react'

import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useMemberListView } from '@/context/useMemberListView'
import { Person } from '@/types'
import { getAvatarBg } from '@/utils/styleHelpers'

import DefaultAvatar from './DefaultAvatar'

interface FamilyNodeCardProps {
  person: Person
  role?: string // e.g., "Chồng", "Vợ"
  note?: string | null
  onClickCard?: () => void
  onClickName?: (e: React.MouseEvent) => void
  isRingVisible?: boolean
  isPlusVisible?: boolean
  level: number
}

function PersonAvatar({ person }: { person: Person }) {
  const avatarUrl = useAvatarUrl()
  return (
    <div className='relative z-10 mb-1.5 sm:mb-2'>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm text-white shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12 sm:text-sm md:h-14 md:w-14 md:text-sm ${getAvatarBg(person.gender)} `}>
        {avatarUrl(person.avatar_url) ? (
          <Image
            unoptimized
            src={avatarUrl(person.avatar_url)!}
            alt=''
            className='h-full w-full object-cover'
            width={64}
            height={64}
          />
        ) : (
          <DefaultAvatar gender={person.gender} size={64} />
        )}
      </div>
    </div>
  )
}

function PersonName({
  person,
  showAvatar,
  onClickName
}: {
  person: Person
  showAvatar: boolean
  onClickName?: (e: React.MouseEvent) => void
}) {
  const nameText = showAvatar
    ? person.full_name
    : person.full_name.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className='block'>
          {word}
        </span>
      ))

  if (onClickName) {
    return (
      <button
        type='button'
        className='cursor-pointer text-center text-sm leading-tight font-medium text-stone-800 transition-colors group-hover:text-amber-700 hover:underline sm:text-sm md:text-sm'
        title={person.full_name}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onClickName(e)
        }}>
        {nameText}
      </button>
    )
  }

  return (
    <div
      className='cursor-pointer text-center text-sm leading-tight font-medium text-stone-800 transition-colors group-hover:text-amber-800 sm:text-sm md:text-sm'
      title={person.full_name}>
      {nameText}
    </div>
  )
}

function CornerBadge({ symbol }: { symbol: string }) {
  return (
    <div className='absolute top-[15%] -left-2.5 z-100 flex size-5 items-center justify-center rounded-full bg-white text-sm font-medium text-stone-500 shadow-sm sm:-left-3.5 sm:size-6 sm:text-sm'>
      <span className='leading-none'>{symbol}</span>
    </div>
  )
}

function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isRingVisible = false,
  isPlusVisible = false
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useMemberListView()

  const isDeceased = person.is_deceased

  const content = (
    <div
      className={`group relative flex h-full flex-col items-center justify-start rounded-3xl px-1 py-2 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 ${isDeceased ? 'opacity-80 grayscale-[0.4]' : ''} ${showAvatar ? 'w-20 bg-surface hover:shadow-soft-hover sm:w-24 md:w-28' : 'px-3'} `}>
      {onClickCard && (
        <button
          type='button'
          aria-label={person.full_name}
          className='absolute inset-0 z-20 rounded-3xl'
          onClick={onClickCard}
        />
      )}
      {isRingVisible && <CornerBadge symbol='💍' />}
      {isPlusVisible && <CornerBadge symbol='+' />}

      {/* 1. Avatar */}
      {showAvatar && <PersonAvatar person={person} />}

      {/* 2. Gender Icon + Name */}
      <div className='relative z-30 flex w-full flex-col items-center justify-center gap-1 px-0.5 sm:px-1'>
        <PersonName
          person={person}
          showAvatar={showAvatar}
          onClickName={onClickName}
        />
      </div>
    </div>
  )

  if (onClickCard || onClickName) {
    return content
  }

  return (
    <button
      type='button'
      onClick={() => setMemberModalId(person.id)}
      className='block w-fit rounded-3xl'>
      {content}
    </button>
  )
}

export default memo(FamilyNodeCard)
