import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import LandingHero from '@/components/LandingHero'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getServerTranslations } from '@/lib/i18n/server'
import { websiteJsonLd } from '@/lib/jsonLd'
import { publicPageMetadata } from '@/lib/metadata'

import config from './config'

export async function generateMetadata() {
  const { t, locale } = await getServerTranslations()
  return publicPageMetadata({
    description: t('landingDescription'),
    path: '/',
    locale
  })
}

export default async function HomePage() {
  const { t, locale } = await getServerTranslations()
  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-neutral selection:bg-amber-200 selection:text-amber-900'>
      <JsonLd
        data={websiteJsonLd({ description: t('landingDescription'), locale })}
      />
      {/* Decorative background grid and blurs */}
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]'></div>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)]'></div>

      <div className='pointer-events-none absolute inset-x-0 top-0 flex h-screen justify-center overflow-hidden'>
        <div className='absolute top-[-10%] right-[-5%] h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-amber-300/20 mix-blend-multiply blur-[100px]' />
        <div className='absolute top-[20%] left-[-10%] h-[60vw] max-h-[800px] w-[60vw] max-w-[800px] rounded-full bg-rose-200/20 mix-blend-multiply blur-[120px]' />
      </div>

      <div className='absolute top-6 right-6 z-20'>
        <LanguageSwitcher />
      </div>

      <main className='relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-20 md:py-32'>
        <LandingHero siteName={config.siteName} />
      </main>

      <Footer className='relative z-10 border-none bg-transparent' />
    </div>
  )
}
