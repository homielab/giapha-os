import { SupabaseClient } from '@supabase/supabase-js'

import { updateDescendantGenerationsAction } from '@/app/actions/member'
import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { Person } from '@/types'
import { getAvatarStoragePath } from '@/utils/avatar'
import { findPossibleDuplicates } from '@/utils/duplicatePeople'
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
  findParentDeathIssues,
  type BirthDateConflict,
  type LinkedRelative,
  type ParentDeathFinding
} from '@/utils/relationshipValidation'
import { PersonNotUpdatedError } from '@/utils/writeErrors'

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
  /**
   * False when the private details could not be read for this form: they are
   * then left exactly as stored (no upsert, and above all no delete).
   * Defaults to true.
   */
  privateLoaded?: boolean
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
  /**
   * Only for a newly created member: messages of the steps after the insert
   * (avatar upload, private details) that failed. The person already exists,
   * so the form must switch to editing it instead of creating it again.
   */
  warnings: string[]
  /** The row just inserted (set only when this call created the member). */
  createdPerson?: Person
}

const errorMessage = (err: unknown) =>
  (err as { message?: string } | null)?.message || String(err)

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
  const warnings: string[] = []
  // After the insert, a failing step is reported instead of thrown: throwing
  // would leave the form in "create" mode and a second save would add the
  // same person again.
  const isNew = !isEditing || !currentPersonId
  const fail = (err: unknown) => {
    if (!isNew) throw err
    warnings.push(errorMessage(err))
  }

  // For a new member, we must insert first to get the ID for the avatar filename
  if (!isEditing || !currentPersonId) {
    const { data: newPerson, error: createError } = await supabase
      .from('persons')
      .insert(buildPersonData(fullFields, currentAvatarUrl || null))
      .select()
      .single()
    if (createError) throw createError
    currentPersonId = newPerson.id
    createdPerson = newPerson as Person
  } else {
    // Update existing member info first
    // RLS turns a refused update into "0 rows" without an error.
    const { data: updated, error: updateError } = await supabase
      .from('persons')
      .update(buildPersonData(fullFields, currentAvatarUrl || null))
      .eq('id', currentPersonId)
      .select('id')
    if (updateError) throw updateError
    if (!updated || updated.length === 0) throw new PersonNotUpdatedError()
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
        .select('id')
      if (updateAvatarError) throw updateAvatarError
      if (!avatarRows || avatarRows.length === 0) {
        throw new PersonNotUpdatedError()
      }
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
    createdPerson
  }
}

const RELATIVE_COLUMNS =
  'id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day'
const PARENT_CHILD_TYPES = ['biological_child', 'adopted_child']

export interface SavedRelatives {
  parents: LinkedRelative[]
  children: LinkedRelative[]
}

/**
 * Loads the parents and children of a saved member (adopted ones flagged).
 * Throws when a query fails.
 */
export async function loadSavedRelatives(
  supabase: SupabaseClient,
  personId: string
): Promise<SavedRelatives> {
  const [asParent, asChild] = await Promise.all([
    supabase
      .from('relationships')
      .select('person_b, type')
      .eq('person_a', personId)
      .in('type', PARENT_CHILD_TYPES),
    supabase
      .from('relationships')
      .select('person_a, type')
      .eq('person_b', personId)
      .in('type', PARENT_CHILD_TYPES)
  ])
  if (asParent.error) throw asParent.error
  if (asChild.error) throw asChild.error

  // A relative linked twice counts as adopted only when every link is.
  const link = (rows: unknown, key: 'person_a' | 'person_b') => {
    const ids = new Map<string, boolean>()
    for (const row of (rows ?? []) as Record<string, string>[]) {
      const adopted = row.type === 'adopted_child'
      ids.set(row[key], (ids.get(row[key]) ?? true) && adopted)
    }
    return ids
  }
  const childIds = link(asParent.data, 'person_b')
  const parentIds = link(asChild.data, 'person_a')
  if (childIds.size === 0 && parentIds.size === 0)
    return { parents: [], children: [] }

  const { data, error } = await supabase
    .from('persons')
    .select(RELATIVE_COLUMNS)
    .in('id', [...parentIds.keys(), ...childIds.keys()])
  if (error) throw error

  const relatives = (data ?? []) as LinkedRelative[]
  return {
    parents: relatives
      .filter((p) => parentIds.has(p.id))
      .map((p) => ({ ...p, adopted: parentIds.get(p.id) })),
    children: relatives
      .filter((p) => childIds.has(p.id))
      .map((p) => ({ ...p, adopted: childIds.get(p.id) }))
  }
}

const MAX_LISTED_DUPLICATES = 5

const deathNames = (finding: ParentDeathFinding) => ({
  parent: finding.parent,
  child: finding.child
})

const toNullable = (value: number | '') => (value === '' ? null : value)

function birthDateChanged(ctx: MemberFormSubmitContext) {
  const before = ctx.initialData
  return (
    toNullable(ctx.birthYear) !== (before?.birth_year ?? null) ||
    toNullable(ctx.birthMonth) !== (before?.birth_month ?? null) ||
    toNullable(ctx.birthDay) !== (before?.birth_day ?? null)
  )
}

