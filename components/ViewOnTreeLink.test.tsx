import { describe, expect, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ModalHeaderActions } from '@/components/modal/MemberDetailModal'
import ViewOnTreeLink from '@/components/ViewOnTreeLink'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { Person } from '@/types'

const noop = () => {}
const id = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
const treeHref = `/dashboard/members?view=tree&amp;rootId=${id}`

function render(node: ReactNode, locale: 'vi' | 'en' = 'vi') {
  const dict = messages[locale]
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale,
        messages: dict,
        setLocale: noop,
        t: (key, values) => interpolate(dict[key], values)
      }}>
      {node}
    </I18nContext.Provider>
  )
}

function header(canEdit: boolean, isEditing = false) {
  return render(
    <ModalHeaderActions
      isEditing={isEditing}
      canEdit={canEdit}
      person={{ id, full_name: 'Nguyễn Văn A' } as Person}
      onBack={noop}
      onStartEdit={noop}
      onClose={noop}
    />
  )
}

describe('ViewOnTreeLink', () => {
  test('links to the tree rooted at the person, with a visible label', () => {
    const html = render(<ViewOnTreeLink personId={id} />, 'en')
    expect(html).toContain(`href="${treeHref}"`)
    expect(html).toContain('View on tree')
    expect(html).toContain('aria-hidden="true"')
  })

  test('compact form keeps the name when the text is hidden', () => {
    const html = render(<ViewOnTreeLink personId={id} compact />)
    expect(html).toContain('aria-label="Xem trên cây"')
    expect(html).toContain('title="Xem trên cây"')
  })
})

describe('member modal header', () => {
  test('viewers get the tree link but not view/edit', () => {
    const html = header(false)
    expect(html).toContain(`href="${treeHref}"`)
    expect(html).not.toContain(`href="/dashboard/members/${id}"`)
    expect(html).not.toContain('Chỉnh sửa thành viên')
  })

  test('editors get the tree link next to view and edit', () => {
    const html = header(true)
    expect(html).toContain(`href="${treeHref}"`)
    expect(html).toContain(`href="/dashboard/members/${id}"`)
    expect(html).toContain('Chỉnh sửa thành viên')
  })

  test('no tree link while editing', () => {
    expect(header(true, true)).not.toContain('view=tree')
  })
})
