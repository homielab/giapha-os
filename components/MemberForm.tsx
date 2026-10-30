'use client'

import { m } from 'framer-motion'
import { User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import DiscardChangesDialog from '@/components/member/DiscardChangesDialog'
import MemberAvatarField from '@/components/member/MemberAvatarField'
import MemberDeathFields from '@/components/member/MemberDeathFields'
import MemberFormFooter from '@/components/member/MemberFormFooter'
import { formSectionVariants } from '@/components/member/memberFormStyles'
import MemberGeneralFields from '@/components/member/MemberGeneralFields'
import MemberPrivateFields from '@/components/member/MemberPrivateFields'
import { useDeathDates } from '@/hooks/useDeathDates'
import { useMemberAvatar } from '@/hooks/useMemberAvatar'
import { useI18n } from '@/lib/i18n/useI18n'
import { Gender, Person } from '@/types'
import {
  finishMemberSave,
  isFormDirty,
  MemberSaveWarning,
  submitMemberForm
} from '@/utils/memberForm'
import {
  getMemberFormInitialValues,
  hasGenerationChanged,
  toNumberOrEmpty
} from '@/utils/memberFormInit'
import { createClient } from '@/utils/supabase/client'

interface MemberFormProps {
  initialData?: Person
  isEditing?: boolean
  isAdmin?: boolean
  /**
   * False when the private details failed to load: their fields are locked and
   * saving leaves the stored details untouched.
   */
  privateLoaded?: boolean
  /** Called with the saved person's ID after a successful save. Overrides default router.push. */
  onSuccess?: (personId: string) => void
  /** Called when user clicks Cancel. Overrides default router.back(). */
  onCancel?: () => void
}

export default function MemberForm({
  initialData: initialDataProp,
  isEditing: isEditingProp = false,
  isAdmin = false,
  privateLoaded = true,
  onSuccess,
  onCancel
}: MemberFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const [warning, setWarning] = useState<MemberSaveWarning | null>(null)
  // Set when a new member was inserted but a later step failed: the form then
  // edits that person, so saving again cannot create a duplicate.
  const [createdPerson, setCreatedPerson] = useState<Person | null>(null)
  // `updated_at` of the row after a save whose later step failed (see
  // `onUpdated`); without it, saving again would be taken as a conflict.
  const [savedUpdatedAt, setSavedUpdatedAt] = useState<string | null>(null)
  const initialData =
    createdPerson ??
    (initialDataProp && savedUpdatedAt
      ? { ...initialDataProp, updated_at: savedUpdatedAt }
      : initialDataProp)
  const isEditing = isEditingProp || createdPerson !== null
  const [confirmation, setConfirmation] = useState<string | null>(null)

  // Form states (defaults resolved by a plain helper to keep this component
  // free of per-field fallback branches)
  const init = useMemo(
    () => getMemberFormInitialValues(initialDataProp),
    [initialDataProp]
  )
  const [fullName, setFullName] = useState(init.fullName)
  const [otherNames, setOtherNames] = useState(init.otherNames)
  const [gender, setGender] = useState<Gender>(init.gender)
  const [birthYear, setBirthYear] = useState<number | ''>(init.birthYear)
  const [birthMonth, setBirthMonth] = useState<number | ''>(init.birthMonth)
  const [birthDay, setBirthDay] = useState<number | ''>(init.birthDay)

  const death = useDeathDates({
    day: init.deathDay,
    month: init.deathMonth,
    year: init.deathYear,
    lunarDay: init.deathLunarDay,
    lunarMonth: init.deathLunarMonth,
    lunarYear: init.deathLunarYear
  })
  const [isDeceased, setIsDeceased] = useState<boolean>(init.isDeceased)
  const [burialPlace, setBurialPlace] = useState(init.burialPlace)
  const [isInLaw, setIsInLaw] = useState<boolean>(init.isInLaw)

  const [birthOrder, setBirthOrder] = useState<number | ''>(init.birthOrder)
  const [generation, setGeneration] = useState<number | ''>(init.generation)

  const [updateDescendantGenerations, setUpdateDescendantGenerations] =
    useState(init.updateDescendantGenerations) // Default to true if they change it

  const generationChanged = hasGenerationChanged(
    isEditing,
    initialData,
    generation
  )

  const {
    avatarUrlRef,
    avatarFile,
    removeExistingAvatar,
    processingAvatar,
    setProcessingAvatar,
    avatarPreview,
    handleAvatarSelected,
    handleAvatarRemove
  } = useMemberAvatar(initialDataProp)

  const [note, setNote] = useState(initialData?.note || '')
  const errorRef = useRef<HTMLDivElement>(null)

  // Bring validation/save errors into view on long forms
  useEffect(() => {
    if (error || warning || confirmation) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error, warning, confirmation])

  // Private fields
  const [phoneNumber, setPhoneNumber] = useState(init.phoneNumber)
  const [occupation, setOccupation] = useState(init.occupation)
  const [currentResidence, setCurrentResidence] = useState(
    init.currentResidence
  )

  const dirty = isFormDirty(
    init,
    {
      fullName,
      otherNames,
      gender,
      birthYear,
      birthMonth,
      birthDay,
      deathYear: death.deathYear,
      deathMonth: death.deathMonth,
      deathDay: death.deathDay,
      deathLunarYear: death.deathLunarYear,
      deathLunarMonth: death.deathLunarMonth,
      deathLunarDay: death.deathLunarDay,
      isDeceased,
      burialPlace,
      isInLaw,
      birthOrder,
      generation,
      note,
      phoneNumber,
      occupation,
      currentResidence
    },
    avatarFile !== null || removeExistingAvatar
  )
  // Set once a save finished, so leaving afterwards is not questioned.
  const [saved, setSaved] = useState(false)
  const [askDiscard, setAskDiscard] = useState(false)
  const guardLeave = dirty && !saved

  // Ask the browser to confirm reload / tab close while there are changes.
  useEffect(() => {
    if (!guardLeave) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [guardLeave])

  const handleSuccess = (personId: string) => {
    setSaved(true)
    finishMemberSave({ router, onSuccess }, personId)
  }
  const leave = () => (onCancel ? onCancel() : router.back())

  const submit = (confirmed: boolean) => {
    void submitMemberForm({
      confirmed,
      supabase,
      router,
      t,
      isEditing,
      initialData,
      fields: {
        fullName,
        gender,
        birthYear,
        birthMonth,
        birthDay,
        deathYear: death.deathYear,
        deathMonth: death.deathMonth,
        deathDay: death.deathDay,
        deathLunarYear: death.deathLunarYear,
        deathLunarMonth: death.deathLunarMonth,
        deathLunarDay: death.deathLunarDay,
        isDeceased,
        isInLaw,
        birthOrder,
        generation,
        otherNames,
        note,
        burialPlace
      },
      death,
      birthYear,
      birthMonth,
      birthDay,
      isDeceased,
      isInLaw,
      birthOrder,
      generation,
      otherNames,
      note,
      avatarUrl: avatarUrlRef.current,
      avatarFile,
      removeExistingAvatar,
      isAdmin,
      privateLoaded,
      privateFields: { phoneNumber, occupation, currentResidence },
      hasGenerationChanged: generationChanged,
      updateDescendantGenerations,
      setLoading,
      setError,
      setWarning,
      setConfirmation,
      setChanged,
      onSuccess: handleSuccess,
      onCreated: setCreatedPerson,
      onUpdated: setSavedUpdatedAt
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(false)
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 sm:space-y-8'>
      <m.div
        variants={formSectionVariants}
        initial='hidden'
        animate='show'
        className='rounded-2xl border border-stone-200/80 bg-white/80 p-5 sm:p-8'>
        <h3 className='mb-6 flex items-center gap-2 border-b border-stone-100 pb-4 font-serif text-lg font-semibold text-stone-800 sm:text-xl'>
          <User className='size-5 text-amber-600' />
          {t('generalInfo')}
        </h3>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <MemberGeneralFields
            fullName={fullName}
            onFullNameChange={setFullName}
            otherNames={otherNames}
            onOtherNamesChange={setOtherNames}
            gender={gender}
            onGenderChange={setGender}
            isInLaw={isInLaw}
            onIsInLawChange={setIsInLaw}
            birthOrder={birthOrder}
            onBirthOrderChange={setBirthOrder}
            generation={generation}
            onGenerationChange={setGeneration}
            hasGenerationChanged={generationChanged}
            updateDescendantGenerations={updateDescendantGenerations}
            onUpdateDescendantGenerationsChange={setUpdateDescendantGenerations}
            birthDay={birthDay}
            onBirthDayChange={setBirthDay}
            birthMonth={birthMonth}
            onBirthMonthChange={setBirthMonth}
            birthYear={birthYear}
            onBirthYearChange={setBirthYear}
            note={note}
            onNoteChange={setNote}
          />

          <MemberAvatarField
            avatarPreview={avatarPreview}
            gender={gender}
            fullName={fullName}
            processingAvatar={processingAvatar}
            onProcessingChange={setProcessingAvatar}
            onFileSelected={handleAvatarSelected}
            onRemove={handleAvatarRemove}
            onError={setError}
          />

          <MemberDeathFields
            isDeceased={isDeceased}
            onDeceasedChange={(checked) => {
              setIsDeceased(checked)
              if (!checked) death.clearAll()
            }}
            deathDay={death.deathDay}
            deathMonth={death.deathMonth}
            deathYear={death.deathYear}
            deathLunarDay={death.deathLunarDay}
            deathLunarMonth={death.deathLunarMonth}
            deathLunarYear={death.deathLunarYear}
            deathLunarLeap={death.deathLunarLeap}
            onLunarLeapChange={death.setLunarLeap}
            onSolarChange={(field, value) =>
              death.setSolarField(field, toNumberOrEmpty(value))
            }
            onLunarChange={(field, value) =>
              death.setLunarField(field, toNumberOrEmpty(value))
            }
            burialPlace={burialPlace}
            onBurialPlaceChange={setBurialPlace}
          />
        </div>
      </m.div>

      {/* Private Information Section (Admin Only) */}
      {isAdmin && (
        <MemberPrivateFields
          isDeceased={isDeceased}
          locked={!privateLoaded}
          phoneNumber={phoneNumber}
          onPhoneNumberChange={setPhoneNumber}
          occupation={occupation}
          onOccupationChange={setOccupation}
          currentResidence={currentResidence}
          onCurrentResidenceChange={setCurrentResidence}
        />
      )}

      <MemberFormFooter
        error={error}
        onReload={changed ? () => window.location.reload() : undefined}
        warning={warning?.message ?? null}
        onContinue={() => {
          if (!warning) return
          setWarning(null)
          handleSuccess(warning.personId)
        }}
        confirmation={confirmation}
        onConfirm={() => submit(true)}
        errorRef={errorRef}
        loading={loading}
        processingAvatar={processingAvatar}
        isEditing={isEditing}
        onCancel={() => (guardLeave ? setAskDiscard(true) : leave())}
      />
      {askDiscard && (
        <DiscardChangesDialog
          onKeepEditing={() => setAskDiscard(false)}
          onDiscard={() => {
            setAskDiscard(false)
            setSaved(true)
            leave()
          }}
        />
      )}
    </form>
  )
}
