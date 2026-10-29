'use client'

import { Network } from 'lucide-react'
import Link from 'next/link'

import { useI18n } from '@/lib/i18n/useI18n'
import { treeViewHref } from '@/utils/viewMode'

interface ViewOnTreeLinkProps {
  personId: string
  className?: string
  /** Icon only on small screens; the label still names the link. */
  compact?: boolean
}

/** Opens the family tree rooted at this person. */
export default function ViewOnTreeLink({
  personId,
  className,
  compact = false
}: ViewOnTreeLinkProps) {
  const { t } = useI18n()
  const label = t('viewOnTree')
  return (
    <Link
      href={treeViewHref(personId)}
      className={className}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}>
      <Network className='size-4' aria-hidden='true' />
      {compact ? <span className='hidden sm:inline'>{label}</span> : label}
    </Link>
  )
}
