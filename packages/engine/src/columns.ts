import * as React from 'react'
import type { RowData } from '@tanstack/react-table'
import type { AutoColumnsOptions, BstTableColumn } from './types.js'

/**
 * Column construction helpers for two "zero-config column" features:
 *   • X9  — a leading row-number (`#`) column (`enableRowNumbers`)
 *   • X27 — columns inferred from the data (`enableAutoColumns`)
 *
 * Both produce ordinary TanStack column defs, so they flow through the normal
 * render / sizing / virtualization path with no special-casing in `<BstTable>`.
 */

/** Reserved id prefix. Adapters skip columns with this prefix in their chrome. */
export const RESERVED_COLUMN_PREFIX = '__bst'
/** Reserved id of the row-number column (X9). */
export const ROW_NUMBER_COLUMN_ID = '__bstRowNumber'

/**
 * Per-row-model cache of display numbers (rowId → 1-based position), keyed by the
 * exact `rows` array `getRowModel()` returns. v9 memoizes that array per state,
 * so the map is built once per render and every row-number cell reuses it (O(n),
 * not O(n²)). Keying on the painted model — read live in the cell — guarantees the
 * number matches the sort / filter / page order actually on screen.
 */
const NUMBER_CACHE = new WeakMap<object, Map<string, number>>()

/** Row's 1-based number within the current view (continuous across pages). */
function rowNumberFor(table: any, rowId: string): number | undefined {
  const rows = table.getRowModel().rows as Array<{ id: string }>
  let map = NUMBER_CACHE.get(rows)
  if (!map) {
    map = new Map<string, number>()
    const pag = (table.store?.state as { pagination?: { pageIndex: number; pageSize: number } })
      ?.pagination
    const offset =
      pag && Number.isFinite(pag.pageIndex * pag.pageSize) ? pag.pageIndex * pag.pageSize : 0
    rows.forEach((r, i) => map!.set(r.id, offset + i + 1))
    NUMBER_CACHE.set(rows, map)
  }
  return map.get(rowId)
}

/**
 * The leading row-number column (X9). Non-interactive: it never sorts, filters,
 * hides, resizes, reorders or groups, so it stays out of every chrome surface
 * (sort arrows, filter row, columns menu, export) by construction. The number is
 * computed from the live, painted row model, so it always reflects the current
 * sort / filter / page order. `useBstTable` also **pins it to the start** (seeds
 * `columnPinning.start` with {@link ROW_NUMBER_COLUMN_ID}) so it stays the
 * leftmost data column — ahead of any user-pinned column — and sticky on scroll.
 */
export function makeRowNumberColumn<TData extends RowData>(
  header: unknown,
): BstTableColumn<TData> {
  return {
    id: ROW_NUMBER_COLUMN_ID,
    header: (header ?? '#') as any,
    size: 56,
    minSize: 40,
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: false,
    enableGrouping: false,
    cell: (info: any) =>
      React.createElement(
        'span',
        { className: 'bst-rownum-cell' },
        rowNumberFor(info.table, info.row.id) ?? info.row.index + 1,
      ),
  } as unknown as BstTableColumn<TData>
}

/** `fooBar` / `foo_bar` / `foo-bar` → "Foo Bar". */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Built-in cell-type guess from a sample value (X27). Text → undefined (untyped). */
export function inferCellType(_key: string, value: unknown): string | undefined {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return 'date'
  return undefined
}

/**
 * Infer columns from row data (X27) — one column per key found across a sample
 * of rows (first-seen order), with a humanized header and a guessed cell type.
 * Returns `[]` for empty / non-object data (the grid then renders no columns).
 */
export function autoGenerateColumns<TData extends RowData>(
  data: readonly TData[],
  opts: AutoColumnsOptions = {},
): BstTableColumn<TData>[] {
  const sample = data.slice(0, opts.sampleRows ?? 50)
  const header = opts.header ?? humanizeKey
  const inferType = opts.inferType ?? inferCellType

  // Collect keys in first-seen order across the sample.
  const found: string[] = []
  const seen = new Set<string>()
  for (const row of sample) {
    if (!row || typeof row !== 'object') continue
    for (const k of Object.keys(row as Record<string, unknown>)) {
      if (!seen.has(k)) {
        seen.add(k)
        found.push(k)
      }
    }
  }

  let keys = opts.include ? opts.include.slice() : found
  if (opts.exclude?.length) {
    const skip = new Set(opts.exclude)
    keys = keys.filter((k) => !skip.has(k))
  }

  return keys.map((key) => {
    const firstNonNull = sample.find(
      (r) => r && typeof r === 'object' && (r as Record<string, unknown>)[key] != null,
    ) as Record<string, unknown> | undefined
    const type = inferType(key, firstNonNull?.[key])
    return {
      id: key,
      accessorKey: key,
      header: header(key),
      ...(type ? { meta: { type } } : {}),
    } as unknown as BstTableColumn<TData>
  })
}
