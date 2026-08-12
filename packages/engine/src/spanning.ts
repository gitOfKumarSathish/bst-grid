import { cellKey } from './interaction/store.js'
import type { BstColumnMeta } from './registry/types.js'

/**
 * Cell spanning (A5) — a **render-layer** feature (Plan.md §2.7a). v9 9.1.2 ships
 * no spanning feature, and there is no virtualizer yet, so spanning is a pure
 * paint concern: compute which body cell is the top-left **origin** of a merged
 * block and which cells it **covers**; the renderer draws origins with
 * `colSpan`/`rowSpan` and skips covered cells entirely.
 *
 * Two ways to declare a span (both need `enableCellSpanning`):
 *  - `meta.rowSpan: 'group'` on a column → auto-merge vertically-consecutive
 *    cells with an equal value (the classic "merge same values" case);
 *  - a grid-level `getCellSpan(ctx)` returning `{ colSpan?, rowSpan? }` for the
 *    origin cell — full control over both axes.
 */

/** A per-cell span returned from `getCellSpan` — 1 (or omitted) means no span. */
export interface BstCellSpan {
  colSpan?: number
  rowSpan?: number
}

/** Context handed to `getCellSpan` for one visible body cell. */
export interface BstSpanContext<TData = any> {
  row: TData
  rowId: string
  columnId: string
  value: unknown
  /** Visual (post sort/filter/paginate) row index. */
  rowIndex: number
  /** Visible-leaf column index. */
  colIndex: number
}

/** The resolved span plan for the current page. */
export interface SpanPlan {
  /** Origin cell key → its span (colSpan/rowSpan ≥ 1). */
  origin: Map<string, { colSpan: number; rowSpan: number }>
  /** Keys of cells hidden under an origin's block — never rendered. */
  covered: Set<string>
}

/** Minimal row shape the planner needs (adapts a TanStack row). */
export interface SpanRow {
  id: string
  original: unknown
  getValue: (columnId: string) => unknown
}

/** Minimal column shape the planner needs. */
export interface SpanCol {
  id: string
  meta: BstColumnMeta
}

const clampSpan = (n: number | undefined, max: number): number =>
  Math.max(1, Math.min(Math.floor(n ?? 1), max))

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  return String(a) === String(b)
}

/**
 * Build the span plan for the visible rows × columns. O(rows × cols) — fine for
 * the workflow/reporting tiers (a page of rows), which is the only tier without
 * server-side windowing. `getCellSpan` (explicit) wins over `meta.rowSpan` groups
 * for a given origin.
 */
export function computeCellSpans(
  rows: SpanRow[],
  cols: SpanCol[],
  getCellSpan?: (ctx: BstSpanContext) => BstCellSpan | undefined,
): SpanPlan {
  const origin = new Map<string, { colSpan: number; rowSpan: number }>()
  const covered = new Set<string>()
  const nRows = rows.length
  const nCols = cols.length

  // Pass 1 — meta.rowSpan === 'group': merge consecutive equal values vertically.
  for (let ci = 0; ci < nCols; ci++) {
    if (cols[ci].meta?.rowSpan !== 'group') continue
    const colId = cols[ci].id
    let r = 0
    while (r < nRows) {
      const k = cellKey(rows[r].id, colId)
      if (covered.has(k)) {
        r++
        continue
      }
      const v = rows[r].getValue(colId)
      let run = 1
      while (r + run < nRows && sameValue(rows[r + run].getValue(colId), v)) run++
      if (run > 1) {
        origin.set(k, { colSpan: 1, rowSpan: run })
        for (let d = 1; d < run; d++) covered.add(cellKey(rows[r + d].id, colId))
      }
      r += run
    }
  }

  // Pass 2 — explicit getCellSpan (col and/or row). Covered cells are never asked.
  if (getCellSpan) {
    for (let ri = 0; ri < nRows; ri++) {
      for (let ci = 0; ci < nCols; ci++) {
        const k = cellKey(rows[ri].id, cols[ci].id)
        if (covered.has(k)) continue
        const span = getCellSpan({
          row: rows[ri].original,
          rowId: rows[ri].id,
          columnId: cols[ci].id,
          value: rows[ri].getValue(cols[ci].id),
          rowIndex: ri,
          colIndex: ci,
        })
        if (!span) continue
        const colSpan = clampSpan(span.colSpan, nCols - ci)
        const rowSpan = clampSpan(span.rowSpan, nRows - ri)
        if (colSpan === 1 && rowSpan === 1) continue
        origin.set(k, { colSpan, rowSpan })
        for (let dr = 0; dr < rowSpan; dr++) {
          for (let dc = 0; dc < colSpan; dc++) {
            if (dr === 0 && dc === 0) continue
            covered.add(cellKey(rows[ri + dr].id, cols[ci + dc].id))
          }
        }
      }
    }
  }

  return { origin, covered }
}
