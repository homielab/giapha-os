import config from '@/app/config'
import AboutContent from '@/components/AboutContent'

export default function AboutPage() {
  return <AboutContent siteName={config.siteName} />
}
