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

const { InvalidAvatarError, LaterStepError, saveMember, submitMemberForm } =
  await import('./memberForm')
const { PersonChangedError, PersonNotUpdatedError } =
  await import('./writeErrors')

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
  note: '',
  burialPlace: ''
}

const emptyDeath = {
  day: '' as const,
  month: '' as const,
  year: '' as const,
  lunarDay: '' as const,
  lunarMonth: '' as const,
  lunarYear: '' as const
}

// Updates and deletes answer with the row they changed, like PostgREST does
// when `.select('id')` is chained; no rows would mean RLS refused them.
const ok = (call?: FakeCall): FakeResult =>
  call && (call.op === 'update' || call.op === 'delete')
    ? { data: [{ id: 'person-1' }] }
    : { data: [] }

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
  const emptyPrivate = { phoneNumber: '', occupation: '', currentResidence: '' }
  const privateCalls = (calls: FakeCall[]) =>
    calls.filter((c) => c.table === 'person_details_private')

  test('emptied private fields delete the stored row when it was read', async () => {
    const { options, calls } = saveOptions()
    await saveMember({ ...options, isAdmin: true, privateFields: emptyPrivate })
    expect(privateCalls(calls).map((c) => c.op)).toEqual(['delete'])
  })

  test('private fields that could not be read are left alone', async () => {
    const { options, calls } = saveOptions()
    await saveMember({
      ...options,
      isAdmin: true,
      privateLoaded: false,
      privateFields: emptyPrivate
    })
    expect(privateCalls(calls)).toEqual([])
  })

  test('shifts descendant generations by the change', async () => {
    const { options } = saveOptions()
    const result = await saveMember(options)

    expect(result).toEqual({
      personId: 'person-1',
      generationUpdateError: null,
      warnings: []
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
      generationUpdateError: 'no access',
      warnings: []
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
      call.table === 'persons' ? { error: { message: 'refused' } } : ok(call)
    )
    await expect(saveMember(options)).rejects.toEqual({ message: 'refused' })
    expect(updateDescendantGenerationsAction).not.toHaveBeenCalled()
  })
})

describe('saveMember when RLS refuses the write', () => {
  const refuse = (call: FakeCall): FakeResult =>
    call.table === 'persons' && call.op === 'update' ? { data: [] } : ok(call)

  test('an update that changes no row throws PersonNotUpdatedError', async () => {
    const { options } = saveOptions(refuse)
    await expect(saveMember(options)).rejects.toBeInstanceOf(
      PersonNotUpdatedError
    )
    expect(updateDescendantGenerationsAction).not.toHaveBeenCalled()
  })

  test('the avatar url update is checked too', async () => {
    const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
    let updates = 0
    const { options } = saveOptions((call) => {
      if (call.table === 'persons' && call.op === 'update') {
        updates += 1
        return updates === 1 ? { data: [{ id: 'person-1' }] } : { data: [] }
      }
      return ok(call)
    })
    await expect(
      saveMember({
        ...options,
        avatarFile: new File([new Uint8Array(PNG)], 'photo.png', {
          type: 'image/png'
        })
      })
    ).rejects.toMatchObject({ original: expect.any(PersonNotUpdatedError) })
  })
})

