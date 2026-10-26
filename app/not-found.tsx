import { FileQuestion } from 'lucide-react'
import Link from 'next/link'

import { getServerTranslations } from '@/lib/i18n/server'

export default async function NotFound() {
  const { t } = await getServerTranslations()

  return (
    <main className='flex min-h-screen flex-col items-center justify-center bg-neutral p-4'>
      <div className='w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center'>
        <div className='mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600'>
          <FileQuestion className='size-7' />
        </div>
        <h1 className='mb-2 font-serif text-xl font-semibold text-stone-800'>
          {t('notFoundTitle')}
        </h1>
        <p className='text-sm text-stone-500'>{t('notFoundDescription')}</p>
        <div className='mt-6 flex flex-wrap justify-center gap-3'>
          <Link href='/dashboard' className='btn-primary'>
            {t('dashboard')}
          </Link>
          <Link href='/' className='btn'>
            {t('home')}
          </Link>
        </div>
      </div>
    </main>
  )
}
