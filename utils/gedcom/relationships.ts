import type { GedcomRelationship } from './types'

// Drops repeated relationships (the database has a unique constraint on
// them), keeping the first. A marriage has no direction: A-B and B-A are the
// same couple; parent links keep their direction.
export function dedupeRelationships(
  relationships: GedcomRelationship[]
): GedcomRelationship[] {
  const unique: GedcomRelationship[] = []
  const seenKeys = new Set<string>()
  for (const rel of relationships) {
    const pair =
      rel.type === 'marriage'
        ? [rel.person_a, rel.person_b].sort()
        : [rel.person_a, rel.person_b]
    const key = `${rel.type}_${pair[0]}_${pair[1]}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      unique.push(rel)
    }
  }
  return unique
}
