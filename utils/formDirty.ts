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

/** True when a photo was chosen or any field was typed in the upload form. */
export function isUploadFormDirty(values: UploadFormValues): boolean {
  return (
    values.hasFile ||
    values.title !== '' ||
    values.description !== '' ||
    values.eventDate !== ''
  )
}