function deathOrGenderChanged(
  before: Person | undefined,
  after: {
    gender: string
    death_year: number | null
    death_month: number | null
    death_day: number | null
  }
) {
  return (
    (before?.gender != null && before.gender !== after.gender) ||
    after.death_year !== (before?.death_year ?? null) ||
    after.death_month !== (before?.death_month ?? null) ||
    after.death_day !== (before?.death_day ?? null)
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
  privateLoaded?: boolean
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
  /**
   * Asks before saving something that only looks wrong (a possible duplicate,
   * a father who died long before a birth). The form repeats the submit with
   * `confirmed` set when the user continues.
   */
  setConfirmation: (value: string | null) => void
  /** The user accepted the confirmation: skip the checks that ask. */
  confirmed?: boolean
  onSuccess?: (personId: string) => void
  /** A new member was inserted but a later step failed: switch to edit mode. */
  onCreated?: (person: Person) => void
}

// Orchestrates validation + persistence + navigation for the member form.
// The component only wires state; every branch lives here so the React
// function stays simple.
export async function submitMemberForm(ctx: MemberFormSubmitContext) {
  const { t, setLoading, setError, setWarning, setConfirmation } = ctx
  setLoading(true)
  setError(null)
  setWarning(null)
  setConfirmation(null)

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
    normalized.values,
    ctx.fields.fullName
  )
  if (validationError) {
    setError(t(validationError))
    setLoading(false)
    return
  }

  try {
    const fullName = ctx.fields.fullName.trim()
    const warnings: string[] = []

    // A changed birth or death date must still fit the parents and children
    // (new members have no relatives yet).
    const personId = ctx.initialData?.id
    if (ctx.isEditing && personId) {
      const birthChanged = birthDateChanged(ctx)
      const person = {
        id: personId,
        full_name: fullName,
        gender: ctx.fields.gender,
        birth_year: toNullable(ctx.birthYear),
        birth_month: toNullable(ctx.birthMonth),
        birth_day: toNullable(ctx.birthDay),
        death_year: ctx.isDeceased ? toNullable(normalized.values.year) : null,
        death_month: ctx.isDeceased
          ? toNullable(normalized.values.month)
          : null,
        death_day: ctx.isDeceased ? toNullable(normalized.values.day) : null
      }
      if (
        (birthChanged && person.birth_year != null) ||
        deathOrGenderChanged(ctx.initialData, person)
      ) {
        const { parents, children } = await loadSavedRelatives(
          ctx.supabase,
          personId
        )
        const conflict = birthChanged
          ? findBirthDateConflict(person, parents, children)
          : null
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

        const findings = findParentDeathIssues(person, parents, children)
        const mother = findings.find((f) => f.issue === 'motherDiedBeforeBirth')
        if (mother) {
          setError(t('memberMotherDiedBeforeBirth', deathNames(mother)))
          return
        }
        for (const finding of findings)
          warnings.push(
            t('memberFatherDiedLongBeforeBirth', deathNames(finding))
          )
      }
    } else {
      const duplicates = await findPossibleDuplicates(
        ctx.supabase,
        fullName,
        toNullable(ctx.birthYear)
      )
      if (duplicates.length > 0) {
        warnings.push(
          t('memberPossibleDuplicate', {
            count: duplicates.length,
            names: duplicates
              .slice(0, MAX_LISTED_DUPLICATES)
              .map((p) =>
                p.birth_year == null
                  ? p.full_name
                  : `${p.full_name} (${p.birth_year})`
              )
              .join(', ')
          })
        )
      }
    }

    if (warnings.length > 0 && !ctx.confirmed) {
      setConfirmation(warnings.join('\n'))
      return
    }

    const {
      personId: currentPersonId,
      generationUpdateError,
      warnings: savedWarnings,
      createdPerson
    } = await saveMember({
      supabase: ctx.supabase,
      isEditing: ctx.isEditing,
      initialData: ctx.initialData,
      fields: ctx.fields,
      deathValues: normalized.values,
      avatarUrl: ctx.avatarUrl,
      avatarFile: ctx.avatarFile,
      removeExistingAvatar: ctx.removeExistingAvatar,
      isAdmin: ctx.isAdmin,
      privateLoaded: ctx.privateLoaded,
      privateFields: ctx.privateFields,
      hasGenerationChanged: ctx.hasGenerationChanged,
      updateDescendantGenerations: ctx.updateDescendantGenerations
    })

    if (!currentPersonId) throw new Error(t('saveIdError'))
    // The member exists now: edit it from here on, never insert it again.
    if (createdPerson && (savedWarnings.length > 0 || generationUpdateError))
      ctx.onCreated?.(createdPerson)
    if (savedWarnings.length > 0) {
      setWarning({
        message: t('memberSavedPartially', {
          error: savedWarnings.join('; ')
        }),
        personId: currentPersonId
      })
      return
    }
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
        : err instanceof PersonNotUpdatedError
          ? t('personNotUpdated')
          : (err as Error).message || t('saveMemberError')
    )
  } finally {
    setLoading(false)
  }
}
