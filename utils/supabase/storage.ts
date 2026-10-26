import { validateImageFile } from '@/utils/imageUpload'
import { createClient } from '@/utils/supabase/client'

export class InvalidImageError extends Error {
  constructor(readonly reason: 'too-large' | 'unsupported-type') {
    super(`Invalid image: ${reason}`)
    this.name = 'InvalidImageError'
  }
}

export async function uploadGalleryImage(
  file: File
): Promise<{ path: string | null; error: Error | null }> {
  try {
    // Checked again here so no caller can send an invalid file to storage.
    const validation = await validateImageFile(file)
    if (!validation.ok) throw new InvalidImageError(validation.reason)

    const supabase = createClient()

    // Unique name; the extension follows the detected image type, not the
    // name the user gave the file.
    const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${validation.extension}`

    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: validation.type,
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    return { path: filePath, error: null }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { path: null, error: error as Error }
  }
}
