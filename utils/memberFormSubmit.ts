import { SupabaseClient } from '@supabase/supabase-js'

import { updateDescendantGenerationsAction } from '@/app/actions/member'
import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { Person } from '@/types'
import { getAvatarStoragePath } from '@/utils/avatar'
import { IMAGE_EXTENSIONS, readImageType } from '@/utils/imageUpload'
import {
  buildPersonData,
  DeathDateValues,
  MemberFormFields,
  normalizeDeathDates,
  slugify,
  validateMemberForm
} from '@/utils/memberFormHelpers'
import {
  findBirthDateConflict,
  type BirthDateConflict,
  type DatedPerson,
  type NamedDatedPerson
} from '@/utils/relationshipValidation'

export interface SaveMemberOptions {
  supabase: SupabaseClient
  isEditing: boolean
  initialData?: Person
  fields: MemberFormFields
  /** Normalized death-date values after solar/lunar reconciliation. */
  deathValues: {
    day: number | ''
    month: number | ''
    year: number | ''
    lunarDay: number | ''
    lunarMonth: number | ''
    lunarYear: number | ''
  }
  /** Avatar path scratch value maintained by the form (submit-only data). */
  avatarUrl: string
  avatarFile: File | null
  removeExistingAvatar: boolean
  isAdmin: boolean
  privateFields: {
    phoneNumber: string
    occupation: string
    currentResidence: string
  }
  hasGenerationChanged: boolean
  updateDescendantGenerations: boolean
}

export interface SaveMemberResult {
  /** The saved person's ID (undefined when the insert returned none). */
  personId: string | undefined
  /**
   * Set when the member was saved but shifting the descendants' generations
   * failed; the form shows it as a warning instead of a success.
   */
  generationUpdateError: string | null
}

/** The chosen avatar file is not a JPEG, PNG, GIF or WebP image. */
export class InvalidAvatarError extends Error {
  constructor() {
    super('Avatar file is not a supported image')
    this.name = 'InvalidAvatarError'
  }
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

  // For a new member, we must insert first to get the ID for the avatar filename
  if (!isEditing || !currentPersonId) {
    const { data: newPerson, error: createError } = await supabase
      .from('persons')
      .insert(buildPersonData(fullFields, currentAvatarUrl || null))
      .select()
      .single()
    if (createError) throw createError
    currentPersonId = newPerson.id
  } else {
    // Update existing member info first
    const { error: updateError } = await supabase
      .from('persons')
      .update(buildPersonData(fullFields, currentAvatarUrl || null))
      .eq('id', currentPersonId)
    if (updateError) throw updateError
  }

