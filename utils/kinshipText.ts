import type { Translate } from '@/utils/dateHelpers'
import type {
  KinshipDescription,
  KinshipPathStep
} from '@/utils/kinshipHelpers'

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
      text = t(
        description.side === 'paternal'
          ? 'kinshipDescUpperPaternal'
          : 'kinshipDescUpperMaternal'
      )
      break
    case 'cousins':
      text = t(
        description.side === 'paternal'
          ? 'kinshipDescCousinsPaternal'
          : 'kinshipDescCousinsMaternal'
      )
      break
    case 'relatives':
      text = t(
        description.side === 'paternal'
          ? 'kinshipDescRelativesPaternal'
          : 'kinshipDescRelativesMaternal'
      )
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
    case 'viaBothSpouses':
      text = t('kinshipDescViaBothSpouses', {
        nameA: description.nameA,
        nameB: description.nameB
      })
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
    case 'spouseOf':
      return t(
        step.spouseRole === 'husband'
          ? 'kinshipPathHusbandOf'
          : 'kinshipPathWifeOf',
        { name: step.name, spouse: step.spouse }
      )
  }
}
