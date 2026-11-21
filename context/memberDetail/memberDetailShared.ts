import { Variants } from 'framer-motion'

export interface RelationshipStats {
  biologicalChildren: number
  maleBiologicalChildren: number
  femaleBiologicalChildren: number
  paternalGrandchildren: number
  maternalGrandchildren: number
  sonInLaw: number
  daughterInLaw: number
}

// The whole detail view fades in once (150 ms). No per-section stagger or
// spring: content that slides in piece by piece reads as lag in a dialog.
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } }
}

export const itemVariants: Variants = {}
