import JsonLd from '@/components/JsonLd'
import { getServerTranslations } from '@/lib/i18n/server'
import { softwareApplicationJsonLd } from '@/lib/jsonLd'
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

export default async function AboutLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const { t, locale } = await getServerTranslations()
  return (
    <>
      <JsonLd
        data={softwareApplicationJsonLd({
          description: t('aboutDescriptionShort'),
          locale
        })}
      />
      {children}
    </>
  )
}
