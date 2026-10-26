/** Members shown at first in the list view, and added by each "show more". */
export const MEMBER_BATCH_SIZE = 60

/** Visible count after "show more": one more batch, never above the total. */
export function nextVisibleCount(
  current: number,
  total: number,
  batchSize = MEMBER_BATCH_SIZE
): number {
  return Math.min(Math.max(current, 0) + batchSize, Math.max(total, 0))
}

/** Items of the current batch (the first `visible`), the rest and the step of the next click. */
export function takeBatch<T>(
  items: T[],
  visible: number,
  batchSize = MEMBER_BATCH_SIZE
): { shown: T[]; remaining: number; nextCount: number } {
  const count = Math.max(Math.min(visible, items.length), 0)
  return {
    shown: count >= items.length ? items : items.slice(0, count),
    remaining: items.length - count,
    nextCount: Math.min(batchSize, items.length - count)
  }
}
