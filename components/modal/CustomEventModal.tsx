'use client'

import { AnimatePresence, m, Variants } from 'framer-motion'
import { useEffect, useId, useMemo, useState } from 'react'

import DiscardChangesDialog from '@/components/member/DiscardChangesDialog'
import EventDateFields from '@/components/modal/EventDateFields'
import EventErrorBanner from '@/components/modal/EventErrorBanner'
import EventHeaderActions from '@/components/modal/EventHeaderActions'
import EventModalFooter from '@/components/modal/EventModalFooter'
import EventNameField from '@/components/modal/EventNameField'
import EventRecurrenceField from '@/components/modal/EventRecurrenceField'
import EventTextFields from '@/components/modal/EventTextFields'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import { resolveLunarEventDate } from '@/utils/customEventLunar'
import {
  CustomEventNotAllowedError,
  deleteCustomEvent,
  saveCustomEvent
} from '@/utils/customEventMutations'
import {
  CustomEventRecord,
  CustomEventRecurrence,
  defaultEventDate,
  toRecurrence
} from '@/utils/eventHelpers'
import { isCustomEventFormDirty } from '@/utils/formDirty'
import { TextTooLongError } from '@/utils/limits'
import { createClient } from '@/utils/supabase/client'

interface CustomEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  eventToEdit?: CustomEventRecord | null
}

