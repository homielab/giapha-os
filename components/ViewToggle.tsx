'use client'

import { m } from 'framer-motion'
import { Circle, List, ListTree, Network } from 'lucide-react'

import { useMemberListView } from '@/context/useMemberListView'
import { useI18n } from '@/lib/i18n/useI18n'
import { toggleButtonProps } from '@/utils/a11y'
import type { ViewMode } from '@/utils/viewMode'

export default function ViewToggle() {
  const { t } = useI18n()
  const { view: currentView, setView } = useMemberListView()

  const tabs = [
    {
      id: 'list',
      label: t('viewList'),
      icon: <List className='size-6 sm:size-4' />
    },
    {
      id: 'tree',
      label: t('viewTree'),
      icon: <Network className='size-6 sm:size-4' />
    },
    {
      id: 'mindmap',
      label: t('viewMindmap'),
      icon: <ListTree className='size-6 sm:size-4' />
    },
    {
      id: 'bubble',
      label: t('viewBubble'),
      icon: <Circle className='size-6 sm:size-4' />
    }
  ] as const

  return (
    <div className='relative z-10 mx-auto mt-4 mb-2 flex w-fit rounded-full border border-stone-200/60 bg-stone-200/50 p-1.5 backdrop-blur-sm'>
      {tabs.map((tab) => {
        const isActive = currentView === tab.id
        return (
          <button
            key={tab.id}
            type='button'
            {...toggleButtonProps(tab.label, isActive)}
            onClick={() => setView(tab.id as ViewMode)}
            className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300 ease-in-out sm:px-6 sm:py-2.5 ${
              isActive
                ? 'text-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            }`}>
            {isActive && (
              <m.div
                layoutId='activeTab'
                className='absolute inset-0 z-[-1] rounded-full border border-stone-200/60 bg-white'
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
            <span
              aria-hidden='true'
              className={`transition-colors duration-300 ${isActive ? 'text-amber-700' : 'text-stone-400'}`}>
              {tab.icon}
            </span>
            <span className='hidden sm:block'>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
