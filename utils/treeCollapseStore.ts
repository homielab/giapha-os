/**
 * Collapsed branches of the family tree, kept outside React state so each
 * node subscribes to its own branch: a toggle re-renders that node only, not
 * the whole (possibly huge) tree.
 *
 * `auto` is the automatic baseline (branches from the auto-collapse level
 * down). Manual toggles apply on top of it and reset when it changes.
 */

/** `opened`: expanded by the latest toggle, so its children animate in. */
export type BranchState = 'collapsed' | 'expanded' | 'opened'

export type CollapseStore = ReturnType<typeof createCollapseStore>

export function createCollapseStore() {
  let base: ReadonlySet<string> | null = null
  let nodes: ReadonlySet<string> = new Set()
  let opened: string | null = null
  const listeners = new Set<() => void>()

  const collapsed = (auto: ReadonlySet<string>) =>
    base === auto ? nodes : auto

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** The collapsed set; same identity until the next toggle or reset. */
    collapsed,
    branchState(id: string, auto: ReadonlySet<string>): BranchState {
      if (collapsed(auto).has(id)) return 'collapsed'
      return base === auto && opened === id ? 'opened' : 'expanded'
    },
    toggle(id: string, auto: ReadonlySet<string>) {
      const next = new Set(collapsed(auto))
      if (next.delete(id)) {
        opened = id
      } else {
        next.add(id)
        opened = null
      }
      base = auto
      nodes = next
      listeners.forEach((listener) => listener())
    }
  }
}