export default function CustomEventModal({
  isOpen,
  onClose,
  onSuccess,
  eventToEdit
}: CustomEventModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const [loading, setLoading] = useState(false)
  const [askDiscard, setAskDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(eventToEdit?.name || '')
  const [eventDate, setEventDate] = useState(eventToEdit?.event_date || '')
  const [location, setLocation] = useState(eventToEdit?.location || '')
  const [content, setContent] = useState(eventToEdit?.content || '')
  const [recurrence, setRecurrence] = useState<CustomEventRecurrence>(
    toRecurrence(eventToEdit?.recurrence)
  )

  // Lunar date mode
  const [dateMode, setDateMode] = useState<'solar' | 'lunar'>('solar')
  const [lunarDay, setLunarDay] = useState<number | ''>('')
  const [lunarMonth, setLunarMonth] = useState<number | ''>('')
  const [lunarYear, setLunarYear] = useState<number | ''>('')
  const [lunarLeap, setLunarLeap] = useState(false)
  // An incomplete lunar date is only flagged after a save attempt.
  const [lunarSubmitted, setLunarSubmitted] = useState(false)

  const lunarResult = useMemo(
    () =>
      resolveLunarEventDate({
        day: lunarDay,
        month: lunarMonth,
        year: lunarYear,
        leap: lunarLeap
      }),
    [lunarDay, lunarMonth, lunarYear, lunarLeap]
  )
  const lunarConvertError =
    dateMode === 'lunar' &&
    (lunarResult.status === 'invalid' ||
      (lunarSubmitted && lunarResult.status === 'incomplete'))
      ? t('lunarDateInvalid')
      : null

  const isDirty = isCustomEventFormDirty(
    {
      name,
      eventDate,
      location,
      content,
      recurrence,
      dateMode,
      lunarDay,
      lunarMonth,
      lunarYear
    },
    eventToEdit
  )
  // Esc, the backdrop and the close buttons ask first when there are changes.
  const requestClose = () => {
    if (loading) return
    if (isDirty) setAskDiscard(true)
    else onClose()
  }
  const dialogRef = useModalA11y(requestClose, isOpen)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!isOpen) return
      if (eventToEdit) {
        setName(eventToEdit.name)
        setEventDate(eventToEdit.event_date)
        setLocation(eventToEdit.location || '')
        setContent(eventToEdit.content || '')
        setRecurrence(toRecurrence(eventToEdit.recurrence))
      } else {
        setName('')
        setEventDate(defaultEventDate())
        setLocation('')
        setContent('')
        setRecurrence('none')
      }
      setError(null)
      setAskDiscard(false)
      setDateMode('solar')
      setLunarDay('')
      setLunarMonth('')
      setLunarYear('')
      setLunarLeap(false)
      setLunarSubmitted(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen, eventToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let date = eventDate
    if (dateMode === 'lunar') {
      // Never save today's default date for a missing or impossible lunar date.
      if (lunarResult.status !== 'ok') {
        setLunarSubmitted(true)
        return
      }
      date = lunarResult.date
    }
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const payload = {
        name,
        event_date: date,
        location: location || null,
        content: content || null,
        // Sent only when needed, so a database without the recurrence
        // column (migration not run yet) still saves one-off events.
        ...(recurrence !== 'none' || eventToEdit?.recurrence != null
          ? { recurrence }
          : {})
      }

      await saveCustomEvent(supabase, payload, eventToEdit?.id)

      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      if (err instanceof CustomEventNotAllowedError) {
        setError(t('eventNotAllowed'))
      } else if (err instanceof TextTooLongError) {
        setError(t('textTooLong', { field: t(err.label), max: err.max }))
      } else if (err instanceof Error) {
        setError(err.message || t('saveEventError'))
      } else {
        setError(t('saveEventError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!eventToEdit) return
    if (!window.confirm(t('confirmDeleteEvent'))) return

    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      await deleteCustomEvent(supabase, eventToEdit.id)

      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      if (err instanceof CustomEventNotAllowedError) {
        setError(t('eventNotAllowed'))
      } else if (err instanceof Error) {
        setError(err.message || t('deleteEventError'))
      } else {
        setError(t('deleteEventError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const formSectionVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby={titleId}
          tabIndex={-1}
          className='fixed inset-0 z-100 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm outline-none sm:p-6'>
          {/* Click-away backdrop */}
          <button
            type='button'
            aria-label={t('close')}
            className='absolute inset-0 cursor-pointer'
            onClick={requestClose}
          />

          {/* Modal Content */}
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className='relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white/95 backdrop-blur-2xl'>
            <EventHeaderActions onClose={requestClose} />

            <div className='custom-scrollbar flex-1 overflow-y-auto px-4 pt-16 pb-8 sm:px-8'>
              <h2
                id={titleId}
                className='mb-6 font-serif text-xl font-semibold text-stone-800'>
                {eventToEdit ? t('editEvent') : t('addCustomEvent')}
              </h2>

              <EventErrorBanner error={error} />

              <form onSubmit={handleSubmit} className='space-y-6'>
                <m.div
                  variants={formSectionVariants}
                  initial='hidden'
                  animate='show'
                  className='space-y-5 rounded-2xl border border-stone-200/80 bg-white/80 p-5 sm:p-6'>
                  <EventNameField name={name} onNameChange={setName} />

                  <EventDateFields
                    dateMode={dateMode}
                    onToggleMode={() => {
                      if (dateMode === 'lunar' && lunarResult.status === 'ok') {
                        setEventDate(lunarResult.date)
                      }
                      setDateMode(dateMode === 'solar' ? 'lunar' : 'solar')
                      setLunarSubmitted(false)
                    }}
                    eventDate={eventDate}
                    onEventDateChange={setEventDate}
                    lunarDay={lunarDay}
                    lunarMonth={lunarMonth}
                    lunarYear={lunarYear}
                    lunarLeap={lunarLeap}
                    onLunarDayChange={setLunarDay}
                    onLunarMonthChange={(value) => {
                      setLunarMonth(value)
                      setLunarLeap(false)
                    }}
                    onLunarYearChange={(value) => {
                      setLunarYear(value)
                      setLunarLeap(false)
                    }}
                    onLunarLeapChange={setLunarLeap}
                    lunarSolarDate={
                      lunarResult.status === 'ok' ? lunarResult.date : null
                    }
                    lunarConvertError={lunarConvertError}
                  />

                  <EventRecurrenceField
                    recurrence={recurrence}
                    onRecurrenceChange={setRecurrence}
                  />

                  <EventTextFields
                    location={location}
                    content={content}
                    onLocationChange={setLocation}
                    onContentChange={setContent}
                  />
                </m.div>

                <EventModalFooter
                  isEdit={Boolean(eventToEdit)}
                  loading={loading}
                  onDelete={handleDelete}
                  onClose={requestClose}
                />
              </form>
            </div>
          </m.div>
          {askDiscard && (
            <DiscardChangesDialog
              onKeepEditing={() => setAskDiscard(false)}
              onDiscard={() => {
                setAskDiscard(false)
                onClose()
              }}
            />
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
