'use client'

import { useEffect, useState } from 'react'

import { Person } from '@/types'
import { createClient } from '@/utils/supabase/client'
import { fetchAllRows } from '@/utils/supabase/fetchAll'

type PersonsClient = Pick<ReturnType<typeof createClient>, 'from'>

/** Loads every person (all pages) for the export root picker; only the picker's columns are selected. */
export function loadAllPersons(supabase: PersonsClient) {
  return fetchAllRows<Person>((from, to) =>
    supabase
      .from('persons')
      .select('id, full_name, birth_year, gender, avatar_url, generation')
      .returns<Person[]>()
      .order('birth_year', { ascending: true, nullsFirst: false })
      .order('id')
      .range(from, to)
  )
}

/**
 * Every person for export pickers. When any page fails, `persons` stays empty
 * and `error` is set, so a partial list is never offered as the whole family.
 */
export function useAllPersons() {
  const [state, setState] = useState<{
    persons: Person[]
    error: string | null
    loading: boolean
  }>({ persons: [], error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    loadAllPersons(createClient()).then(({ data, error }) => {
      if (cancelled) return
      setState(
        error
          ? { persons: [], error: error.message, loading: false }
          : { persons: data, error: null, loading: false }
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
