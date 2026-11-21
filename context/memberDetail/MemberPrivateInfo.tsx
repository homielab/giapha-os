'use client'

import { m } from 'framer-motion'
import { Briefcase, MapPin, Phone } from 'lucide-react'

import { itemVariants } from '@/context/memberDetail/memberDetailShared'
import { useI18n } from '@/lib/i18n/useI18n'

interface MemberPrivateInfoProps {
  isAdmin: boolean
  fullPerson: Record<string, unknown>
}

export default function MemberPrivateInfo({
  isAdmin,
  fullPerson
}: MemberPrivateInfoProps) {
  const { t } = useI18n()
  return (
    <m.div variants={itemVariants}>
      {isAdmin ? (
        <div className='rounded-2xl border border-stone-200/80 bg-stone-50 p-5 sm:p-6'>
          <h3 className='mb-4 flex items-center gap-2 border-b border-stone-200/60 pb-3 text-base font-semibold text-stone-900 sm:text-base'>
            <span className='rounded-lg border border-amber-200/50 bg-amber-100/80 p-1.5 text-amber-700'>
              🔒
            </span>
            {t('contactInfo')}
          </h3>
          <dl className='space-y-4 text-sm sm:text-sm'>
            <div>
              <dt className='mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-500'>
                <Phone className='h-3.5 w-3.5' /> {t('phoneNumber')}
              </dt>
              <dd className='rounded-lg border border-stone-200/60 bg-white px-3 py-2 font-medium text-stone-900'>
                {(fullPerson.phone_number as string) || (
                  <span className='font-normal text-stone-400'>
                    {t('notUpdated')}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className='mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-500'>
                <Briefcase className='h-3.5 w-3.5' /> {t('occupation')}
              </dt>
              <dd className='rounded-lg border border-stone-200/60 bg-white px-3 py-2 font-medium text-stone-900'>
                {(fullPerson.occupation as string) || (
                  <span className='font-normal text-stone-400'>
                    {t('notUpdated')}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className='mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-500'>
                <MapPin className='h-3.5 w-3.5' /> {t('currentResidence')}
              </dt>
              <dd className='rounded-lg border border-stone-200/60 bg-white px-3 py-2 font-medium text-stone-900'>
                {(fullPerson.current_residence as string) || (
                  <span className='font-normal text-stone-400'>
                    {t('notUpdated')}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-5 text-center'>
          <span className='text-sm opacity-50'>🔒</span>
          <p className='text-sm font-medium text-stone-500'>
            {t('contactAdminOnly')}
          </p>
        </div>
      )}
    </m.div>
  )
}
