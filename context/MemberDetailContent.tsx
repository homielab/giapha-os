'use client'

import { m } from 'framer-motion'
import { Users } from 'lucide-react'
import { useCallback, useState } from 'react'

import RelationshipManager from '@/components/RelationshipManager'
import MemberDetailCover from '@/context/memberDetail/MemberDetailCover'
import {
  containerVariants,
  itemVariants,
  RelationshipStats
} from '@/context/memberDetail/memberDetailShared'
import MemberInfoCards from '@/context/memberDetail/MemberInfoCards'
import MemberNameHeader from '@/context/memberDetail/MemberNameHeader'
import MemberNotesSection from '@/context/memberDetail/MemberNotesSection'
import MemberPrivateInfo from '@/context/memberDetail/MemberPrivateInfo'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

interface MemberDetailContentProps {
  person: Person
  privateData: Record<string, unknown> | null
  isAdmin: boolean
  canEdit?: boolean
}

export default function MemberDetailContent({
  person,
  privateData,
  isAdmin,
  canEdit = false
}: MemberDetailContentProps) {
  const { t } = useI18n()
  const [relStats, setRelStats] = useState<RelationshipStats | null>(null)

  const handleStatsLoaded = useCallback((stats: RelationshipStats) => {
    setRelStats(stats)
  }, [])

  const fullPerson = { ...person, ...privateData }
  const note = (fullPerson.note as string) || ''

  const isDeceased =
    person.is_deceased ||
    !!person.death_year ||
    !!person.death_month ||
    !!person.death_day ||
    !!person.death_lunar_year ||
    !!person.death_lunar_month ||
    !!person.death_lunar_day

  return (
    <m.div
      variants={containerVariants}
      initial='hidden'
      animate='show'
      className='bg-stone-50/50'>
      {/* Header / Cover */}
      <MemberDetailCover person={person} />

      <div className='relative z-10 px-6 pt-16 pb-8 sm:px-8 sm:pt-20'>
        <MemberNameHeader
          person={person}
          fullName={fullPerson.full_name}
          isDeceased={isDeceased}
        />

        <MemberInfoCards
          person={person}
          isDeceased={isDeceased}
          relStats={relStats}
        />

        <div className='mt-8 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3'>
          {/* Main Info */}
          <div className='space-y-8 lg:col-span-2'>
            <MemberNotesSection note={note} />

            <m.section variants={itemVariants}>
              <h2 className='mb-4 flex items-center gap-2 text-base font-semibold text-stone-800 sm:text-lg'>
                <Users className='size-5 text-amber-600' />
                {t('family')}
              </h2>
              <div className='relative z-0 rounded-2xl border border-stone-200/60 bg-white p-4 sm:p-6'>
                <RelationshipManager
                  person={person}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                  onStatsLoaded={handleStatsLoaded}
                />
              </div>
            </m.section>
          </div>

          {/* Sidebar / Private Info */}
          <div className='space-y-6'>
            <MemberPrivateInfo isAdmin={isAdmin} fullPerson={fullPerson} />
          </div>
        </div>
      </div>
    </m.div>
  )
}