describe('saveMember when someone else edited the person meanwhile', () => {
  const LOADED = '2026-10-26T10:00:00+00:00'
  const stamped = { ...initialData, updated_at: LOADED } as Person

  // The conditional update matches no row; `readBack` answers the re-read.
  const respond =
    (readBack: FakeResult) =>
    (call: FakeCall): FakeResult => {
      if (call.table !== 'persons') return ok(call)
      if (call.op === 'update') {
        const matches = call.filters.some(
          ([, column, value]) => column === 'updated_at' && value === LOADED
        )
        return { data: matches ? [{ id: 'person-1', updated_at: 'new' }] : [] }
      }
      return readBack
    }

  test('updates only the row with the loaded updated_at', async () => {
    const { options, calls } = saveOptions(
      respond({ data: { id: 'person-1', updated_at: LOADED } })
    )
    const result = await saveMember({ ...options, initialData: stamped })
    expect(result.personId).toBe('person-1')
    const update = calls.find((c) => c.op === 'update')
    expect(update?.filters).toContainEqual(['eq', 'updated_at', LOADED])
    expect(update?.filters).toContainEqual(['eq', 'id', 'person-1'])
  })

  test('0 rows and a person that cannot be read is PersonNotUpdatedError', async () => {
    const { options } = saveOptions(
      respond({ data: null }) // never matches below
    )
    await expect(
      saveMember({
        ...options,
        initialData: { ...stamped, updated_at: 'stale' } as Person
      })
    ).rejects.toBeInstanceOf(PersonNotUpdatedError)
  })

  test('0 rows and another updated_at is PersonChangedError, nothing else is written', async () => {
    const { options, calls } = saveOptions(
      respond({ data: { id: 'person-1', updated_at: 'someone-elses' } })
    )
    await expect(
      saveMember({
        ...options,
        initialData: { ...stamped, updated_at: 'stale' } as Person
      })
    ).rejects.toBeInstanceOf(PersonChangedError)
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(1)
    expect(updateDescendantGenerationsAction).not.toHaveBeenCalled()
  })

  test('0 rows on a row that still has the same updated_at is an RLS refusal', async () => {
    const { options } = saveOptions((call) =>
      call.table === 'persons' && call.op === 'update'
        ? { data: [] }
        : call.table === 'persons'
          ? { data: { id: 'person-1', updated_at: LOADED } }
          : ok(call)
    )
    await expect(
      saveMember({ ...options, initialData: stamped })
    ).rejects.toBeInstanceOf(PersonNotUpdatedError)
  })

  test('a failed re-read is thrown as is', async () => {
    const { options } = saveOptions((call) =>
      call.table === 'persons' && call.op === 'update'
        ? { data: [] }
        : call.table === 'persons'
          ? { error: { message: 'network' } }
          : ok(call)
    )
    await expect(
      saveMember({ ...options, initialData: stamped })
    ).rejects.toEqual({ message: 'network' })
  })
})

