import type { SearchableMember } from '@/utils/memberSearch'

export const MEMBER_SEARCH_TTL_MS = 60_000

let members: SearchableMember[] | null = null
let savedAt = 0

// Browser-session cache of the member list behind the ⌘K search.
export const memberSearchCache = {
  get(): SearchableMember[] | null {
    return members
  },
  set(list: SearchableMember[], now: number = Date.now()) {
    members = list
    savedAt = now
  },
  isFresh(now: number = Date.now(), ttlMs: number = MEMBER_SEARCH_TTL_MS) {
    return members !== null && now - savedAt <= ttlMs
  },
  clear() {
    members = null
    savedAt = 0
  }
}
