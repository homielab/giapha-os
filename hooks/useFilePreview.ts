'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// A chosen file plus a blob URL to preview it. The URL is created when the
// file is set (in the event handler, not during render), revoked when the
// file is replaced or cleared, and revoked on unmount.
export function useFilePreview() {
  const [selected, setSelected] = useState<{ file: File; url: string } | null>(
    null
  )
  const urlRef = useRef<string | null>(null)

  const setFile = useCallback((file: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const next = file ? { file, url: URL.createObjectURL(file) } : null
    urlRef.current = next?.url ?? null
    setSelected(next)
  }, [])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    },
    []
  )

  return {
    file: selected?.file ?? null,
    previewUrl: selected?.url ?? null,
    setFile
  }
}
