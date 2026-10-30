// Lets another card on the data page (the import result) start the
// duplicate scan, without lifting the scan's state into the page.
const DUPLICATE_SCAN_EVENT = 'giapha:scan-duplicates'

export function requestDuplicateScan(target: EventTarget = window) {
  target.dispatchEvent(new Event(DUPLICATE_SCAN_EVENT))
}

/** Calls `listener` on each request; returns the unsubscribe function. */
export function onDuplicateScanRequest(
  listener: () => void,
  target: EventTarget = window
) {
  target.addEventListener(DUPLICATE_SCAN_EVENT, listener)
  return () => target.removeEventListener(DUPLICATE_SCAN_EVENT, listener)
}