  // 2. Handle Avatar Upload if a new file is selected (now we have currentPersonId)
  if (avatarFile && avatarType && currentPersonId) {
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
    const { error: updateAvatarError } = await supabase
      .from('persons')
      .update({ avatar_url: currentAvatarUrl })
      .eq('id', currentPersonId)
    if (updateAvatarError) throw updateAvatarError
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
  if (isAdmin && currentPersonId) {
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

  return { personId: currentPersonId, generationUpdateError }
}

const RELATIVE_COLUMNS = 'id, full_name, birth_year, birth_month, birth_day'
const PARENT_CHILD_TYPES = ['biological_child', 'adopted_child']

/**
 * Loads the parents and children of a saved member and checks the member's
 * new birth date against theirs. Throws when a query fails.
 */
export async function findSavedBirthDateConflict(
  supabase: SupabaseClient,
  person: DatedPerson
): Promise<BirthDateConflict | null> {
  if (person.birth_year == null) return null

  const [asParent, asChild] = await Promise.all([
    supabase
      .from('relationships')
      .select('person_b')
      .eq('person_a', person.id)
      .in('type', PARENT_CHILD_TYPES),
    supabase
      .from('relationships')
      .select('person_a')
      .eq('person_b', person.id)
      .in('type', PARENT_CHILD_TYPES)
  ])
  if (asParent.error) throw asParent.error
  if (asChild.error) throw asChild.error

  const childIds = new Set(
    ((asParent.data ?? []) as { person_b: string }[]).map((r) => r.person_b)
  )
  const parentIds = new Set(
    ((asChild.data ?? []) as { person_a: string }[]).map((r) => r.person_a)
  )
  if (childIds.size === 0 && parentIds.size === 0) return null

  const { data, error } = await supabase
    .from('persons')
    .select(RELATIVE_COLUMNS)
    .in('id', [...parentIds, ...childIds])
  if (error) throw error

  const relatives = (data ?? []) as NamedDatedPerson[]
  return findBirthDateConflict(
    person,
    relatives.filter((p) => parentIds.has(p.id)),
    relatives.filter((p) => childIds.has(p.id))
  )
}

const toNullable = (value: number | '') => (value === '' ? null : value)

function birthDateChanged(ctx: MemberFormSubmitContext) {
  const before = ctx.initialData
  return (
    toNullable(ctx.birthYear) !== (before?.birth_year ?? null) ||
    toNullable(ctx.birthMonth) !== (before?.birth_month ?? null) ||
    toNullable(ctx.birthDay) !== (before?.birth_day ?? null)
  )
}

export interface MemberSaveWarning {
  message: string
  personId: string
}

// What happens after a save: the caller's onSuccess, or the member's page.
export function finishMemberSave(
  ctx: Pick<MemberFormSubmitContext, 'router' | 'onSuccess'>,
  personId: string
) {
  if (ctx.onSuccess) {
    ctx.onSuccess(personId)
  } else {
    ctx.router.push('/dashboard/members/' + personId)
    ctx.router.refresh()
  }
}

export interface MemberFormSubmitContext {
  supabase: SupabaseClient
  router: { push: (url: string) => void; refresh: () => void }
  t: (key: TranslationKey, values?: TranslationValues) => string
  isEditing: boolean
  initialData?: Person
  fields: MemberFormFields
  death: {
    currentValues: DeathDateValues
    deathYear: number | ''
    deathMonth: number | ''
    deathDay: number | ''
    deathLunarYear: number | ''
    deathLunarMonth: number | ''
    deathLunarDay: number | ''
  }
  birthYear: number | ''
  birthMonth: number | ''
  birthDay: number | ''
  isDeceased: boolean
  isInLaw: boolean
  birthOrder: number | ''
  generation: number | ''
  otherNames: string
  note: string
  avatarUrl: string
  avatarFile: File | null
  removeExistingAvatar: boolean
  isAdmin: boolean
  privateFields: {
    phoneNumber: string
    occupation: string
    currentResidence: string
  }
  hasGenerationChanged: boolean
  updateDescendantGenerations: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  /**
   * Shows "saved, but…" warnings; the form stays open until the user
   * continues (finishMemberSave).
   */
  setWarning: (value: MemberSaveWarning | null) => void
  onSuccess?: (personId: string) => void
}

// Orchestrates validation + persistence + navigation for the member form.
// The component only wires state; every branch lives here so the React
// function stays simple.
export async function submitMemberForm(ctx: MemberFormSubmitContext) {
  const { t, setLoading, setError, setWarning } = ctx
  setLoading(true)
  setError(null)
  setWarning(null)

  const normalized = normalizeDeathDates(
    ctx.isDeceased,
    ctx.death.currentValues
  )
  if (!normalized.ok) {
    setError(t(normalized.errorKey))
    setLoading(false)
    return
  }

  const validationError = validateMemberForm(
    ctx.birthDay,
    ctx.birthMonth,
    ctx.birthYear,
    ctx.isDeceased,
    normalized.values
  )
  if (validationError) {
    setError(t(validationError))
    setLoading(false)
    return
  }

  try {
    // A changed birth date must still fall after the parents' and before the
    // children's (new members have no relatives yet).
    const personId = ctx.initialData?.id
    if (ctx.isEditing && personId && birthDateChanged(ctx)) {
      const conflict = await findSavedBirthDateConflict(ctx.supabase, {
        id: personId,
        birth_year: toNullable(ctx.birthYear),
        birth_month: toNullable(ctx.birthMonth),
        birth_day: toNullable(ctx.birthDay)
      })
      if (conflict) {
        setError(
          t(
            conflict.relation === 'parent'
              ? 'memberBornBeforeParent'
              : 'memberBornAfterChild',
            { name: conflict.name }
          )
        )
        return
      }
    }

    const { personId: currentPersonId, generationUpdateError } =
      await saveMember({
        supabase: ctx.supabase,
        isEditing: ctx.isEditing,
        initialData: ctx.initialData,
        fields: ctx.fields,
        deathValues: normalized.values,
        avatarUrl: ctx.avatarUrl,
        avatarFile: ctx.avatarFile,
        removeExistingAvatar: ctx.removeExistingAvatar,
        isAdmin: ctx.isAdmin,
        privateFields: ctx.privateFields,
        hasGenerationChanged: ctx.hasGenerationChanged,
        updateDescendantGenerations: ctx.updateDescendantGenerations
      })

    if (!currentPersonId) throw new Error(t('saveIdError'))
    if (generationUpdateError) {
      setWarning({
        message: t('memberSavedGenerationNotUpdated', {
          error: generationUpdateError
        }),
        personId: currentPersonId
      })
      return
    }
    finishMemberSave(ctx, currentPersonId)
  } catch (err) {
    console.error('Error saving member:', err)
    setError(
      err instanceof InvalidAvatarError
        ? t('invalidImageType')
        : (err as Error).message || t('saveMemberError')
    )
  } finally {
    setLoading(false)
  }
}
