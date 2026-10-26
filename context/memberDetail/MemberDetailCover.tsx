'use client'

import { m } from 'framer-motion'
import Image from 'next/image'

import DefaultAvatar from '@/components/DefaultAvatar'
import { FemaleIcon, MaleIcon } from '@/components/GenderIcons'
import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { itemVariants } from '@/context/memberDetail/memberDetailShared'
import { Person } from '@/types'

export default function MemberDetailCover({ person }: { person: Person }) {
  const avatarUrl = useAvatarUrl()
  return (
    <div className='relative h-28 shrink-0 bg-linear-to-r from-stone-200 via-stone-100 to-stone-200 sm:h-36'>
      {/* Decorative blur in cover */}
      <div
        className={`absolute -top-20 right-0 h-64 w-64 rounded-full opacity-40 blur-[60px] ${person.gender === 'male' ? 'bg-sky-300' : person.gender === 'female' ? 'bg-rose-300' : 'bg-stone-300'}`}
      />
      <div className='absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-200 opacity-20 blur-[60px]' />

      <m.div
        variants={itemVariants}
        className='absolute -bottom-12 left-6 z-10 sm:-bottom-16 sm:left-8'>
        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white text-sm font-medium text-white sm:h-32 sm:w-32 sm:border-[6px] sm:text-sm ${
            person.gender === 'male'
              ? 'bg-linear-to-br from-sky-400 to-sky-700'
              : person.gender === 'female'
                ? 'bg-linear-to-br from-rose-400 to-rose-700'
                : 'bg-linear-to-br from-stone-400 to-stone-600'
          }`}>
          {avatarUrl(person.avatar_url) ? (
            <Image
              unoptimized
              src={avatarUrl(person.avatar_url)!}
              alt={person.full_name}
              width={128}
              height={128}
              className='h-full w-full object-cover'
            />
          ) : (
            <DefaultAvatar gender={person.gender} size={128} />
          )}
        </div>
        {/* Gender Indicator Icon */}
        <div
          className={`absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full shadow-md ring-2 ring-white sm:right-2 sm:bottom-2 sm:size-8 sm:ring-4 ${
            person.gender === 'male'
              ? 'bg-sky-100 text-sky-600'
              : person.gender === 'female'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-stone-100 text-stone-600'
          }`}>
          {person.gender === 'male' ? (
            <MaleIcon className='size-4 sm:size-5' />
          ) : person.gender === 'female' ? (
            <FemaleIcon className='size-4 sm:size-5' />
          ) : null}
        </div>
      </m.div>
    </div>
  )
}
