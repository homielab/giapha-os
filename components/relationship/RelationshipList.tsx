'use client'

import Image from 'next/image'

import DefaultAvatar from '@/components/DefaultAvatar'
import { EnrichedRelationship } from '@/components/relationship/relationshipTypes'
import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useI18n } from '@/lib/i18n/useI18n'
import { sortRelationshipGroup } from '@/utils/relationshipOrder'
import { getAvatarBg } from '@/utils/styleHelpers'

interface RelationshipListProps {
  relationships: EnrichedRelationship[]
  isAdmin: boolean
  canEdit: boolean
  onPersonClick: (id: string) => void
  onDelete: (relId: string) => void
}

const GROUP_ORDER = ['parent', 'spouse', 'child', 'child_in_law'] as const

export default function RelationshipList({
  relationships,
  isAdmin,
  canEdit,
  onPersonClick,
  onDelete
}: RelationshipListProps) {
  const avatarUrl = useAvatarUrl()
  const { t } = useI18n()

  const groupByType = (type: (typeof GROUP_ORDER)[number]) =>
    sortRelationshipGroup(
      type,
      relationships.filter((r) => r.direction === type)
    )

  return (
    <>
      {/* List Sections */}
      {GROUP_ORDER.map((group) => {
        const items = groupByType(group)
        let title = ''
        if (group === 'parent') title = t('relationParent')
        if (group === 'spouse') title = t('relationSpouse')
        if (group === 'child') title = t('relationChildren')
        if (group === 'child_in_law') title = t('relationInLawChildren')

        if (items.length === 0 && !isAdmin) return null // Hide empty sections for members? Or show empty state?

        return (
          <div
            key={group}
            className='border-b border-stone-100 pb-4 last:border-0'>
            <h4 className='mb-3 flex items-center justify-between text-base font-semibold text-stone-700'>
              {title}
            </h4>
            {items.length > 0 ? (
              <ul className='space-y-3'>
                {items.map((rel) => (
                  <li
                    key={rel.id}
                    className='group flex items-center justify-between'>
                    <button
                      onClick={() => onPersonClick(rel.targetPerson.id)}
                      className='-mx-2.5 flex flex-1 items-center gap-3 rounded-xl p-2.5 text-left transition-colors duration-200 hover:bg-stone-100'>
                      <div
                        className={`flex size-8 items-center justify-center overflow-hidden rounded-full text-sm text-white ${getAvatarBg(rel.targetPerson.gender)}`}>
                        {avatarUrl(rel.targetPerson.avatar_url) ? (
                          <Image
                            unoptimized
                            src={avatarUrl(rel.targetPerson.avatar_url)!}
                            alt=''
                            className='h-full w-full object-cover'
                            width={32}
                            height={32}
                          />
                        ) : (
                          <DefaultAvatar
                            gender={rel.targetPerson.gender}
                            size={32}
                          />
                        )}
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium text-stone-900'>
                          {rel.targetPerson.full_name}
                        </span>
                        {rel.note && (
                          <span className='mt-0.5 text-sm font-medium text-amber-600 italic'>
                            ({rel.note})
                          </span>
                        )}
                        {rel.type === 'adopted_child' && (
                          <span className='mt-0.5 text-sm text-stone-400 italic'>
                            ({t('adoptedChild')})
                          </span>
                        )}
                      </div>
                    </button>
                    {canEdit && rel.direction !== 'child_in_law' && (
                      <button
                        onClick={() => onDelete(rel.id)}
                        className='ml-2 flex items-center justify-center rounded-lg p-2 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500 sm:p-2.5 print:hidden'
                        title={t('deleteRelationship')}
                        aria-label={t('deleteRelationship')}>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'>
                          <path d='M3 6h18' />
                          <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
                          <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
                          <line x1='10' x2='10' y1='11' y2='17' />
                          <line x1='14' x2='14' y1='11' y2='17' />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-sm text-stone-400 italic'>
                {t('noFamilyInfo')}
              </p>
            )}
          </div>
        )
      })}
    </>
  )
}
