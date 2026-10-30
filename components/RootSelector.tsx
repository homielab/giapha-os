'use client'

import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'
import { saveChosenRoot } from '@/utils/treeRoot'

import PersonSelector from './PersonSelector'

export default function RootSelector({
  persons,
  currentRootId
}: {
  persons: Person[]
  currentRootId: string
}) {
  const { t } = useI18n()
  const { setRootId } = useMemberListView()

  return (
    <PersonSelector
      persons={persons}
      selectedId={currentRootId}
      onSelect={(id) => {
        if (!id) return
        setRootId(id)
        saveChosenRoot(window.localStorage, id)
      }}
      placeholder={t('choosePerson')}
      label={t('displayRoot')}
      className='w-full sm:w-72'
    />
  )
}
