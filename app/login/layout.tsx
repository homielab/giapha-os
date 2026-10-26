import { getServerTranslations } from '@/lib/i18n/server'
import { publicPageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  const { t, locale } = await getServerTranslations()
  return publicPageMetadata({
    title: t('login'),
    description: t('loginDescription'),
    path: '/login',
    locale
  })
}

export default function LoginLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
