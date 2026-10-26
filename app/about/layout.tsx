import { getServerTranslations } from '@/lib/i18n/server'
import { publicPageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  const { t, locale } = await getServerTranslations()
  return publicPageMetadata({
    title: t('aboutTitle'),
    description: t('aboutDescriptionShort'),
    path: '/about',
    locale
  })
}

export default function AboutLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
