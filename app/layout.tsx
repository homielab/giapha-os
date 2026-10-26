import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'

import MotionProvider from '@/components/MotionProvider'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { getServerLocale, getServerTranslations } from '@/lib/i18n/server'
import { publicPageMetadata } from '@/lib/metadata'

import config from './config'

import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter'
})
const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair'
})
export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerTranslations()
  return {
    metadataBase: new URL(config.siteUrl),
    applicationName: config.siteName,
    title: { default: config.siteName, template: `%s | ${config.siteName}` },
    ...publicPageMetadata({
      description: t('landingDescription'),
      locale
    })
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getServerLocale()

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${playfair.variable} relative font-sans antialiased`}>
        <MotionProvider>
          <I18nProvider initialLocale={locale}>{children}</I18nProvider>
        </MotionProvider>
      </body>
    </html>
  )
}
