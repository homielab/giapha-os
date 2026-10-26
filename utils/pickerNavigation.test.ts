import { describe, expect, test } from 'bun:test'

import { filterPickerPersons, pickerKeyNavigation } from './pickerNavigation'

const people = [
  { id: '1', full_name: 'Nguyễn Văn An' },
  { id: '2', full_name: 'Nguyễn Thị Bình' },
  { id: '3', full_name: 'Trần Đức Cường' }
]

describe('filterPickerPersons', () => {
  test('matches without accents', () => {
    expect(filterPickerPersons(people, 'nguyen').map((p) => p.id)).toEqual([
      '2',
      '1'
    ])
    expect(filterPickerPersons(people, 'duc')[0].id).toBe('3')
  })

  test('leaves out the disabled person', () => {
    expect(filterPickerPersons(people, 'nguyen', '1').map((p) => p.id)).toEqual(
      ['2']
    )
    expect(filterPickerPersons(people, '', '1').map((p) => p.id)).toEqual([
      '2',
      '3'
    ])
  })

  test('empty text lists the first people, capped by the limit', () => {
    expect(filterPickerPersons(people, '  ', undefined, 2)).toHaveLength(2)
  })

  test('no match gives an empty list', () => {
    expect(filterPickerPersons(people, 'zzz')).toEqual([])
  })
})

describe('pickerKeyNavigation', () => {
  test('arrows move and stop at the ends', () => {
    expect(pickerKeyNavigation('ArrowDown', 0, 3).active).toBe(1)
    expect(pickerKeyNavigation('ArrowDown', 2, 3).active).toBe(2)
    expect(pickerKeyNavigation('ArrowUp', 1, 3).active).toBe(0)
    expect(pickerKeyNavigation('ArrowUp', 0, 3).active).toBe(0)
  })

  test('Home and End jump', () => {
    expect(pickerKeyNavigation('End', 0, 3).active).toBe(2)
    expect(pickerKeyNavigation('Home', 2, 3).active).toBe(0)
  })

  test('Enter selects the highlighted option, Escape closes', () => {
    expect(pickerKeyNavigation('Enter', 1, 3)).toEqual({
      active: 1,
      action: 'select',
      handled: true
    })
    expect(pickerKeyNavigation('Escape', 1, 3).action).toBe('close')
  })

  test('empty list: nothing to select, Enter left alone', () => {
    const r = pickerKeyNavigation('Enter', 0, 0)
    expect(r.action).toBeNull()
    expect(r.handled).toBe(false)
    expect(pickerKeyNavigation('ArrowDown', 0, 0).active).toBe(-1)
  })

  test('an out-of-range highlight is clamped', () => {
    expect(pickerKeyNavigation('Enter', 9, 3).active).toBe(2)
  })

  test('other keys are not handled', () => {
    expect(pickerKeyNavigation('a', 0, 3).handled).toBe(false)
  })
})
