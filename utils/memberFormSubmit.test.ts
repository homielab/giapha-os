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
})
