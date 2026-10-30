import {
  CustomEventRecord,
  CustomEventRecurrence,
  defaultEventDate,
  toRecurrence
} from '@/utils/eventHelpers'

export interface CustomEventFormValues {
  name: string
  eventDate: string
  location: string
  content: string
  recurrence: CustomEventRecurrence
  dateMode: 'solar' | 'lunar'
  lunarDay: number | ''
  lunarMonth: number | ''
  lunarYear: number | ''
}

/**
 * True when the event form differs from what it opened with: the event being
 * edited, or an empty form dated today for a new event.
 */
export function isCustomEventFormDirty(
  values: CustomEventFormValues,
  eventToEdit?: CustomEventRecord | null,
  today: string = defaultEventDate()
): boolean {
  const base = {
    name: eventToEdit?.name ?? '',
    eventDate: eventToEdit?.event_date ?? today,
    location: eventToEdit?.location ?? '',
    content: eventToEdit?.content ?? '',
    recurrence: toRecurrence(eventToEdit?.recurrence)
  }
  if (
    values.name !== base.name ||
    values.location !== base.location ||
    values.content !== base.content ||
    values.recurrence !== base.recurrence
  ) {
    return true
  }
  if (values.dateMode === 'lunar') {
    return (
      values.lunarDay !== '' ||
      values.lunarMonth !== '' ||
      values.lunarYear !== ''
    )
  }
  return values.eventDate !== base.eventDate
}

export interface UploadFormValues {
  hasFile: boolean
  title: string
  description: string
  eventDate: string
}

type UploadFormFields = Omit<UploadFormValues, 'hasFile'>

const BLANK_UPLOAD_FORM: UploadFormFields = {
  title: '',
  description: '',
  eventDate: ''
}

/** The upload form's starting values: blank, or the saved photo's fields. */
export function uploadFormValuesFrom(
  item?: {
    title: string
    description: string | null
    event_date: string | null
  } | null
): UploadFormFields {
  if (!item) return BLANK_UPLOAD_FORM
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    // <input type="date"> takes YYYY-MM-DD only.
    eventDate: item.event_date ? item.event_date.slice(0, 10) : ''
  }
}

/**
 * True when a photo was chosen or a field differs from where the form started
 * (blank when adding, the saved values when editing).
 */
export function isUploadFormDirty(
  values: UploadFormValues,
  base: UploadFormFields = BLANK_UPLOAD_FORM
): boolean {
  return (
    values.hasFile ||
    values.title !== base.title ||
    values.description !== base.description ||
    values.eventDate !== base.eventDate
  )
}
