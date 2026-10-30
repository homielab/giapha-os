import type { TranslationKey } from '@/lib/i18n/messages'
import type { Translate } from '@/utils/dateHelpers'
import type {
  KinshipDescription,
  KinshipPathStep,
  KinshipSide
} from '@/utils/kinshipHelpers'

/** Message keys per side; 'unknown' says a parent's gender is 'other'. */
const UPPER_KEYS: Record<KinshipSide, TranslationKey> = {
  paternal: 'kinshipDescUpperPaternal',
  maternal: 'kinshipDescUpperMaternal',
  unknown: 'kinshipDescUpperUnknownSide'
}
const COUSIN_KEYS: Record<KinshipSide, TranslationKey> = {
  paternal: 'kinshipDescCousinsPaternal',
  maternal: 'kinshipDescCousinsMaternal',
  unknown: 'kinshipDescCousinsUnknownSide'
}
const RELATIVE_KEYS: Record<KinshipSide, TranslationKey> = {
  paternal: 'kinshipDescRelativesPaternal',
  maternal: 'kinshipDescRelativesMaternal',
  unknown: 'kinshipDescRelativesUnknownSide'
}
const CO_SPOUSE_KEYS = {
  wives: 'kinshipDescCoWives',
  husbands: 'kinshipDescCoHusbands',
  spouses: 'kinshipDescCoSpouses'
} as const
const SPOUSE_OF_ANCESTOR_KEYS = {
  wife: 'kinshipDescWifeOfAncestor',
  husband: 'kinshipDescHusbandOfAncestor',
  spouse: 'kinshipDescSpouseOfAncestor'
} as const
const SPOUSE_OF_KEYS = {
  husband: 'kinshipPathHusbandOf',
  wife: 'kinshipPathWifeOf',
  spouse: 'kinshipPathSpouseOf'
} as const

/** The sentence for the relation kind, in the user's language. */
export function describeKinship(
  description: KinshipDescription,
  t: Translate
): string {
  let text: string
  switch (description.kind) {
    case 'direct':
      text = t('kinshipDescDirect')
      break
    case 'siblings':
      text = t('kinshipDescSiblings')
      break
    case 'upperBranch':
      text = t(UPPER_KEYS[description.side])
      break
    case 'cousins':
      text = t(COUSIN_KEYS[description.side])
      break
    case 'relatives':
      text = t(RELATIVE_KEYS[description.side])
      break
    case 'relativesGeneric':
      text = t('kinshipDescRelativesGeneric')
      break
    case 'marriage':
      text = t('kinshipDescMarriage')
      break
    case 'viaSpouse':
      text = t('kinshipDescViaSpouse', { name: description.name })
      break
    case 'stepParent':
      text = t('kinshipDescStepParent', { name: description.name })
      break
    case 'stepChild':
      text = t('kinshipDescStepChild', { name: description.name })
      break
    case 'spouseOfAncestor':
      text = t(SPOUSE_OF_ANCESTOR_KEYS[description.role], {
        spouse: description.spouse,
        ancestor: description.ancestor,
        child: description.child.name
      })
      break
    case 'viaBothSpouses':
      text = t('kinshipDescViaBothSpouses', {
        nameA: description.nameA,
        nameB: description.nameB
      })
      break
    case 'coParentsInLaw':
      text = t('kinshipDescCoParentsInLaw', {
        childA: description.childA,
        childB: description.childB
      })
      break
    case 'stepSiblings':
      text = t('kinshipDescStepSiblings', {
        parent: description.parent,
        stepParent: description.stepParent
      })
      break
    case 'coSpouses':
      text = t(CO_SPOUSE_KEYS[description.role], { name: description.name })
      break
    case 'none':
      text = t('kinshipDescNone')
      break
  }
  if (description.commonAncestor !== undefined) {
    text += ` ${t('kinshipCommonAncestor', {
      name: description.commonAncestor ?? t('kinshipCommonAncestorFallback')
    })}`
  }
  return text
}

/** One line of the relation path, in the user's language. */
export function describePathStep(step: KinshipPathStep, t: Translate): string {
  switch (step.kind) {
    case 'generations':
      return t('kinshipPathGenerations', {
        name: step.name,
        ancestor: step.ancestor ?? t('kinshipCommonAncestorFallback'),
        depth: step.depth
      })
    case 'spouses':
      return t('kinshipPathSpouses', { nameA: step.nameA, nameB: step.nameB })
    case 'childOf':
      return t('kinshipPathChildOf', { name: step.name, parent: step.parent })
    case 'spouseOf':
      return t(SPOUSE_OF_KEYS[step.spouseRole], {
        name: step.name,
        spouse: step.spouse
      })
  }
}
