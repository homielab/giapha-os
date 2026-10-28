/**
 * Escape closes an open popup menu; any other key, or Escape while the menu
 * is closed, is left alone so it keeps its usual meaning (e.g. closing a
 * modal underneath).
 */
export function shouldClosePopupOnKey(key: string, isOpen: boolean) {
  return isOpen && key === 'Escape'
}

/** A press outside the menu's container (button + panel) closes the menu. */
export function isOutsidePopup(
  container: Pick<Node, 'contains'> | null,
  target: Node | null
) {
  return container !== null && !container.contains(target)
}
