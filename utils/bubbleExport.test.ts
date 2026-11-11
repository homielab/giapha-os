import { describe, expect, it } from 'bun:test'

import { bubbleExportFrame, prepareBubbleExport } from './bubbleExport'

describe('bubbleExportFrame', () => {
  it('moves the graph to the top left corner with padding around it', () => {
    expect(
      bubbleExportFrame({ x: -300, y: -120.4, width: 600, height: 240.5 }, 40)
    ).toEqual({ width: 680, height: 321, transform: 'translate(340, 160.4)' })
  })
})

describe('prepareBubbleExport', () => {
  function fakeContainer(transform: string | null) {
    const attrs = new Map<string, string>()
    if (transform !== null) attrs.set('transform', transform)
    const graph = {
      getBBox: () => ({ x: 0, y: 0, width: 100, height: 50 }),
      getAttribute: (name: string) => attrs.get(name) ?? null,
      setAttribute: (name: string, value: string) => attrs.set(name, value),
      removeAttribute: (name: string) => attrs.delete(name)
    }
    const svg = { style: { width: '', height: '' }, querySelector: () => graph }
    const container = {
      style: { width: '', height: '' },
      querySelector: () => svg
    }
    return { container: container as unknown as HTMLElement, svg, attrs }
  }

  it('shows the whole graph at full size, then restores the zoomed view', () => {
    const { container, svg, attrs } = fakeContainer('translate(10,20) scale(2)')
    const restore = prepareBubbleExport(container)
    expect(attrs.get('transform')).toBe('translate(40, 40)')
    expect(svg.style.width).toBe('180px')
    expect(container.style.height).toBe('130px')

    restore?.()
    expect(attrs.get('transform')).toBe('translate(10,20) scale(2)')
    expect(svg.style.width).toBe('')
    expect(container.style.height).toBe('')
  })

  it('does nothing before the map is drawn', () => {
    const container = { querySelector: () => null } as unknown as HTMLElement
    expect(prepareBubbleExport(container)).toBeNull()
  })
})
