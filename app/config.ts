// Public URL of this deployment, used for canonical/Open Graph links, the
// sitemap and robots.txt. APP_URL wins; on Vercel the production domain is
// used automatically.
function getSiteUrl(): string {
  const appUrl = process.env.APP_URL?.trim()
  if (appUrl) return appUrl.replace(/\/+$/, '')
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl}`
  return 'http://localhost:3000'
}

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
