'use client'

import { useRef, useState } from 'react'

import { useFilePreview } from '@/hooks/useFilePreview'
import { Person } from '@/types'

// Avatar form state: keeps the stored path as submit-only scratch data, while
// the chosen file and the "removed" flag drive the preview. The existing photo
// is only deleted from storage once the form is saved, so cancelling after
// "Remove photo" doesn't leave a broken avatar.
export function useMemberAvatar(initialData?: Person) {
  const avatarUrlRef = useRef(initialData?.avatar_url || '')
  const {
    file: avatarFile,
    previewUrl,
    setFile: setAvatarFile
  } = useFilePreview()
  const [removeExistingAvatar, setRemoveExistingAvatar] = useState(false)
  const [processingAvatar, setProcessingAvatar] = useState(false)

  // A chosen file wins; otherwise the stored photo unless it was removed.
  const avatarPreview = avatarFile
    ? previewUrl
    : removeExistingAvatar
      ? null
      : initialData?.avatar_url || null

  const handleAvatarSelected = (file: File) => {
    if (initialData?.avatar_url) {
      setRemoveExistingAvatar(true)
    }
    setAvatarFile(file)
  }

  const handleAvatarRemove = () => {
    if (initialData?.avatar_url) {
      setRemoveExistingAvatar(true)
    }
    avatarUrlRef.current = ''
    setAvatarFile(null)
  }

  return {
    avatarUrlRef,
    avatarFile,
    removeExistingAvatar,
    processingAvatar,
    setProcessingAvatar,
    avatarPreview,
    handleAvatarSelected,
    handleAvatarRemove
  }
}
