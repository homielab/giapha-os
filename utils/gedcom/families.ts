import type { ParseRecord } from './records'
import { sourceNotes } from './sources'
import type { GedcomRelationship } from './types'

// Relationships of the FAM records: a marriage between HUSB and WIFE (with
// the family's cited sources as its note) and a parent link from each of them
// to every CHIL. `adoptedLinks` holds `${indiXref} ${famXref}` of FAMC links
// marked PEDI ADOPTED. Members missing from `idMap` are skipped.
export function readFamilies(
  records: ParseRecord[],
  idMap: Map<string, string>,
  adoptedLinks: Set<string>,
  sourTexts: Map<string, string>
): GedcomRelationship[] {
  const relationships: GedcomRelationship[] = []
  for (const record of records.filter((r) => r.type === 'FAM')) {
    let husb = null
    let wife = null
    const children: { uuid: string; xref: string }[] = []

    for (const line of record.lines) {
      const match = line.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/)
      if (match) {
        const tag = match[1]
        const refId = match[2]
        const uuid = idMap.get(refId)
        if (!uuid) continue

        if (tag === 'HUSB') husb = uuid
        else if (tag === 'WIFE') wife = uuid
        else if (tag === 'CHIL') children.push({ uuid, xref: refId })
      }
    }

    if (husb && wife && husb !== wife) {
      const note = sourceNotes(record.lines, sourTexts).join('\n\n')
      relationships.push({
        type: 'marriage',
        person_a: husb,
        person_b: wife,
        ...(note ? { note } : {})
      })
    }

    // Link each child to the parents this family actually has
    for (const { uuid: childId, xref } of children) {
      const type = adoptedLinks.has(`${xref} ${record.id}`)
        ? 'adopted_child'
        : 'biological_child'
      for (const parent of [husb, wife]) {
        if (parent && parent !== childId) {
          relationships.push({ type, person_a: parent, person_b: childId })
        }
      }
    }
  }
  return relationships
}
