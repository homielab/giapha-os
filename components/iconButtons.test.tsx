import { describe, expect, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import AdminUserRow from '@/components/admin/AdminUserRow'
import { TreeExpandToggle } from '@/components/FamilyTreeNodeRenderer'
import { ExpandToggle } from '@/components/MindmapNode'
import { MindmapExpandControls } from '@/components/MindmapToolbar'
import { TreeToolbarControls } from '@/components/TreeToolbar'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { AdminUserData } from '@/types'

const noop = () => {}

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

interface ButtonInfo {
  attrs: string
  label: string | null
  text: string
}

function buttons(html: string): ButtonInfo[] {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(
    ([, attrs, inner]) => ({
      attrs,
      label: /aria-label="([^"]*)"/.exec(attrs)?.[1] ?? null,
      text: inner.replace(/<[^>]*>/g, '').trim()
    })
  )
}

function expectNamedButtons(html: string, count: number) {
  const found = buttons(html)
  expect(found).toHaveLength(count)
  for (const button of found) {
    expect(button.attrs).toContain('type="button"')
    expect(Boolean(button.label) || button.text.length > 0).toBe(true)
  }
  // Icons are decorative: the label carries the name.
  for (const svg of html.match(/<svg[^>]*>/g) ?? []) {
    expect(svg).toContain('aria-hidden="true"')
  }
  return found
}

describe('tree toolbar controls', () => {
  test('every button has a name and does not submit forms', () => {
    const html = render(
      <TreeToolbarControls
        scale={1}
        handleZoomIn={noop}
        handleZoomOut={noop}
        handleResetZoom={noop}
        handleCenter={noop}
      />
    )
    const found = expectNamedButtons(html, 4)
    expect(found.map((b) => b.label ?? b.text)).toEqual([
      'Thu nhỏ',
      '100%',
      'Phóng to',
      'Căn giữa'
    ])
  })

  test('labels follow the locale', () => {
    const html = render(
      <TreeToolbarControls
        scale={0.5}
        handleZoomIn={noop}
        handleZoomOut={noop}
        handleResetZoom={noop}
        handleCenter={noop}
      />,
      'en'
    )
    expect(buttons(html).map((b) => b.label ?? b.text)).toEqual([
      'Zoom out',
      '50%',
      'Zoom in',
      'Center'
    ])
  })
})

describe('mind map toolbar controls', () => {
  test('expand and collapse keep their name when the text is hidden', () => {
    const html = render(<MindmapExpandControls setExpandSignal={noop} />)
    const found = expectNamedButtons(html, 2)
    expect(found.map((b) => b.label)).toEqual([
      'Thu gọn Tất cả',
      'Mở rộng Tất cả'
    ])
  })
})

describe('branch expand/collapse toggles', () => {
  const renderTree = (
    name: string,
    isCollapsed: boolean,
    locale: 'vi' | 'en'
  ) =>
    render(
      <TreeExpandToggle
        name={name}
        isCollapsed={isCollapsed}
        onToggle={noop}
      />,
      locale
    )
  const renderMindmap = (
    name: string,
    isExpanded: boolean,
    locale: 'vi' | 'en'
  ) =>
    render(
      <ExpandToggle
        name={name}
        visible
        isExpanded={isExpanded}
        onToggle={noop}
      />,
      locale
    )

  test.each([
    ['vi', 'Nhánh Nguyễn Văn An', 'Nhánh Trần Thị Bình'],
    ['en', "Nguyễn Văn An's branch", "Trần Thị Bình's branch"]
  ] as const)(
    '%s: labels name the person, state is in aria-expanded',
    (locale, a, b) => {
      for (const draw of [renderTree, renderMindmap]) {
        const first = expectNamedButtons(
          draw('Nguyễn Văn An', true, locale),
          1
        )[0]
        const second = expectNamedButtons(
          draw('Trần Thị Bình', false, locale),
          1
        )[0]
        expect(first.label?.replace('&#x27;', "'")).toBe(a)
        expect(second.label?.replace('&#x27;', "'")).toBe(b)
        expect(first.label).not.toBe(second.label)
      }
      // The label stays the same when the state flips; aria-expanded changes.
      const treeOpen = buttons(renderTree('Nguyễn Văn An', false, locale))[0]
      const treeShut = buttons(renderTree('Nguyễn Văn An', true, locale))[0]
      expect(treeOpen.label).toBe(treeShut.label)
      expect(treeOpen.attrs).toContain('aria-expanded="true"')
      expect(treeShut.attrs).toContain('aria-expanded="false"')
      const mapOpen = buttons(renderMindmap('Nguyễn Văn An', true, locale))[0]
      const mapShut = buttons(renderMindmap('Nguyễn Văn An', false, locale))[0]
      expect(mapOpen.label).toBe(mapShut.label)
      expect(mapOpen.attrs).toContain('aria-expanded="true"')
      expect(mapShut.attrs).toContain('aria-expanded="false"')
    }
  )

  test('both toggles are left out of PNG/PDF exports', () => {
    for (const html of [
      renderTree('Nguyễn Văn An', false, 'vi'),
      renderMindmap('Nguyễn Văn An', true, 'vi')
    ]) {
      expect(buttons(html)[0].attrs).toContain('data-export-ignore="true"')
    }
  })
})

describe('admin user row', () => {
  const user: AdminUserData = {
    id: 'u2',
    email: 'member@example.com',
    role: 'member',
    is_active: true,
    created_at: '2026-01-02T00:00:00Z'
  }

  test('the delete button is named and does not submit forms', () => {
    const html = render(
      <table>
        <tbody>
          <AdminUserRow
            user={user}
            currentUserId='u1'
            loadingId={null}
            onRoleChange={noop}
            onStatusChange={noop}
            onDelete={noop}
          />
        </tbody>
      </table>
    )
    const found = expectNamedButtons(html, 2)
    expect(found[1].label).toBe('Xoá người dùng')
  })
})
