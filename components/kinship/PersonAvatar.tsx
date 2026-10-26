'use client'

import Image from 'next/image'

import DefaultAvatar from '@/components/DefaultAvatar'
import { FemaleIcon, MaleIcon } from '@/components/GenderIcons'
import { getGenderStyle, PersonNode } from '@/components/kinship/kinshipTypes'
import { useAvatarUrl } from '@/context/AvatarUrlContext'

const AVATAR_SIZE = {
  small: {
    box: 'size-8',
    ring: 'shadow-xs ring-1',
    px: 32,
    badge: '-right-0.5 -bottom-0.5 size-3.5 ring-1',
    icon: 'size-2.5'
  },
  large: {
    box: 'size-10',
    ring: 'shadow-sm ring-2',
    px: 40,
    badge: '-right-1 -bottom-1 size-4 ring-2',
    icon: 'size-3'
  }
} as const

function GenderBadge({
  gender,
  large
}: {
  gender: PersonNode['gender']
  large: boolean
}) {
  const size = large ? AVATAR_SIZE.large : AVATAR_SIZE.small
  const Icon =
    gender === 'male' ? MaleIcon : gender === 'female' ? FemaleIcon : null
  return (
    <div
      className={`absolute ${size.badge} flex items-center justify-center rounded-full shadow-xs ring-white ${getGenderStyle(gender)}`}>
      {Icon && <Icon className={size.icon} />}
    </div>
  )
}

export default function PersonAvatar({
  person,
  large = false,
  bgClassName
}: {
  person: PersonNode | null
  large?: boolean
  bgClassName: string
}) {
  const avatarUrl = useAvatarUrl()
  const size = large ? AVATAR_SIZE.large : AVATAR_SIZE.small
  const url = person ? avatarUrl(person.avatar_url) : null
  return (
    <div className='relative shrink-0'>
      <div
        className={`flex ${size.box} items-center justify-center overflow-hidden rounded-full text-sm font-medium text-white ${size.ring} ring-white ${person ? bgClassName : 'bg-stone-100 text-stone-400'}`}>
        {url ? (
          <Image
            unoptimized
            src={url}
            alt={person!.full_name}
            width={size.px}
            height={size.px}
            className='h-full w-full object-cover'
          />
        ) : person ? (
          <DefaultAvatar gender={person.gender} size={size.px} />
        ) : (
          '?'
        )}
      </div>
      {person && <GenderBadge gender={person.gender} large={large} />}
    </div>
  )
}
