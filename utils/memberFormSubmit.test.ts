import { beforeEach, describe, expect, mock, test } from 'bun:test'

import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { Person } from '@/types'
import type { MemberFormFields } from '@/utils/memberFormHelpers'
import {
  FakeCall,
  FakeResult,
  fakeSupabase
} from '@/utils/testing/fakeSupabase'

let generationResult: () => Promise<{
  error?: string
  success?: boolean
}> = async () => ({ success: true })
const updateDescendantGenerationsAction = mock(
  (personId: string, delta: number) => {
    void personId
    void delta
    return generationResult()
  }
)

mock.module('@/app/actions/member', () => ({
  updateDescendantGenerationsAction
}))

const { InvalidAvatarError, saveMember, submitMemberForm } =
  await import('./memberFormSubmit')

const initialData = {
  id: 'person-1',
  full_name: 'Nguyễn Văn An',
  generation: 3,
  avatar_url: null
} as unknown as Person

const fields: MemberFormFields = {
  fullName: 'Nguyễn Văn An',
  gender: 'male',
  birthYear: 1950,
  birthMonth: '',
  birthDay: '',
  deathYear: '',
  deathMonth: '',
  deathDay: '',
  deathLunarYear: '',
  deathLunarMonth: '',
  deathLunarDay: '',
  isDeceased: false,
  isInLaw: false,
  birthOrder: '',
  generation: 4,
  otherNames: '',
  note: ''
}

const emptyDeath = {
  day: '' as const,
  month: '' as const,
  year: '' as const,
  lunarDay: '' as const,
  lunarMonth: '' as const,
  lunarYear: '' as const
}

const ok = (): FakeResult => ({ data: [] })

function saveOptions(respond: (call: FakeCall) => FakeResult = ok) {
  const { client, calls } = fakeSupabase(respond)
  return {
    calls,
    options: {
      supabase: client,
      isEditing: true,
      initialData,
      fields,
      deathValues: emptyDeath,
      avatarUrl: '',
      avatarFile: null,
      removeExistingAvatar: false,
      isAdmin: false,
      privateFields: { phoneNumber: '', occupation: '', currentResidence: '' },
      hasGenerationChanged: true,
      updateDescendantGenerations: true
    }
  }
}

beforeEach(() => {
  generationResult = async () => ({ success: true })
  updateDescendantGenerationsAction.mockClear()
})

describe('saveMember', () => {
  test('shifts descendant generations by the change', async () => {
    const { options } = saveOptions()
    const result = await saveMember(options)

    expect(result).toEqual({
      personId: 'person-1',
      generationUpdateError: null
    })
    expect(updateDescendantGenerationsAction).toHaveBeenCalledWith(
      'person-1',
      1
    )
  })

  test('a failed generation update is returned, not swallowed', async () => {
    generationResult = async () => ({ error: 'no access' })
    const { options } = saveOptions()
    const result = await saveMember(options)
    expect(result).toEqual({
      personId: 'person-1',
      generationUpdateError: 'no access'
    })
  })

  test('a thrown generation update is returned as well', async () => {
    generationResult = async () => {
      throw new Error('network down')
    }
    const { options } = saveOptions()
    const result = await saveMember(options)
    expect(result.generationUpdateError).toBe('network down')
  })

  test('a failed person update throws before touching descendants', async () => {
    const { options } = saveOptions((call) =>
      call.table === 'persons' ? { error: { message: 'refused' } } : ok()
    )
    await expect(saveMember(options)).rejects.toEqual({ message: 'refused' })
    expect(updateDescendantGenerationsAction).not.toHaveBeenCalled()
  })
})

