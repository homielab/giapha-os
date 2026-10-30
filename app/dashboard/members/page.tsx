import type { Metadata } from 'next'
import { Suspense } from 'react'

import MembersViews from '@/components/MembersViews'
import MemberDetailModal from '@/components/modal/MemberDetailModal'
import ViewToggle from '@/components/ViewToggle'
import { AvatarUrlProvider } from '@/context/AvatarUrlContext'
import { MemberListProvider } from '@/context/MemberListContext'
import { getServerTranslations } from '@/lib/i18n/server'
import { Person, Relationship } from '@/types'
import { NO_SIGNED_AVATAR_URLS } from '@/utils/avatar'
import { signAvatarUrls } from '@/utils/avatarSigning'
import {
  PERSON_LIST_COLUMNS,
  RELATIONSHIP_COLUMNS
} from '@/utils/personColumns'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getProfile, getSupabase } from '@/utils/supabase/queries'
import { pickDefaultRootId } from '@/utils/treeRoot'
import { parseViewMode } from '@/utils/viewMode'

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string; avatar?: string }>
}
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('familyTree') }
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { view, rootId, avatar } = await searchParams
  const initialView = view === undefined ? undefined : parseViewMode(view)
  const initialShowAvatar = avatar !== 'hide'

  const profile = await getProfile()
  const canEdit =
    profile?.is_active === true &&
    (profile.role === 'admin' || profile.role === 'editor')

  // If view is list, we only need persons, not relationships.
  // We fetch persons for all views to pass down as a prop if we want, or let components fetch.
  // Actually, to make transitions fast and avoid duplicate fetching across components,
  // we will fetch data here and pass it down as props.
  const supabase = await getSupabase()

  const [personsRes, relsRes] = await Promise.all([
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('persons')
        .select(PERSON_LIST_COLUMNS)
        .order('birth_year', { ascending: true, nullsFirst: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('relationships')
        .select(RELATIONSHIP_COLUMNS)
        .order('created_at')
        .order('id')
        .range(from, to)
    )
  ])

  // PERSON_LIST_COLUMNS leaves out note/created_at; no view reads them.
  const persons = (personsRes.data || []) as Person[]
  // RELATIONSHIP_COLUMNS leaves out note/updated_at; no view reads them.
  const relationships = (relsRes.data || []) as Relationship[]

  // One storage request signs every avatar of the tree/list/mindmap instead
  // of one /api/avatar round trip per member. Storage RLS only lets active
  // users sign, the same rule the /api/avatar route applies; the same URLs
  // come back on the next load, so the browser serves the photos from cache.
  const signedAvatarUrls = profile?.is_active
    ? await signAvatarUrls(supabase, persons)
    : NO_SIGNED_AVATAR_URLS

  // Prepare map and roots for tree views
  const personsMap = new Map()
  persons.forEach((p) => personsMap.set(p.id, p))

  let finalRootId = rootId

  // If no rootId is provided, open on the earliest ancestor
  if (!finalRootId || !personsMap.has(finalRootId)) {
    finalRootId = pickDefaultRootId(persons, relationships)
  }

  return (
    <Suspense fallback={null}>
      <AvatarUrlProvider signedUrls={signedAvatarUrls}>
        <MemberListProvider
          initialView={initialView}
          initialRootId={finalRootId}
          initialShowAvatar={initialShowAvatar}>
          <ViewToggle />
          <MembersViews
            persons={persons}
            relationships={relationships}
            canEdit={canEdit}
          />

          <MemberDetailModal />
        </MemberListProvider>
      </AvatarUrlProvider>
    </Suspense>
  )
}
