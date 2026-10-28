import { getSiteUrl } from '@/lib/siteUrl'

const config = {
  siteName: process.env.SITE_NAME || 'Gia Phả OS',
  // Shown under the icon when the app is installed on a phone's home screen.
  shortName: process.env.SHORT_NAME?.trim() || 'Gia Phả',
  exampleEmail: process.env.EXAMPLE_EMAIL || '',
  examplePassword: process.env.EXAMPLE_PASSWORD || '',
  demoDomain: process.env.DEMO_DOMAIN || 'giapha-os.homielab.com',
  siteUrl: getSiteUrl()
}

export default config
