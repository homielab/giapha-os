'use client'

import { AlertCircle, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'

import { useAvatarUrl } from '@/context/AvatarUrlContext'
import { useI18n } from '@/lib/i18n/useI18n'
import { Gender } from '@/types'
import { resizeAvatar } from '@/utils/image'
import { IMAGE_ACCEPT, readImageType } from '@/utils/imageUpload'

interface MemberAvatarFieldProps {
  avatarPreview: string | null
  gender: Gender
  fullName: string
  processingAvatar: boolean
  onProcessingChange: (value: boolean) => void
  onFileSelected: (file: File) => void
  onRemove: () => void
  onError: (message: string) => void
}

export default function MemberAvatarField({
  avatarPreview,
  gender,
  fullName,
  processingAvatar,
  onProcessingChange,
  onFileSelected,
  onRemove,
  onError
}: MemberAvatarFieldProps) {
  const avatarUrl = useAvatarUrl()
  const { t } = useI18n()

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      onError(t('imageTooLarge'))
      return
    }
    // Check the file's content, not its name or the type the browser guessed
    // from it: a renamed text file must not pass as a photo.
    if (!(await readImageType(file))) {
      onError(t('invalidImageType'))
      return
    }
    onError('')
    onProcessingChange(true)
    const resized = await resizeAvatar(file)
    onProcessingChange(false)
    if (resized.size > 2 * 1024 * 1024) {
      onError(t('imageTooLarge'))
      return
    }
    onFileSelected(resized)
  }

  return (
    <div className='mt-2 md:col-span-2'>
      <label
        htmlFor='member-avatar'
        className='mb-2.5 block text-sm font-medium text-stone-700'>
        {t('avatar')}
      </label>
      <div className='flex flex-col items-start gap-5 rounded-xl border border-stone-100 bg-stone-50/50 p-4 sm:flex-row sm:items-center'>
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white text-sm font-medium text-white sm:h-24 sm:w-24 ${!avatarPreview ? (gender === 'male' ? 'bg-linear-to-br from-sky-400 to-sky-700' : gender === 'female' ? 'bg-linear-to-br from-rose-400 to-rose-700' : 'bg-linear-to-br from-stone-400 to-stone-600') : ''}`}>
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                avatarPreview.startsWith('blob:')
                  ? avatarPreview
                  : avatarUrl(avatarPreview) || undefined
              }
              alt={t('avatar')}
              className='h-full w-full object-cover'
            />
          ) : (
            <span className='opacity-90'>
              {fullName ? fullName.charAt(0).toUpperCase() : '?'}
            </span>
          )}
        </div>
        <div className='w-full flex-1'>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <input
                id='member-avatar'
                type='file'
                accept={IMAGE_ACCEPT}
                disabled={processingAvatar}
                onChange={handleFile}
                className='absolute inset-0 h-full w-full opacity-0'
              />
              <button
                type='button'
                className='flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100'>
                {processingAvatar ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <ImageIcon className='size-4' />
                )}
                {t('chooseNewPhoto')}
              </button>
            </div>
            {avatarPreview && (
              <button
                type='button'
                onClick={onRemove}
                className='flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700'>
                <Trash2 className='size-4' />
                {t('removePhoto')}
              </button>
            )}
          </div>
          <p className='mt-2.5 flex items-center gap-1.5 text-sm text-stone-500'>
            <AlertCircle className='h-3.5 w-3.5 text-stone-400' />
            {t('imageSupport')}
          </p>
        </div>
      </div>
    </div>
  )
}
