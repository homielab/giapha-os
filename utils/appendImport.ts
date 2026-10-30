import type { ImportPayload } from '@/utils/backupPayload'

/**
 * How an import file is applied: `replace` deletes the current tree first
 * (restore a backup), `append` adds the file's people next to it.
 */
export type ImportMode = 'replace' | 'append'

export function isImportMode(value: unknown): value is ImportMode {
  return value === 'replace' || value === 'append'
}

/**
 * Gives every member and custom event of an import file a new id, so the
 * file can be added to a tree that may already hold the same ids (a branch
 * exported from this tree, or the same file added twice). Relationships and
 * private details follow their members; relationship ids are dropped (the
 * database makes them). Photos are not imported: `avatar_url` points into the
 * storage of the tree the file came from, so it is cleared.
 *
 * `taken` = ids that must not be reused (e.g. the current members); `newId`
 * makes a candidate id.
 */
export function remapImportIds(
  payload: ImportPayload,
  options: {
    taken?: Iterable<string>
    newId?: () => string
  } = {}
): ImportPayload {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const used = new Set(options.taken ?? [])
  const freshId = () => {
    for (;;) {
      const id = newId()
      if (!used.has(id)) {
        used.add(id)
        return id
      }
    }
  }

  const personIds = new Map<string, string>()
  for (const person of payload.persons) personIds.set(person.id, freshId())
  const personId = (id: string) => personIds.get(id) ?? id

  return {
    version: payload.version,
    persons: payload.persons.map((person) => ({
      ...person,
      id: personId(person.id),
      avatar_url: null
    })),
    relationships: payload.relationships.map((relationship) => {
      const copy = {
        ...relationship,
        person_a: personId(relationship.person_a),
        person_b: personId(relationship.person_b)
      }
      delete copy.id
      return copy
    }),
    ...(payload.person_details_private
      ? {
          person_details_private: payload.person_details_private.map(
            (detail) => ({ ...detail, person_id: personId(detail.person_id) })
          )
        }
      : {}),
    ...(payload.custom_events
      ? {
          custom_events: payload.custom_events.map((event) => ({
            ...event,
            id: freshId()
          }))
        }
      : {})
  }
}
