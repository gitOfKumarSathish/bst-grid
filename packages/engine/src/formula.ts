import type { RowData } from '@tanstack/react-table'
import type { BstTableColumn } from './types.js'
import type { BstColumnMeta, BstFormulaContext } from './registry/types.js'

/**
 * AG17 — Calculated / formula columns.
 *
 * Turns any column carrying `meta.formula` into a TanStack **computed column**
 * by injecting an `accessorFn` that runs the formula. Because the value is a
 * real accessor, sorting, filtering, grouping and `aggregationFn` all operate on
 * the computed result, and the cell renders through the column's `type` (so a
 * `number` formula still formats as currency, a `date` formula as a date, …).
 *
 * The formula reads the full dataset through `dataRef` (a ref, not a captured
 * array) so the normalized column defs stay **referentially stable** across data
 * changes — they never rebuild per keystroke, only when the column list itself
 * changes. Columns without a formula pass through untouched, and the original
 * array is returned when nothing changed (so `useMemo` consumers see a stable
 * reference). Grouped (`columns: [...]`) headers are walked recursively.
 *
 * A formula column needs an explicit `id` (it has no `accessorKey`); any
 * `accessorKey` also present is dropped, since TanStack forbids both at once.
 */
export function normalizeFormulaColumns<TData extends RowData>(
  columns: BstTableColumn<TData>[],
  dataRef: { current: TData[] },
): BstTableColumn<TData>[] {
  const walk = (cols: BstTableColumn<TData>[]): BstTableColumn<TData>[] => {
    let changed = false
    const out = cols.map((col) => {
      const anyCol = col as unknown as Record<string, unknown>
      const sub = anyCol.columns as BstTableColumn<TData>[] | undefined
      if (Array.isArray(sub)) {
        const nextSub = walk(sub)
        if (nextSub !== sub) {
          changed = true
          return { ...col, columns: nextSub } as BstTableColumn<TData>
        }
        return col
      }
      const meta = anyCol.meta as BstColumnMeta<TData> | undefined
      const formula = meta?.formula
      if (typeof formula !== 'function') return col
      changed = true
      const id = (anyCol.id ?? anyCol.accessorKey) as string | undefined
      // Drop accessorKey — TanStack rejects a column with both accessorKey and
      // accessorFn; the formula is the sole value source.
      const { accessorKey: _accessorKey, ...rest } = anyCol
      const next: Record<string, unknown> = {
        ...rest,
        id,
        accessorFn: (row: TData, index: number) =>
          formula(row, { rows: dataRef.current, index } as BstFormulaContext<TData>),
      }
      return next as unknown as BstTableColumn<TData>
    })
    return changed ? out : cols
  }
  return walk(columns)
}
