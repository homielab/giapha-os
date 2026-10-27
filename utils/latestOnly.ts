/**
 * Keeps only the latest of several overlapping async loads.
 *
 * Call `begin()` when a load starts and keep the token; after each `await`,
 * apply the result only while `isCurrent(token)` is true. Starting a newer
 * load or calling `invalidate()` (e.g. when the view closes or switches to
 * another record) makes every earlier token stale, so a slow response for
 * the previous record can no longer overwrite the current one.
 */
export interface LatestGuard {
  begin(): number
  isCurrent(token: number): boolean
  invalidate(): void
}

export function createLatestGuard(): LatestGuard {
  let current = 0
  return {
    begin() {
      current += 1
      return current
    },
    isCurrent(token) {
      return token === current
    },
    invalidate() {
      current += 1
    }
  }
}
