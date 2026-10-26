import { SupabaseClient } from '@supabase/supabase-js'

import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { Person } from '@/types'
import { DeathDateValues, MemberFormFields } from '@/utils/memberFormHelpers'

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
  /** `updated_at` of the person row after this save (edit or create). */
  savedUpdatedAt?: string
}

export interface MemberSaveWarning {
  message: string
  personId: string
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
  /**
   * The person was changed by someone else since the form loaded: the form
   * offers a reload (nothing was saved).
   */
  setChanged?: (value: boolean) => void
  /** A new member was inserted but a later step failed: switch to edit mode. */
  onCreated?: (person: Person) => void
  /**
   * An existing member was updated but a later step failed or warned: the
   * form's reference `updated_at` moves to this value so "save again" works.
   */
  onUpdated?: (updatedAt: string) => void
}