describe('saveMember avatar', () => {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]

  test('stores the avatar under the extension of its real type', async () => {
    const { options, calls } = saveOptions()
    await saveMember({
      ...options,
      avatarFile: new File([new Uint8Array(PNG)], 'photo.jpg', {
        type: 'image/jpeg'
      })
    })

    const upload = calls.find((c) => c.op === 'upload')
    expect(upload?.table).toBe('storage:avatars')
    const [path, , uploadOptions] = upload?.payload as [
      string,
      File,
      { contentType: string }
    ]
    expect(path).toBe('person-1_nguyen-van-an.png')
    expect(uploadOptions.contentType).toBe('image/png')
  })

  test('a text file renamed to .jpg is rejected before anything is saved', async () => {
    const { options, calls } = saveOptions()
    await expect(
      saveMember({
        ...options,
        avatarFile: new File(['not a photo'], 'photo.jpg', {
          type: 'image/jpeg'
        })
      })
    ).rejects.toBeInstanceOf(InvalidAvatarError)
    expect(calls).toEqual([])
  })
})

describe('submitMemberForm', () => {
  function submitContext() {
    const { options } = saveOptions()
    const state = {
      error: null as string | null,
      warning: null as { message: string; personId: string } | null,
      confirmation: null as string | null,
      loading: false,
      pushed: [] as string[],
      succeeded: [] as string[]
    }
    const t = (key: TranslationKey, values?: TranslationValues) =>
      values ? `${key} ${JSON.stringify(values)}` : key
    const ctx = {
      ...options,
      t,
      router: {
        push: (url: string) => state.pushed.push(url),
        refresh: () => {}
      },
      death: {
        currentValues: emptyDeath,
        deathYear: '' as const,
        deathMonth: '' as const,
        deathDay: '' as const,
        deathLunarYear: '' as const,
        deathLunarMonth: '' as const,
        deathLunarDay: '' as const
      },
      birthYear: fields.birthYear,
      birthMonth: fields.birthMonth,
      birthDay: fields.birthDay,
      isDeceased: false,
      isInLaw: false,
      birthOrder: fields.birthOrder,
      generation: fields.generation,
      otherNames: '',
      note: '',
      setLoading: (value: boolean) => {
        state.loading = value
      },
      setError: (value: string | null) => {
        state.error = value
      },
      setWarning: (value: { message: string; personId: string } | null) => {
        state.warning = value
      },
      setConfirmation: (value: string | null) => {
        state.confirmation = value
      }
    }
    return { ctx, state }
  }

  test('navigates to the member after a clean save', async () => {
    const { ctx, state } = submitContext()
    await submitMemberForm(ctx)
    expect(state.error).toBeNull()
    expect(state.warning).toBeNull()
    expect(state.pushed).toEqual(['/dashboard/members/person-1'])
  })

  test('a file that is not an image shows the image type error', async () => {
    const { ctx, state } = submitContext()
    await submitMemberForm({
      ...ctx,
      avatarFile: new File(['text'], 'a.jpg', { type: 'image/jpeg' })
    })
    expect(state.error).toBe('invalidImageType')
    expect(state.pushed).toEqual([])
  })

  test('shows a warning and stays on the form when generations failed', async () => {
    generationResult = async () => ({ error: 'no access' })
    const { ctx, state } = submitContext()
    await submitMemberForm(ctx)

    expect(state.error).toBeNull()
    expect(state.warning).toEqual({
      message: 'memberSavedGenerationNotUpdated {"error":"no access"}',
      personId: 'person-1'
    })
    expect(state.pushed).toEqual([])
    expect(state.loading).toBe(false)
  })

  // Parent 'dad' (1950-05-10) and child 'kid' (2000) of person-1.
  const family = (call: FakeCall): FakeResult => {
    if (call.table === 'relationships' && call.op === 'select') {
      const asParent = call.filters.some(([, c]) => c === 'person_a')
      return {
        data: asParent ? [{ person_b: 'kid' }] : [{ person_a: 'dad' }]
      }
    }
    if (call.table === 'persons' && call.op === 'select') {
      return {
        data: [
          {
            id: 'dad',
            full_name: 'Nguyễn Văn Ba',
            birth_year: 1950,
            birth_month: 5,
            birth_day: 10
          },
          { id: 'kid', full_name: 'Nguyễn Văn Út', birth_year: 2000 }
        ]
      }
    }
    return ok()
  }

  function familyContext(birthYear: number, birthMonth: number | '' = '') {
    const { client, calls } = fakeSupabase(family)
    const { ctx, state } = submitContext()
    return {
      calls,
      state,
      ctx: {
        ...ctx,
        supabase: client,
        initialData: { ...initialData, birth_year: 1975 } as Person,
        birthYear,
        birthMonth
      }
    }
  }

  test('refuses a birth date before a parent without saving', async () => {
    const { ctx, state, calls } = familyContext(1950, 4)
    await submitMemberForm(ctx)
    expect(state.error).toBe('memberBornBeforeParent {"name":"Nguyễn Văn Ba"}')
    expect(calls.some((c) => c.op === 'update')).toBe(false)
    expect(state.pushed).toEqual([])
    expect(state.loading).toBe(false)
  })

  test('refuses a birth date after a child without saving', async () => {
    const { ctx, state, calls } = familyContext(2001)
    await submitMemberForm(ctx)
    expect(state.error).toBe('memberBornAfterChild {"name":"Nguyễn Văn Út"}')
    expect(calls.some((c) => c.op === 'update')).toBe(false)
  })

  test('saves a birth date between parents and children', async () => {
    const { ctx, state } = familyContext(1976)
    await submitMemberForm(ctx)
    expect(state.error).toBeNull()
    expect(state.pushed).toEqual(['/dashboard/members/person-1'])
  })

  test('skips the family check when the birth date is unchanged', async () => {
    const { ctx, state, calls } = familyContext(1975)
    await submitMemberForm(ctx)
    expect(state.error).toBeNull()
    expect(calls.some((c) => c.table === 'relationships')).toBe(false)
  })

  test('a failed family lookup is shown and nothing is saved', async () => {
    const { client, calls } = fakeSupabase((call) =>
      call.table === 'relationships' ? { error: { message: 'offline' } } : ok()
    )
    const { ctx, state } = submitContext()
    await submitMemberForm({ ...ctx, supabase: client })
    expect(state.error).toBe('offline')
    expect(calls.some((c) => c.op === 'update')).toBe(false)
  })
})

