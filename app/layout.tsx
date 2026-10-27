import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'

import MotionProvider from '@/components/MotionProvider'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { getMessages } from '@/lib/i18n/messages'
import { getServerLocale, getServerTranslations } from '@/lib/i18n/server'
import { MANIFEST_THEME_COLOR } from '@/lib/manifest'
import { rootMetadata } from '@/lib/metadata'

import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter'
})
const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair'
})

export const viewport: Viewport = {
  // Same stone colour as the web app manifest, for the mobile browser chrome.
  themeColor: MANIFEST_THEME_COLOR
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerTranslations()
  return rootMetadata({
    description: t('landingDescription'),
    locale
  })
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
          <I18nProvider initialLocale={locale} messages={getMessages(locale)}>
            {children}
          </I18nProvider>
        </MotionProvider>
      </body>
    </html>
  )
}
