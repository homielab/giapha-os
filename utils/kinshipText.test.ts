import { describe, expect, test } from 'bun:test'

import { translate } from '@/lib/i18n/messages'
import type { Translate } from '@/utils/dateHelpers'

import { describeKinship, describePathStep } from './kinshipText'

const en: Translate = (key, values) => translate('en', key, values)
const vi: Translate = (key, values) => translate('vi', key, values)
const VIETNAMESE = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i

describe('kinship text', () => {
  test('english sentences hold no Vietnamese besides names', () => {
    const texts = [
      describeKinship({ kind: 'direct', commonAncestor: 'Ann' }, en),
      describeKinship({ kind: 'siblings', commonAncestor: null }, en),
      describeKinship({ kind: 'cousins', side: 'maternal' }, en),
      describeKinship({ kind: 'viaSpouse', name: 'Ann' }, en),
      describeKinship({ kind: 'marriage' }, en),
      describeKinship({ kind: 'none' }, en),
      describePathStep(
        { kind: 'generations', name: 'Bo', ancestor: null, depth: 2 },
        en
      ),
      describePathStep({ kind: 'spouses', nameA: 'Bo', nameB: 'Cy' }, en),
      describePathStep(
        { kind: 'spouseOf', name: 'Bo', spouse: 'Cy', spouseRole: 'wife' },
        en
      )
    ]
    for (const text of texts) expect(text).not.toMatch(VIETNAMESE)
  })

  test('vietnamese keeps the original wording', () => {
    expect(
      describeKinship(
        { kind: 'cousins', side: 'paternal', commonAncestor: 'An' },
        vi
      )
    ).toBe('Anh em họ Nội (Tổ tiên chung: An)')
    expect(
      describePathStep(
        { kind: 'generations', name: 'Bình', ancestor: 'An', depth: 2 },
        vi
      )
    ).toBe('Bình cách An 2 đời.')
  })

  test('english names the common ancestor', () => {
    expect(
      describeKinship({ kind: 'siblings', commonAncestor: 'Ann' }, en)
    ).toBe('Siblings (Common ancestor: Ann)')
  })
})