describe('submitMemberForm names, duplicates and parent deaths', () => {
  const t = (key: TranslationKey, values?: TranslationValues) =>
    values ? `${key} ${JSON.stringify(values)}` : key

  function context(
    respond: (call: FakeCall) => FakeResult,
    overrides: Record<string, unknown> = {}
  ) {
    const { client, calls } = fakeSupabase(respond)
    const state = {
      error: null as string | null,
      confirmation: null as string | null,
      pushed: [] as string[]
    }
    const ctx = {
      supabase: client,
      router: {
        push: (url: string) => state.pushed.push(url),
        refresh: () => {}
      },
      t,
      isEditing: false,
      initialData: undefined as Person | undefined,
      fields: {
        ...fields,
        fullName: ' Nguyen Van A ',
        generation: '' as const
      },
      death: {
        currentValues: emptyDeath,
        deathYear: '' as const,
        deathMonth: '' as const,
        deathDay: '' as const,
        deathLunarYear: '' as const,
        deathLunarMonth: '' as const,
        deathLunarDay: '' as const
      },
      birthYear: 1950 as number | '',
      birthMonth: '' as number | '',
      birthDay: '' as number | '',
      isDeceased: false,
      isInLaw: false,
      birthOrder: '' as const,
      generation: '' as const,
      otherNames: '',
      note: '',
      avatarUrl: '',
      avatarFile: null,
      removeExistingAvatar: false,
      isAdmin: false,
      privateFields: { phoneNumber: '', occupation: '', currentResidence: '' },
      hasGenerationChanged: false,
      updateDescendantGenerations: false,
      setLoading: () => {},
      setError: (value: string | null) => {
        state.error = value
      },
      setWarning: () => {},
      setConfirmation: (value: string | null) => {
        state.confirmation = value
      },
      ...overrides
    }
    return { ctx, state, calls }
  }

  const existing = {
    id: 'old',
    full_name: 'Nguyễn Văn A',
    birth_year: 1950
  }
  const withDuplicate = (call: FakeCall): FakeResult => {
    if (call.op === 'insert') return { data: { id: 'new-1' } }
    if (call.table === 'persons' && call.op === 'select')
      return { data: [existing] }
    return ok()
  }

  test('a name of spaces is refused before anything is queried', async () => {
    const { ctx, state, calls } = context(ok, {
      fields: { ...fields, fullName: '   ' }
    })
    await submitMemberForm(ctx)
    expect(state.error).toBe('fullNameRequired')
    expect(calls).toEqual([])
  })

  test('a possible duplicate asks first, then creates the trimmed name', async () => {
    const first = context(withDuplicate)
    await submitMemberForm(first.ctx)
    expect(first.state.confirmation).toContain('memberPossibleDuplicate')
    expect(first.state.confirmation).toContain('Nguyễn Văn A (1950)')
    expect(first.calls.some((c) => c.op === 'insert')).toBe(false)

    const again = context(withDuplicate, { confirmed: true })
    await submitMemberForm(again.ctx)
    const insert = again.calls.find((c) => c.op === 'insert')
    expect((insert?.payload as { full_name: string }).full_name).toBe(
      'Nguyen Van A'
    )
    expect(again.state.pushed).toEqual(['/dashboard/members/new-1'])
  })

  test('a new member without a duplicate is created straight away', async () => {
    const { ctx, state } = context((call) =>
      call.op === 'insert' ? { data: { id: 'new-1' } } : ok()
    )
    await submitMemberForm(ctx)
    expect(state.confirmation).toBeNull()
    expect(state.pushed).toEqual(['/dashboard/members/new-1'])
  })

  test('editing a member does not look for duplicates', async () => {
    const { ctx, calls } = context(withDuplicate, {
      isEditing: true,
      initialData: {
        ...initialData,
        birth_year: 1950,
        gender: 'male'
      } as Person
    })
    await submitMemberForm(ctx)
    expect(calls.some((c) => c.op === 'select')).toBe(false)
  })

  // Person 'person-1' is the child of a parent with the given death year.
  const parentDied =
    (gender: string, year: number, type = 'biological_child') =>
    (call: FakeCall): FakeResult => {
      if (call.table === 'relationships') {
        return call.filters.some(([, c]) => c === 'person_a')
          ? { data: [] }
          : { data: [{ person_a: 'par', type }] }
      }
      if (call.table === 'persons' && call.op === 'select')
        return {
          data: [
            {
              id: 'par',
              full_name: 'Phụ huynh',
              gender,
              birth_year: 1920,
              death_year: year
            }
          ]
        }
      return ok()
    }
  const editing = {
    isEditing: true,
    initialData: { ...initialData, birth_year: 1990, gender: 'male' } as Person,
    birthYear: 1980 as number | ''
  }

  test('a birth date after the mother died is refused', async () => {
    const { ctx, state, calls } = context(parentDied('female', 1975), editing)
    await submitMemberForm(ctx)
    expect(state.error).toBe(
      'memberMotherDiedBeforeBirth {"parent":"Phụ huynh","child":"Nguyen Van A"}'
    )
    expect(calls.some((c) => c.op === 'update')).toBe(false)
  })

  test('a father who died long before asks, then saves', async () => {
    const first = context(parentDied('male', 1975), editing)
    await submitMemberForm(first.ctx)
    expect(first.state.error).toBeNull()
    expect(first.state.confirmation).toContain(
      'memberFatherDiedLongBeforeBirth'
    )
    expect(first.calls.some((c) => c.op === 'update')).toBe(false)

    const again = context(parentDied('male', 1975), {
      ...editing,
      confirmed: true
    })
    await submitMemberForm(again.ctx)
    expect(again.calls.some((c) => c.op === 'update')).toBe(true)
  })

  test('an adopted parent is not checked', async () => {
    const { ctx, state } = context(
      parentDied('female', 1975, 'adopted_child'),
      editing
    )
    await submitMemberForm(ctx)
    expect(state.error).toBeNull()
    expect(state.confirmation).toBeNull()
  })
})
