'use client'

import { m } from 'framer-motion'
import { ArrowLeft, Info, Mail, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

import Footer from '@/components/Footer'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n/useI18n'

interface AboutContentProps {
  siteName: string
}

export default function AboutContent({ siteName }: AboutContentProps) {
  const { t } = useI18n()

  return (
    <div className='relative flex min-h-screen flex-col bg-neutral selection:bg-amber-200 selection:text-amber-900'>
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]'></div>

      <div className='absolute top-6 right-6 z-20'>
        <LanguageSwitcher />
      </div>

      <Link href='/dashboard' className='btn absolute top-6 left-6 z-20'>
        <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-1' />
        {t('back')}
      </Link>

      <div className='relative z-10 mb-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-20'>
        <m.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className='w-full max-w-3xl'>
          <div className='mt-6 mb-8 rounded-3xl border border-stone-200 bg-white p-8 sm:p-12'>
            <div className='mb-6 flex items-center gap-3'>
              <div className='rounded-2xl bg-amber-100/50 p-3 text-amber-700'>
                <Info className='size-6' />
              </div>
              <h1 className='title'>{t('aboutTitle')}</h1>
            </div>

            <div className='max-w-none'>
              <p className='mb-8 text-sm leading-relaxed text-stone-600'>
                {t('aboutDescription', { siteName })}
              </p>

              <div className='mt-8 mb-4 flex items-center gap-3 border-t border-stone-100 pt-8'>
                <div className='rounded-xl bg-rose-50 p-2.5 text-rose-600'>
                  <ShieldAlert className='size-5' />
                </div>
                <h2 className='text-xl font-semibold text-stone-900'>
                  {t('privacyTitle')}
                </h2>
              </div>

              <div className='rounded-2xl border border-stone-200/60 bg-stone-50 p-6 text-sm leading-relaxed'>
                <p className='mb-4 inline-block rounded-lg border border-stone-200 bg-white px-3 py-2 font-medium text-stone-800'>
                  {t('sourceOnly')}
                </p>

                <ul className='list-disc space-y-4 pl-5 text-stone-600'>
                  <li>
                    <strong className='text-stone-800'>
                      {t('selfHostedTitle')}
                    </strong>{' '}
                    {t('selfHostedText')}
                  </li>
                  <li>
                    <strong className='text-stone-800'>
                      {t('noDataTitle')}
                    </strong>{' '}
                    {t('noDataText')}
                  </li>
                  <li>
                    <strong className='text-stone-800'>
                      {t('dataControlTitle')}
                    </strong>{' '}
                    {t('dataControlText')}
                  </li>
                  <li>
                    <strong className='text-stone-800'>{t('demoTitle')}</strong>{' '}
                    {t('demoText')}
                  </li>
                </ul>
              </div>

              <div className='mt-8 mb-4 flex items-center gap-3 border-t border-stone-100 pt-8'>
                <div className='rounded-xl bg-blue-50 p-2.5 text-blue-600'>
                  <Mail className='size-5' />
                </div>
                <h2 className='text-xl font-semibold text-stone-900'>
                  {t('contactTitle')}
                </h2>
              </div>

              <p className='mb-8 text-sm leading-relaxed text-stone-600'>
                {t('contactText')}
                {` `}
                <a
                  href='mailto:giaphaos@homielab.com'
                  className='mt-2 inline-flex items-center gap-1.5 font-medium text-amber-700 transition-colors hover:text-amber-600'>
                  giaphaos@homielab.com
                </a>
              </p>
            </div>
          </div>
        </m.div>
      </div>
      <Footer className='relative z-10 border-none bg-transparent' />
    </div>
  )
}
