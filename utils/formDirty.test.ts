import { describe, expect, it } from 'bun:test'

import { CustomEventRecord } from '@/utils/eventHelpers'
import {
  CustomEventFormValues,
  isCustomEventFormDirty,
  isUploadFormDirty,
  uploadFormValuesFrom
} from '@/utils/formDirty'

const today = '2026-10-30'
const empty: CustomEventFormValues = {
  name: '',
  eventDate: today,
  location: '',
  content: '',
  recurrence: 'none',
  dateMode: 'solar',
  lunarDay: '',
  lunarMonth: '',
  lunarYear: ''
}
const record: CustomEventRecord = {
  id: 'e1',
  name: 'Giỗ ông',
  content: null,
  event_date: '2026-03-01',
  location: 'Nhà thờ họ',
  created_by: null,
  recurrence: 'yearly_solar'
}
const fromRecord: CustomEventFormValues = {
  ...empty,
  name: 'Giỗ ông',
  eventDate: '2026-03-01',
  location: 'Nhà thờ họ',
  recurrence: 'yearly_solar'
}

describe('isCustomEventFormDirty', () => {
  it('is clean for a new untouched form', () => {
    expect(isCustomEventFormDirty(empty, null, today)).toBe(false)
  })

  it('flags typed name, content, location, date or recurrence', () => {
    expect(isCustomEventFormDirty({ ...empty, name: 'A' }, null, today)).toBe(
      true
    )
    expect(
      isCustomEventFormDirty({ ...empty, content: 'x' }, null, today)
    ).toBe(true)
    expect(
      isCustomEventFormDirty({ ...empty, location: 'x' }, null, today)
    ).toBe(true)
    expect(
      isCustomEventFormDirty({ ...empty, eventDate: '2026-01-01' }, null, today)
    ).toBe(true)
    expect(
      isCustomEventFormDirty(
        { ...empty, recurrence: 'yearly_solar' },
        null,
        today
      )
    ).toBe(true)
  })

  it('ignores switching to lunar mode until a lunar field is filled', () => {
    const lunar = { ...empty, dateMode: 'lunar' as const }
    expect(isCustomEventFormDirty(lunar, null, today)).toBe(false)
    expect(isCustomEventFormDirty({ ...lunar, lunarDay: 5 }, null, today)).toBe(
      true
    )
  })

  it('compares an edited event with the saved one', () => {
    expect(isCustomEventFormDirty(fromRecord, record, today)).toBe(false)
    expect(
      isCustomEventFormDirty({ ...fromRecord, content: 'mới' }, record, today)
    ).toBe(true)
    expect(
      isCustomEventFormDirty({ ...fromRecord, eventDate: today }, record, today)
    ).toBe(true)
  })
})

describe('isUploadFormDirty', () => {
  const blank = { hasFile: false, title: '', description: '', eventDate: '' }

  it('is clean when nothing was chosen or typed', () => {
    expect(isUploadFormDirty(blank)).toBe(false)
  })

  it('flags a chosen photo or any typed field', () => {
    expect(isUploadFormDirty({ ...blank, hasFile: true })).toBe(true)
    expect(isUploadFormDirty({ ...blank, title: 'Ảnh' })).toBe(true)
    expect(isUploadFormDirty({ ...blank, description: 'x' })).toBe(true)
    expect(isUploadFormDirty({ ...blank, eventDate: '2026-01-01' })).toBe(true)
  })
})

describe('editing a gallery photo', () => {
  const item = {
    title: 'Giỗ tổ',
    description: 'Cả họ',
    event_date: '2024-03-15T00:00:00Z'
  }
  const base = uploadFormValuesFrom(item)

  it('starts from the saved title, description and date', () => {
    expect(base).toEqual({
      title: 'Giỗ tổ',
      description: 'Cả họ',
      eventDate: '2024-03-15'
    })
    expect(
      uploadFormValuesFrom({ title: 'A', description: null, event_date: null })
    ).toEqual({ title: 'A', description: '', eventDate: '' })
    expect(uploadFormValuesFrom(null)).toEqual({
      title: '',
      description: '',
      eventDate: ''
    })
  })

  it('is clean when opened and closed without changes', () => {
    expect(isUploadFormDirty({ hasFile: false, ...base }, base)).toBe(false)
  })

  it('flags an edited field or a new photo', () => {
    expect(
      isUploadFormDirty({ hasFile: false, ...base, title: 'Khác' }, base)
    ).toBe(true)
    expect(isUploadFormDirty({ hasFile: true, ...base }, base)).toBe(true)
  })
})
