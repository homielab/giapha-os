import { Gender, Person } from '@/types'

export interface MemberFormInitialValues {
  fullName: string
  otherNames: string
  gender: Gender
  birthYear: number | ''
  birthMonth: number | ''
  birthDay: number | ''
  deathYear: number | ''
  deathMonth: number | ''
  deathDay: number | ''
  deathLunarYear: number | ''
  deathLunarMonth: number | ''
  deathLunarDay: number | ''
  isDeceased: boolean
  burialPlace: string
  isInLaw: boolean
  birthOrder: number | ''
  generation: number | ''
  updateDescendantGenerations: boolean
  note: string
  phoneNumber: string
  occupation: string
  currentResidence: string
}

// Single source for every default/lookup when seeding the member form state.
export function getMemberFormInitialValues(
  initialData?: Person
): MemberFormInitialValues {
  return {
    fullName: initialData?.full_name || '',
    otherNames: initialData?.other_names || '',
    gender: initialData?.gender || 'male',
    birthYear: initialData?.birth_year || '',
    birthMonth: initialData?.birth_month || '',
    birthDay: initialData?.birth_day || '',
    deathYear: initialData?.death_year || '',
    deathMonth: initialData?.death_month || '',
    deathDay: initialData?.death_day || '',
    deathLunarYear: initialData?.death_lunar_year || '',
    deathLunarMonth: initialData?.death_lunar_month || '',
    deathLunarDay: initialData?.death_lunar_day || '',
    isDeceased: initialData?.is_deceased || false,
    burialPlace: initialData?.burial_place ?? '',
    isInLaw: initialData?.is_in_law || false,
    birthOrder: initialData?.birth_order || '',
    generation: initialData?.generation || '',
    updateDescendantGenerations: true,
    note: initialData?.note || '',
    phoneNumber: initialData?.phone_number ?? '',
    occupation: initialData?.occupation ?? '',
    currentResidence: initialData?.current_residence ?? ''
  }
}

export function hasGenerationChanged(
  isEditing: boolean,
  initialData: Person | undefined,
  generation: number | ''
): boolean {
  return (
    isEditing &&
    initialData?.generation !== undefined &&
    generation !== initialData?.generation &&
    generation !== ''
  )
}

export function toNumberOrEmpty(value: string): number | '' {
  return value ? Number(value) : ''
}
