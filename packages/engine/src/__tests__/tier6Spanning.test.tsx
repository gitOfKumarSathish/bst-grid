// Regression test for the Tier-6 spanning fix (#24, AUDIT_FIXES.md):
// an explicit getCellSpan whose footprint would swallow a pass-1 group merge must
// NOT double-book — a cell may never end up in BOTH `origin` and `covered`, which
// rendered the row one <td> short and shifted values under the wrong headers.
import { describe, test, expect } from 'vitest'
import { computeCellSpans } from '../spanning'
import type { SpanRow, SpanCol } from '../spanning'
import { cellKey } from '../index'

const mkRows = (recs: Array<Record<string, unknown>>): SpanRow[] =>
  recs.map((r, i) => ({
    id: String(r.id ?? i),
    original: r,
    getValue: (columnId: string) => r[columnId],
  }))

const cols: SpanCol[] = [
  { id: 'A', meta: {} },
  { id: 'B', meta: { rowSpan: 'group' } }, // vertical group-merge column
  { id: 'C', meta: {} },
]

describe('#24 explicit spans never double-book a group merge', () => {
  // B rows 1 & 2 share a value → pass 1 merges them (B1 origin rowSpan 2, B2 covered).
  const rows = mkRows([
    { id: 'r0', A: 'a0', B: 'x', C: 'c0' },
    { id: 'r1', A: 'a1', B: 'g', C: 'c1' },
    { id: 'r2', A: 'a2', B: 'g', C: 'c2' },
  ])

  test('a colliding explicit span is refused; origin and covered stay disjoint', () => {
    // Explicit span at A0 that tries to cover a 2×3 block — its footprint would
    // swallow B1, the group origin.
    const plan = computeCellSpans(rows, cols, (ctx) =>
      ctx.columnId === 'A' && ctx.rowIndex === 0 ? { colSpan: 2, rowSpan: 3 } : undefined,
    )

    // The invariant the bug violated: no cell is an origin AND covered.
    for (const k of plan.origin.keys()) {
      expect(plan.covered.has(k)).toBe(false)
    }
    // The group merge is preserved (explicit span was refused, not applied).
    expect(plan.origin.has(cellKey('r1', 'B'))).toBe(true)
    expect(plan.origin.get(cellKey('r1', 'B'))).toEqual({ colSpan: 1, rowSpan: 2 })
    expect(plan.origin.has(cellKey('r0', 'A'))).toBe(false)
  })

  test('a non-colliding explicit span still applies normally', () => {
    // A0 spanning 2 columns on row 0 only — clear of the B1/B2 group.
    const plan = computeCellSpans(rows, cols, (ctx) =>
      ctx.columnId === 'A' && ctx.rowIndex === 0 ? { colSpan: 2, rowSpan: 1 } : undefined,
    )
    expect(plan.origin.get(cellKey('r0', 'A'))).toEqual({ colSpan: 2, rowSpan: 1 })
    expect(plan.covered.has(cellKey('r0', 'B'))).toBe(true)
    // Group merge still intact and disjoint.
    expect(plan.origin.has(cellKey('r1', 'B'))).toBe(true)
    for (const k of plan.origin.keys()) expect(plan.covered.has(k)).toBe(false)
  })
})
