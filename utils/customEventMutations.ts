import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  CustomEventRecord,
  CustomEventRecurrence
} from '@/utils/eventHelpers'
import { checkTextLength, MAX_NAME, MAX_NOTE } from '@/utils/limits'

/** The row-level policy lets only the creator or an admin change an event. */
export function canEditCustomEvent(
  event: Pick<CustomEventRecord, 'created_by'>,
  userId: string | null | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true
  return Boolean(userId) && event.created_by === userId
}

/** Thrown when the database accepted the query but changed no row (RLS). */
export class CustomEventNotAllowedError extends Error {
  constructor() {
    super('Custom event not changed')
    this.name = 'CustomEventNotAllowedError'
  }
}

export interface CustomEventPayload {
  name: string
  event_date: string
  location: string | null
  content: string | null
  recurrence?: CustomEventRecurrence
}

/**
 * Inserts or updates a custom event. Row-level security hides rows from an
 * update or delete without an error, so `.select('id')` is used and zero rows
 * are reported as `CustomEventNotAllowedError`. A name, location or content
 * over the backup limits throws `TextTooLongError` before anything is saved.
 */
export async function saveCustomEvent(
  supabase: SupabaseClient,
  payload: CustomEventPayload,
  eventId?: string
): Promise<void> {
  checkTextLength('eventName', payload.name, MAX_NAME)
  checkTextLength('location', payload.location, MAX_NOTE)
  checkTextLength('details', payload.content, MAX_NOTE)
  if (!eventId) {
    const { error } = await supabase.from('custom_events').insert([payload])
    if (error) throw error
    return
  }
  const { data, error } = await supabase
    .from('custom_events')
    .update(payload)
    .eq('id', eventId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new CustomEventNotAllowedError()
}

export async function deleteCustomEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('custom_events')
    .delete()
    .eq('id', eventId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new CustomEventNotAllowedError()
}
