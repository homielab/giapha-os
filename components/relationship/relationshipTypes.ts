import { RelationshipType } from '@/types'

export interface EnrichedRelationship {
  id: string
  type: RelationshipType
  direction: 'parent' | 'child' | 'spouse' | 'child_in_law'
  targetPerson: import('@/types').Person
  note: string | null
  /** When the link was added; orders spouses like the tree. */
  createdAt?: string | null
}

export interface RelationshipStats {
  biologicalChildren: number
  maleBiologicalChildren: number
  femaleBiologicalChildren: number
  paternalGrandchildren: number
  maternalGrandchildren: number
  sonInLaw: number
  daughterInLaw: number
}

export interface BulkChildRow {
  id: string
  name: string
  gender: 'male' | 'female' | 'other'
  birthYear: string
  birthOrder: string
  isProcessing: boolean
}

export function emptyBulkChildRow(birthOrder = '1'): BulkChildRow {
  return {
    id: `row-${Math.random().toString(36).slice(2, 10)}`,
    name: '',
    gender: 'male',
    birthYear: '',
    birthOrder,
    isProcessing: false
  }
}
