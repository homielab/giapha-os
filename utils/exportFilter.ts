/**
 * Elements marked with `data-export-ignore` (the +/- branch buttons) stay on
 * screen but are left out of the PNG/PDF export.
 */
export const EXPORT_IGNORE_PROPS = { 'data-export-ignore': 'true' } as const

/** `filter` for html-to-image: false drops the node and its children. */
export function keepInExport(node: Node): boolean {
  const dataset = (node as Partial<HTMLElement>).dataset
  return dataset?.exportIgnore === undefined
}
