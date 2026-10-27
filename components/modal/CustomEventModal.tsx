'use client'

import { AnimatePresence, m, Variants } from 'framer-motion'
import { useEffect, useId, useState } from 'react'

import EventDateFields from '@/components/modal/EventDateFields'
import EventErrorBanner from '@/components/modal/EventErrorBanner'
import EventHeaderActions from '@/components/modal/EventHeaderActions'
import EventModalFooter from '@/components/modal/EventModalFooter'
import EventNameField from '@/components/modal/EventNameField'
import EventRecurrenceField from '@/components/modal/EventRecurrenceField'
import EventTextFields from '@/components/modal/EventTextFields'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useI18n } from '@/lib/i18n/useI18n'
import {
  CustomEventNotAllowedError,
  deleteCustomEvent,
  saveCustomEvent
} from '@/utils/customEventMutations'
import {
  CustomEventRecord,
  CustomEventRecurrence,
  toRecurrence
} from '@/utils/eventHelpers'
import { lunarToSolar } from '@/utils/lunarCalendar'
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
  const dialogRef = useModalA11y(onClose, isOpen)
  const [loading, setLoading] = useState(false)
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
  const [lunarConvertError, setLunarConvertError] = useState<string | null>(
    null
  )

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
        // Default to today
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        setEventDate(`${y}-${m}-${d}`)
        setLocation('')
        setContent('')
        setRecurrence('none')
      }
      setError(null)
      setDateMode('solar')
      setLunarDay('')
      setLunarMonth('')
      setLunarYear('')
      setLunarConvertError(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen, eventToEdit])

  // Auto-convert lunar → solar when all 3 fields are filled
  useEffect(() => {
    if (
      dateMode === 'lunar' &&
      lunarDay !== '' &&
      lunarMonth !== '' &&
      lunarYear !== '' &&
      lunarYear > 100
    ) {
      const frame = requestAnimationFrame(() => {
        const solar = lunarToSolar(
          lunarYear as number,
          lunarMonth as number,
          lunarDay as number
        )
        if (solar) {
          const m = String(solar.month).padStart(2, '0')
          const d = String(solar.day).padStart(2, '0')
          setEventDate(`${solar.year}-${m}-${d}`)
          setLunarConvertError(null)
        } else {
          setLunarConvertError(t('lunarDateInvalid'))
        }
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [dateMode, lunarDay, lunarMonth, lunarYear, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const payload = {
        name,
        event_date: eventDate,
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
            onClick={onClose}
          />

          {/* Modal Content */}
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className='relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white/95 backdrop-blur-2xl'>
            <EventHeaderActions onClose={onClose} />

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
                      setDateMode(dateMode === 'solar' ? 'lunar' : 'solar')
                      setLunarConvertError(null)
                    }}
                    eventDate={eventDate}
                    onEventDateChange={setEventDate}
                    lunarDay={lunarDay}
                    lunarMonth={lunarMonth}
                    lunarYear={lunarYear}
                    onLunarDayChange={setLunarDay}
                    onLunarMonthChange={setLunarMonth}
                    onLunarYearChange={setLunarYear}
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
                  onClose={onClose}
                />
              </form>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
