import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  // /setup and the upgrade server actions read the SQL files at runtime;
  // file tracing cannot see fs reads with computed paths, so the standalone
  // output (Docker image) would ship without them.
  outputFileTracingIncludes: {
    '/setup': ['./docs/schema.sql', './docs/migrations/*.sql'],
    '/dashboard/upgrade': ['./docs/schema.sql', './docs/migrations/*.sql']
  },
  experimental: {
    serverActions: {
      // Restoring a backup sends the whole family tree to a server action;
      // the 1 MB default rejects a few thousand members. Matches the 25 MB
      // limit of the restore file picker.
      bodySizeLimit: '25mb'
    }
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}

export default nextConfig
