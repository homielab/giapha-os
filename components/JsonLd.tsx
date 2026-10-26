import { serializeJsonLd, type JsonLd as JsonLdData } from '@/lib/jsonLd'

export default function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
