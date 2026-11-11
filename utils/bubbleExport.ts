/** Space around the graph in the exported image, in CSS pixels. */
export const BUBBLE_EXPORT_PADDING = 40

export interface ExportBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Size and transform that show the whole bubble map at 100 % from its top
 * left corner, whatever the zoom and pan on screen.
 */
export function bubbleExportFrame(
  box: ExportBox,
  padding = BUBBLE_EXPORT_PADDING
) {
  return {
    width: Math.ceil(box.width + 2 * padding),
    height: Math.ceil(box.height + 2 * padding),
    transform: `translate(${padding - box.x}, ${padding - box.y})`
  }
}

/**
 * Lays the bubble map out at full size inside `container` for the PNG/PDF
 * export (the screen only shows the zoomed viewport). Returns the function
 * that puts the view back, or null when there is nothing drawn yet.
 */
export function prepareBubbleExport(
  container: HTMLElement
): (() => void) | null {
  const svg = container.querySelector('svg')
  const graph = svg?.querySelector<SVGGElement>(':scope > g')
  if (!svg || !graph) return null

  const frame = bubbleExportFrame(graph.getBBox())
  const saved = {
    transform: graph.getAttribute('transform'),
    containerWidth: container.style.width,
    containerHeight: container.style.height,
    svgWidth: svg.style.width,
    svgHeight: svg.style.height
  }

  graph.setAttribute('transform', frame.transform)
  container.style.width = svg.style.width = `${frame.width}px`
  container.style.height = svg.style.height = `${frame.height}px`

  return () => {
    if (saved.transform === null) graph.removeAttribute('transform')
    else graph.setAttribute('transform', saved.transform)
    container.style.width = saved.containerWidth
    container.style.height = saved.containerHeight
    svg.style.width = saved.svgWidth
    svg.style.height = saved.svgHeight
  }
}
