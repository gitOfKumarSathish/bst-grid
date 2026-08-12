/**
 * DataSource — the client/server seam (Plan.md §2.2, §5). A grid runs identically
 * over an in-memory array (tiers 1–2) or a server query (tier 3) by swapping the
 * source; `useBstDataSource` drives it and puts the grid into TanStack **manual**
 * mode (server does sort/filter/paginate). This is the foundation the artifact
 * flagged as missing — the engine was client-only.
 */

import { evalCondition } from './filtering.js'

/** One sort directive (highest priority first). */
export interface DataSourceSort {
  /** Column id. */
  id: string
  /** Descending? */
  desc: boolean
}

/** One per-column filter. `value` is a `{ op, value, value2? }` condition or a bare value. */
export interface DataSourceFilter {
  /** Column id. */
  id: string
  /** The column-filter value (operator-aware condition, or a plain value → `contains`). */
  value: unknown
}

/** The query a page request carries — everything the server needs to return one page. */
export interface DataSourceQuery {
  /** Multi-column sort. */
  sort: DataSourceSort[]
  /** Per-column filters (E3 conditions). */
  filters: DataSourceFilter[]
  /** Global quick-filter text (the toolbar search box). */
  quickFilter?: string
  /** Zero-based row offset of the requested page (`pageIndex * pageSize`). */
  offset: number
  /** Page size (rows requested). */
  limit: number
}

/** One page of results. */
export interface DataSourcePage<TData> {
  /** The rows for this page. */
  rows: TData[]
  /** Total rows matching the query across ALL pages — drives the page count. */
  totalCount: number
  /** Optional grand total BEFORE filtering (for an "X of Y — filtered from Z" UI). */
  unfilteredCount?: number
}

/**
 * A pluggable data source. `signal` aborts a request the grid has superseded.
 * Sort/filter `id`s are the **column ids** (map them to your DB fields
 * server-side). Grouping and expansion are NOT part of the query — server-side
 * grouping/aggregation is a separate concern, so enable `enableGrouping` only in
 * client mode.
 */
export interface DataSource<TData> {
  fetch(query: DataSourceQuery, signal?: AbortSignal): Promise<DataSourcePage<TData>>
}

/**
 * Wrap a fetch function as a DataSource (the server tier). Thin by design — your
 * function *is* the source; this just names + types it.
 *
 * ```ts
 * const source = createServerDataSource(async (q, signal) => {
 *   const res = await fetch('/api/rows?' + toParams(q), { signal })
 *   const { rows, total } = await res.json()
 *   return { rows, totalCount: total }
 * })
 * ```
 */
export function createServerDataSource<TData>(
  fetcher: (query: DataSourceQuery, signal?: AbortSignal) => Promise<DataSourcePage<TData>>,
): DataSource<TData> {
  return { fetch: fetcher }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const an = Number(a)
  const bn = Number(b)
  const numeric =
    !Number.isNaN(an) &&
    !Number.isNaN(bn) &&
    String(a).trim() !== '' &&
    String(b).trim() !== ''
  if (numeric) return an - bn
  return String(a).localeCompare(String(b))
}

/**
 * In-memory DataSource — applies **filter → quick-filter → sort → page** over
 * `rows` using the SAME operator semantics (`evalCondition`) as the client grid.
 * Sort is a best-effort natural comparison (numeric when both values parse as
 * numbers, else locale string) — a real server defines its own ordering. Async
 * (resolves a Promise, honours `AbortSignal`); `delayMs` simulates latency.
 */
export function createClientDataSource<TData>(
  rows: readonly TData[],
  opts: {
    /** Read a column's value from a row. Default `(row, id) => row[id]`. */
    getValue?: (row: TData, columnId: string) => unknown
    /** Column ids the **quick filter** searches. Default: all own fields of the row. */
    columns?: string[]
    /** Simulated latency (ms). Default 0. */
    delayMs?: number
  } = {},
): DataSource<TData> {
  const getValue = opts.getValue ?? ((row: TData, id: string) => (row as Record<string, unknown>)[id])
  const unfilteredCount = rows.length
  return {
    async fetch(query, signal) {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs))
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      let out = rows.slice()
      for (const f of query.filters) {
        out = out.filter((row) => evalCondition(getValue(row, f.id), f.value))
      }
      const q = query.quickFilter?.trim().toLowerCase()
      if (q) {
        out = out.filter((row) => {
          const vals = opts.columns
            ? opts.columns.map((id) => getValue(row, id))
            : Object.values(row as Record<string, unknown>)
          return vals.some((v) => v != null && String(v).toLowerCase().includes(q))
        })
      }
      if (query.sort.length) {
        out = out.slice().sort((a, b) => {
          for (const s of query.sort) {
            const cmp = compareValues(getValue(a, s.id), getValue(b, s.id))
            if (cmp !== 0) return s.desc ? -cmp : cmp
          }
          return 0
        })
      }
      const totalCount = out.length
      return {
        rows: out.slice(query.offset, query.offset + query.limit),
        totalCount,
        unfilteredCount,
      }
    },
  }
}
