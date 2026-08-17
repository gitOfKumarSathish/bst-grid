// Smart-header Phase 2 — responsive toolbar overflow. A pure partition function
// (priority-ranked "keep the most important that fit; overflow the rest") plus a
// hook that measures the toolbar with a ResizeObserver and returns which items
// should collapse into the "⋯ More" menu. jsdom has no layout, so the mechanism
// is verified by unit-testing `partitionToolbar` + manual browser testing.
import * as React from 'react'

export interface ToolbarItemWidth {
  id: string
  /** Higher = more important = kept inline longer (collapses last). */
  priority: number
  width: number
}

/**
 * Decide which collapsible items stay inline vs move to overflow, given the width
 * `available` to them and the width the "⋯" button costs once anything overflows.
 * Keeps the highest-priority contiguous run that fits. Pure.
 */
export function partitionToolbar(
  items: readonly ToolbarItemWidth[],
  available: number,
  moreWidth: number,
): { inline: string[]; overflow: string[] } {
  const total = items.reduce((s, it) => s + it.width, 0)
  if (total <= available) return { inline: items.map((i) => i.id), overflow: [] }
  // Something must overflow → the "⋯" button now costs space too.
  const budget = Math.max(0, available - moreWidth)
  const byImportance = [...items].sort((a, b) => b.priority - a.priority || a.width - b.width)
  const keep = new Set<string>()
  let used = 0
  let full = false
  for (const it of byImportance) {
    if (!full && used + it.width <= budget) {
      used += it.width
      keep.add(it.id)
    } else {
      full = true // once one doesn't fit, everything less important overflows too
    }
  }
  return {
    inline: items.filter((i) => keep.has(i.id)).map((i) => i.id),
    overflow: items.filter((i) => !keep.has(i.id)).map((i) => i.id),
  }
}

function sameSet(a: Set<string>, b: readonly string[]): boolean {
  if (a.size !== b.length) return false
  for (const id of b) if (!a.has(id)) return false
  return true
}

/**
 * Measure the toolbar and return the set of collapsible-item ids that don't fit
 * (should render inside "⋯ More" instead of inline). Attach `data-tb="<id>"` to
 * each collapsible item's inline wrapper and `data-tb-more` to the "⋯" button;
 * the hook reads their widths. Widths are cached the first time each item is
 * inline, so an overflowed (unmounted) item still has a width to promote back on.
 */
export function useToolbarOverflow(
  containerRef: React.RefObject<HTMLElement | null>,
  items: readonly { id: string; priority: number }[],
): Set<string> {
  const [overflow, setOverflow] = React.useState<Set<string>>(() => new Set())
  const widths = React.useRef<Map<string, number>>(new Map())
  const fixed = React.useRef<number | null>(null)
  const overflowRef = React.useRef(overflow)
  overflowRef.current = overflow
  // Re-run when the item set changes.
  const key = items.map((i) => `${i.id}:${i.priority}`).join(',')

  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    widths.current = new Map()
    fixed.current = null

    const measure = () => {
      // Cache the width of every currently-inline collapsible item.
      for (const it of items) {
        const node = el.querySelector<HTMLElement>(`[data-tb="${it.id}"]`)
        if (node) {
          const w = node.getBoundingClientRect().width
          if (w > 0) widths.current.set(it.id, w)
        }
      }
      if (items.some((it) => !widths.current.has(it.id))) return // not fully measured yet
      // Fixed content (everything that never collapses, incl. gaps) — captured once
      // when nothing is overflowed, so all collapsibles are inline.
      if (fixed.current == null && overflowRef.current.size === 0) {
        const sumColl = items.reduce((s, it) => s + (widths.current.get(it.id) || 0), 0)
        fixed.current = Math.max(0, el.scrollWidth - sumColl)
      }
      const moreNode = el.querySelector<HTMLElement>('[data-tb-more]')
      const moreW = moreNode ? moreNode.getBoundingClientRect().width : 36
      const available = el.clientWidth - (fixed.current ?? 0)
      const withW: ToolbarItemWidth[] = items.map((i) => ({
        id: i.id,
        priority: i.priority,
        width: widths.current.get(i.id)!,
      }))
      const { overflow: ov } = partitionToolbar(withW, available, moreW)
      if (!sameSet(overflowRef.current, ov)) setOverflow(new Set(ov))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, key])

  return overflow
}