describe('saveMember for a new member when a later step fails', () => {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
  const png = () =>
    new File([new Uint8Array(PNG)], 'photo.png', { type: 'image/png' })
  const created = { id: 'new-1', full_name: 'Nguyễn Văn An' }

  function newMember(respond: (call: FakeCall) => FakeResult) {
    const { options, calls } = saveOptions((call) =>
      call.op === 'insert' ? { data: created } : respond(call)
    )
    return {
      calls,
      options: {
        ...options,
        isEditing: false,
        initialData: undefined,
        hasGenerationChanged: false
      }
    }
  }

  test('a failed avatar upload returns the person and a warning', async () => {
    const { options } = newMember((call) =>
      call.op === 'upload' ? { error: { message: 'too large' } } : ok(call)
    )
    const result = await saveMember({ ...options, avatarFile: png() })
    expect(result.personId).toBe('new-1')
    expect(result.createdPerson).toEqual(created as unknown as Person)
    expect(result.warnings).toEqual(['too large'])
  })

  test('a failed private upsert returns the person and a warning', async () => {
    const { options } = newMember((call) =>
      call.op === 'upsert' ? { error: { message: 'rls' } } : ok(call)
    )
    const result = await saveMember({
      ...options,
      isAdmin: true,
      privateFields: {
        phoneNumber: '0123',
        occupation: '',
        currentResidence: ''
      }
    })
    expect(result.personId).toBe('new-1')
    expect(result.warnings).toEqual(['rls'])
  })

  test('a failed insert still throws', async () => {
    const { options } = newMember(ok)
    const failing = saveOptions((call) =>
      call.op === 'insert' ? { error: { message: 'insert failed' } } : ok(call)
    )
    await expect(
      saveMember({
        ...options,
        supabase: failing.options.supabase,
        avatarFile: png()
      })
    ).rejects.toEqual({ message: 'insert failed' })
  })

  test('editing an existing member still throws on a failed upload', async () => {
    const { options } = saveOptions((call) =>
      call.op === 'upload' ? { error: { message: 'too large' } } : ok(call)
    )
    await expect(
      saveMember({ ...options, avatarFile: png() })
    ).rejects.toMatchObject({ message: 'too large' })
  })

  test('a clean create has no warnings', async () => {
    const { options } = newMember(ok)
    const result = await saveMember(options)
    expect(result.warnings).toEqual([])
    expect(result.createdPerson).toBeDefined()
  })

  test('submitMemberForm switches to edit mode and warns instead of failing', async () => {
    const { options } = newMember((call) =>
      call.op === 'upload' ? { error: { message: 'too large' } } : ok(call)
    )
    const out = {
      warning: null as { message: string; personId: string } | null,
      error: null as string | null
    }
    const createdCalls: Person[] = []
    await submitMemberForm({
      ...options,
      avatarFile: png(),
      t: (key: TranslationKey, values?: TranslationValues) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
      router: { push: () => {}, refresh: () => {} },
      death: {
        currentValues: emptyDeath,
        deathYear: '',
        deathMonth: '',
        deathDay: '',
        deathLunarYear: '',
        deathLunarMonth: '',
        deathLunarDay: ''
      },
      birthYear: fields.birthYear,
      birthMonth: '',
      birthDay: '',
      isDeceased: false,
      isInLaw: false,
      birthOrder: '',
      generation: 4,
      otherNames: '',
      note: '',
      confirmed: true,
      setLoading: () => {},
      setError: (v) => {
        out.error = v
      },
      setWarning: (v) => {
        out.warning = v
      },
      setConfirmation: () => {},
      onCreated: (p) => createdCalls.push(p)
    })
    expect(out.error).toBeNull()
    expect(out.warning).toEqual({
      message: 'memberSavedPartially {"error":"too large"}',
      personId: 'new-1'
    })
    expect(createdCalls).toHaveLength(1)
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

  test('a refused update shows the not-saved message and keeps the form', async () => {
    const { client } = fakeSupabase((call) =>
      call.op === 'update' ? { data: [] } : ok(call)
    )
    const { ctx, state } = submitContext()
    await submitMemberForm({ ...ctx, supabase: client })
    expect(state.error).toBe('personNotUpdated')
    expect(state.pushed).toEqual([])
    expect(state.loading).toBe(false)
  })

  test('submitMemberForm shows the changed message and asks for a reload', async () => {
    const { client } = fakeSupabase((call) =>
      call.table === 'persons' && call.op === 'update'
        ? { data: [] }
        : call.table === 'persons'
          ? { data: { id: 'person-1', updated_at: 'someone-elses' } }
          : ok(call)
    )
    const { ctx, state } = submitContext()
    const changed: boolean[] = []
    await submitMemberForm({
      ...ctx,
      supabase: client,
      initialData: {
        ...initialData,
        updated_at: '2026-10-26T10:00:00+00:00'
      } as Person,
      setChanged: (value) => changed.push(value)
    })
    expect(state.error).toBe('personChanged')
    expect(changed).toEqual([false, true])
    expect(state.pushed).toEqual([])
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
    return ok(call)
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
      call.table === 'relationships'
        ? { error: { message: 'offline' } }
        : ok(call)
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
    return ok(call)
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
      return ok(call)
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

describe('saveMember retry after a later step failed on an edit', () => {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
  const png = () =>
    new File([new Uint8Array(PNG)], 'photo.png', { type: 'image/png' })

  // A person row whose updated_at moves on every write, like the DB trigger;
  // the conditional update only matches the current value.
  function stampedPerson(uploadFails: () => boolean, rowUpdatedAt = 'v1') {
    let current = rowUpdatedAt
    let version = 1
    const { options } = saveOptions((call) => {
      if (call.op === 'upload')
        return uploadFails() ? { error: { message: 'network' } } : ok(call)
      if (call.table !== 'persons') return ok(call)
      if (call.op === 'update') {
        const expected = call.filters.find(([, c]) => c === 'updated_at')
        if (expected && expected[2] !== current) return { data: [] }
        current = `v${++version}`
        return { data: [{ id: 'person-1', updated_at: current }] }
      }
      return { data: { id: 'person-1', updated_at: current } }
    })
    return {
      options: {
        ...options,
        hasGenerationChanged: false,
        avatarFile: png()
      },
      bump: () => (current = 'someone-elses')
    }
  }

  test('retry with the updated_at of the first save succeeds', async () => {
    let failing = true
    const { options } = stampedPerson(() => failing)
    const first = { ...initialData, updated_at: 'v1' } as Person
    const err = await saveMember({ ...options, initialData: first }).catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(LaterStepError)
    expect(err.message).toBe('network')
    expect(err.savedUpdatedAt).toBe('v2')

    failing = false
    const retried = await saveMember({
      ...options,
      initialData: { ...first, updated_at: err.savedUpdatedAt } as Person
    })
    expect(retried.personId).toBe('person-1')
  })

  test('retry with the stale updated_at is still a conflict', async () => {
    const { options } = stampedPerson(() => false)
    const stale = { ...initialData, updated_at: 'v0' } as Person
    await expect(
      saveMember({ ...options, initialData: stale })
    ).rejects.toBeInstanceOf(PersonChangedError)
  })

  test('someone else saving between the two tries is a conflict', async () => {
    let failing = true
    const { options, bump } = stampedPerson(() => failing)
    const first = { ...initialData, updated_at: 'v1' } as Person
    const err = await saveMember({ ...options, initialData: first }).catch(
      (e) => e
    )
    bump()
    failing = false
    await expect(
      saveMember({
        ...options,
        initialData: { ...first, updated_at: err.savedUpdatedAt } as Person
      })
    ).rejects.toBeInstanceOf(PersonChangedError)
  })
})
