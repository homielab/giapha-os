import { SupabaseClient } from '@supabase/supabase-js'

import { updateDescendantGenerationsAction } from '@/app/actions/member'
import { Person } from '@/types'
import { getAvatarStoragePath } from '@/utils/avatar'
import { IMAGE_EXTENSIONS, readImageType } from '@/utils/imageUpload'
import {
  errorMessage,
  InvalidAvatarError,
  LaterStepError
} from '@/utils/memberForm/errors'
import type {
  SaveMemberOptions,
  SaveMemberResult
} from '@/utils/memberForm/types'
import {
  buildPersonData,
  MemberFormFields,
  slugify
} from '@/utils/memberFormHelpers'
import { PersonChangedError, PersonNotUpdatedError } from '@/utils/writeErrors'

/**
 * An update that changed no row: read the person back to tell RLS (not
 * readable, or readable with the same `updated_at`) from a concurrent edit
 * (readable with another `updated_at`). Returns the error to throw.
 */
async function explainRefusedUpdate(
  supabase: SupabaseClient,
  personId: string,
  expectedUpdatedAt: string | undefined
): Promise<Error> {
  const { data, error } = await supabase
    .from('persons')
    .select('id, updated_at')
    .eq('id', personId)
    .maybeSingle()
  if (error) return error as unknown as Error
  if (!data || !expectedUpdatedAt || data.updated_at === expectedUpdatedAt) {
    return new PersonNotUpdatedError()
  }
  return new PersonChangedError()
}

// Persists the person row, avatar file, private details and descendant
// generation deltas. Throws on blocking errors; a failed generation update is
// returned instead because the member itself is already saved.
export async function saveMember(
  options: SaveMemberOptions
): Promise<SaveMemberResult> {
  const {
    supabase,
    isEditing,
    initialData,
    fields,
    deathValues,
    avatarUrl,
    avatarFile,
    removeExistingAvatar,
    isAdmin,
    privateLoaded = true,
    privateFields,
    hasGenerationChanged,
    updateDescendantGenerations
  } = options

  let currentAvatarUrl = avatarUrl
  const fullFields: MemberFormFields = {
    ...fields,
    deathYear: deathValues.year,
    deathMonth: deathValues.month,
    deathDay: deathValues.day,
    deathLunarYear: deathValues.lunarYear,
    deathLunarMonth: deathValues.lunarMonth,
    deathLunarDay: deathValues.lunarDay
  }

  // Check the avatar's content before saving anything, and store it under the
  // extension of its real type rather than the one in the file name.
  const avatarType = avatarFile ? await readImageType(avatarFile) : null
  if (avatarFile && !avatarType) throw new InvalidAvatarError()

  let currentPersonId = initialData?.id
  let createdPerson: Person | undefined
  let savedUpdatedAt: string | undefined
  const warnings: string[] = []
  // After the insert, a failing step is reported instead of thrown: throwing
  // would leave the form in "create" mode and a second save would add the
  // same person again.
  const isNew = !isEditing || !currentPersonId
  const fail = (err: unknown) => {
    if (!isNew) throw new LaterStepError(err, savedUpdatedAt)
    warnings.push(errorMessage(err))
  }

  // For a new member, we must insert first to get the ID for the avatar filename
  if (!isEditing || !currentPersonId) {
    const { data: newPerson, error: createError } = await supabase
      .from('persons')
      .insert(
        buildPersonData(
          fullFields,
          currentAvatarUrl || null,
          Boolean(initialData?.burial_place)
        )
      )
      .select()
      .single()
    if (createError) throw createError
    currentPersonId = newPerson.id
    createdPerson = newPerson as Person
    savedUpdatedAt = createdPerson.updated_at
  } else {
    // Update existing member info first. The update only matches while the
    // row still has the `updated_at` the form was loaded with, so a change
    // saved by someone else in the meantime is never overwritten.
    // RLS turns a refused update into "0 rows" without an error.
    let update = supabase
      .from('persons')
      .update(
        buildPersonData(
          fullFields,
          currentAvatarUrl || null,
          Boolean(initialData?.burial_place)
        )
      )
      .eq('id', currentPersonId)
    if (initialData?.updated_at) {
      update = update.eq('updated_at', initialData.updated_at)
    }
    const { data: updated, error: updateError } =
      await update.select('id, updated_at')
    if (updateError) throw updateError
    if (!updated || updated.length === 0) {
      throw await explainRefusedUpdate(
        supabase,
        currentPersonId,
        initialData?.updated_at
      )
    }
    savedUpdatedAt = updated[0].updated_at
  }

  // 2. Handle Avatar Upload if a new file is selected (now we have currentPersonId)
  if (avatarFile && avatarType && currentPersonId) {
    try {
      const fileExt = IMAGE_EXTENSIONS[avatarType]
      const slugName = slugify(fields.fullName)
      const fileName = `${currentPersonId}_${slugName}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarType })

      if (uploadError) throw uploadError

      currentAvatarUrl = filePath

      // Update the person with the final avatar URL
      const { data: avatarRows, error: updateAvatarError } = await supabase
        .from('persons')
        .update({ avatar_url: currentAvatarUrl })
        .eq('id', currentPersonId)
        .select('id, updated_at')
      if (updateAvatarError) throw updateAvatarError
      if (!avatarRows || avatarRows.length === 0) {
        throw new PersonNotUpdatedError()
      }
      savedUpdatedAt = avatarRows[0].updated_at
    } catch (err) {
      fail(err)
    }
  }

  // Delete the previous photo from storage only after a successful save
  if (removeExistingAvatar && initialData?.avatar_url) {
    const filePath = getAvatarStoragePath(initialData.avatar_url)
    const replacedSameFile = filePath && filePath === currentAvatarUrl
    if (filePath && !replacedSameFile) {
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([filePath])
      if (removeError) {
        console.error('Error removing avatar from storage:', removeError)
      }
    }
  }

  // 3. Upsert private data (only if admin and currentPersonId exists)
  if (isAdmin && privateLoaded && currentPersonId) {
    const normalizedData = {
      person_id: currentPersonId,
      phone_number: privateFields.phoneNumber?.trim() || null,
      occupation: privateFields.occupation?.trim() || null,
      current_residence: privateFields.currentResidence?.trim() || null
    }

    const hasData =
      normalizedData.phone_number ||
      normalizedData.occupation ||
      normalizedData.current_residence

    try {
      if (hasData) {
        const { error } = await supabase
          .from('person_details_private')
          .upsert(normalizedData)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('person_details_private')
          .delete()
          .eq('person_id', currentPersonId)

        if (error) throw error
      }
    } catch (err) {
      fail(err)
    }
  }

  // 4. Update descendants' generations if checked and changed
  let generationUpdateError: string | null = null
  if (hasGenerationChanged && updateDescendantGenerations && currentPersonId) {
    const delta = Number(fields.generation) - (initialData?.generation || 0)
    if (delta !== 0) {
      try {
        const res = await updateDescendantGenerationsAction(
          currentPersonId,
          delta
        )
        if (res.error) generationUpdateError = res.error
      } catch (err) {
        generationUpdateError = (err as Error)?.message || String(err)
      }
    }
  }

  return {
    personId: currentPersonId,
    generationUpdateError,
    warnings,
    savedUpdatedAt,
    // The avatar update moves updated_at; keep the new row in step so that a
    // second save is not mistaken for someone else's change.
    createdPerson: createdPerson && {
      ...createdPerson,
      updated_at: savedUpdatedAt ?? createdPerson.updated_at
    }
  }
}
