import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import ImportConfirmModal from '@/components/ImportConfirmModal'
import { interpolate } from '@/lib/i18n/interpolate'
import { messages } from '@/lib/i18n/messages'
import { I18nContext } from '@/lib/i18n/useI18n'
import type { ImportMode } from '@/utils/appendImport'
import {
  onDuplicateScanRequest,
  requestDuplicateScan
} from '@/utils/duplicateScanTrigger'

const noop = () => {}
const dict = messages.vi

function render(mode?: ImportMode) {
  return renderToStaticMarkup(
    <I18nContext.Provider
      value={{
        locale: 'vi',
        messages: dict,
        setLocale: noop,
        t: (key, values) => interpolate(dict[key], values)
      }}>
      <ImportConfirmModal
        fileName='nhanh.ged'
        summary={{ persons: 3, relationships: 2, events: 0, exportedAt: null }}
        mode={mode}
        onModeChange={noop}
        locale='vi'
        isImporting={false}
        isDownloading={false}
        downloadError={null}
        onDownloadBackup={noop}
        onCancel={noop}
        onConfirm={noop}
      />
    </I18nContext.Provider>
  )
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ')

describe('import confirmation modes', () => {
  test('replace stays the default, with the old warnings', () => {
    const html = text(render())
    expect(html).toContain(dict.restoreConfirmTitle)
    expect(html).toContain(dict.restoreIrreversible)
    expect(html).toContain(dict.restoreContinue)
    expect(html).toContain(dict.importModeReplace)
    expect(html).toContain(dict.importModeAppend)
    expect(html).not.toContain(dict.appendNotes)
  })

  test('append previews what is added and that photos are not', () => {
    const html = text(render('append'))
    expect(html).toContain(dict.appendConfirmTitle)
    expect(html).toContain(
      interpolate(dict.appendFileContains, {
        persons: 3,
        relationships: 2,
        events: 0
      })
    )
    expect(html).toContain(dict.appendNotes.replaceAll('"', '&quot;'))
    expect(html).toContain(dict.appendConfirm)
    expect(html).not.toContain(dict.restoreIrreversible)
  })
})

describe('duplicate scan request', () => {
  test('reaches the listener until it unsubscribes', () => {
    const target = new EventTarget()
    let runs = 0
    const stop = onDuplicateScanRequest(() => runs++, target)
    requestDuplicateScan(target)
    stop()
    requestDuplicateScan(target)
    expect(runs).toBe(1)
  })
})
