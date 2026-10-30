import type { MetadataRoute } from 'next'

import { buildWebManifest } from '@/lib/manifest'

// Read SITE_NAME / APP_URL at request time: a Docker image is built without them.
export const dynamic = 'force-dynamic'

export default function manifest(): MetadataRoute.Manifest {
  return buildWebManifest()
}
