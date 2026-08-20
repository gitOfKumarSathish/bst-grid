import * as React from 'react'
import type { DataSource, DataSourceQuery } from './datasource.js'
import { isConditionActive } from './filtering.js'

type Updater<T> = T | ((old: T) => T)
const apply = <T>(u: Updater<T>, old: T): T =>
  typeof u === 'function' ? (u as (o: T) => T)(old) : u

/** Minimal TanStack-compatible state shapes the grid controls. */
export interface DsSort {
  id: string
  desc: boolean
}
export interface DsColumnFilter {
  id: string
  value: unknown
}
export interface DsPagination {
  pageIndex: number
  pageSize: number
}

export interface UseBstDataSourceOptions {
  /** Initial page size. Default 10. */
  pageSize?: number
  initialSorting?: DsSort[]
  initialColumnFilters?: DsColumnFilter[]
  initialGlobalFilter?: string
  /**
   * Debounce (ms) applied to **filter / quick-filter** changes so typing doesn't
   * fire a request per keystroke. Sort + pagination changes fetch immediately.
   * Default 300. Set `0` to disable.
   */
  debounceMs?: number
  /**
   * Identity of the source. Change it to force a refetch when you swap to a
   * genuinely different source (endpoint / tenant / dataset). Re-creating the
   * *same* logical source each render (without changing this) will NOT refetch —
   * which is what prevents an unmemoized source from looping.
   */
  sourceKey?: string | number
}

/** Props to spread into `useBstTable` / an adapter to run the grid in server mode. */
export interface BstServerTableProps<TData> {
  data: TData[]
  manualSorting: true
  manualFiltering: true
  manualPagination: true
  autoResetPageIndex: false
  rowCount: number
  state: {
    sorting: DsSort[]
    columnFilters: DsColumnFilter[]
    globalFilter: string
    pagination: DsPagination
  }
  onSortingChange: (u: Updater<DsSort[]>) => void
  onColumnFiltersChange: (u: Updater<DsColumnFilter[]>) => void
  onGlobalFilterChange: (u: Updater<string>) => void
  onPaginationChange: (u: Updater<DsPagination>) => void
  /** Fetch in flight (AG23) — drives the loading overlay. */
  loading: boolean
  /** Last fetch error, or null (AG23) — drives the error overlay. */
  error: Error | null
}

export interface BstDataSourceResult<TData> {
  /** The current page's rows (also in `tableProps.data`). */
  rows: TData[]
  /** Total matching rows across all pages. */
  totalCount: number
  /** A fetch is in flight. */
  loading: boolean
  /** The last fetch's error, or null. */
  error: Error | null
  /** Re-run the current query (e.g. after a mutation). */
  refetch: () => void
  /** Spread into the grid to put it in server mode. */
  tableProps: BstServerTableProps<TData>
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    if (ms <= 0) {
      setV(value)
      return
    }
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/**
 * Drives a {@link DataSource} for server-side sort / filter / pagination and
 * returns `tableProps` to spread into `useBstTable` (or an adapter). Manages the
 * request lifecycle: **aborts** superseded requests, ignores **stale** responses,
 * **debounces** filter/quick-filter changes (sort + paging are immediate), and
 * **resets to page 0** exactly when the (debounced) result set changes — so a
 * pagination inside the debounce window can't strand the grid on an empty page.
 * The grid's existing chrome (sort headers, filter row, search box, pagination
 * bar) drives it unchanged. **Grouping/expansion are not server-driven** — use
 * those in client mode only.
 *
 * ```tsx
 * const ds = useBstDataSource(source, { pageSize: 25 })
 * <BstTableShadcn columns={columns} getRowId={r => r.id} {...ds.tableProps} />
 * ```
 */
export function useBstDataSource<TData>(
  source: DataSource<TData>,
  options: UseBstDataSourceOptions = {},
): BstDataSourceResult<TData> {
  const pageSize = options.pageSize ?? 10
  const debounceMs = options.debounceMs ?? 300
  const sourceKey = options.sourceKey

  const [sorting, setSorting] = React.useState<DsSort[]>(options.initialSorting ?? [])
  const [columnFilters, setColumnFilters] = React.useState<DsColumnFilter[]>(
    options.initialColumnFilters ?? [],
  )
  const [globalFilter, setGlobalFilter] = React.useState<string>(options.initialGlobalFilter ?? '')
  const [pagination, setPagination] = React.useState<DsPagination>({ pageIndex: 0, pageSize })

  const [rows, setRows] = React.useState<TData[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [refetchTick, setRefetchTick] = React.useState(0)

  // Filters are debounced (typing) as ONE combined value so simultaneous edits to
  // a column filter + the search box settle together (one query change). Sort and
  // pagination take effect immediately (not debounced).
  const rawFilters = React.useMemo(
    () => ({ columnFilters, globalFilter }),
    [columnFilters, globalFilter],
  )
  const debounced = useDebounced(rawFilters, debounceMs)

  // Reset to page 0 when the *applied* (debounced) result set changes — tied to
  // the debounced value, so a mid-window pagination can't leave the grid on a
  // now-empty page and no immediate unfiltered fetch fires. Sort resets its page
  // in the setter below (sort is immediate, so there's no decoupling there).
  React.useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [debounced])

  // Adopt an external `pageSize` change (resets to page 0).
  React.useEffect(() => {
    setPagination((p) => (p.pageSize === pageSize ? p : { pageIndex: 0, pageSize }))
  }, [pageSize])

  const query: DataSourceQuery = React.useMemo(
    () => ({
      sort: sorting.map((s) => ({ id: s.id, desc: !!s.desc })),
      filters: debounced.columnFilters
        .filter((f) => isConditionActive(f.value))
        .map((f) => ({ id: f.id, value: f.value })),
      quickFilter: debounced.globalFilter.trim() ? debounced.globalFilter : undefined,
      offset: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, debounced, pagination],
  )

  // Latest source in a ref so an unmemoized source doesn't loop; a *declared*
  // swap refetches via `sourceKey` in the effect deps.
  const sourceRef = React.useRef(source)
  sourceRef.current = source
  const reqIdRef = React.useRef(0)
  const aliveRef = React.useRef(true)
  React.useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  React.useEffect(() => {
    const controller = new AbortController()
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    sourceRef.current.fetch(query, controller.signal).then(
      (page) => {
        if (!aliveRef.current || reqId !== reqIdRef.current) return // unmounted / superseded
        // Out-of-range page (e.g. after a shrinking mutation + refetch): jump to
        // the last page and let the pagination change re-query, don't show blank.
        if (page.rows.length === 0 && page.totalCount > 0 && query.offset >= page.totalCount) {
          setTotalCount(page.totalCount)
          const lastIndex = Math.max(0, Math.ceil(page.totalCount / pagination.pageSize) - 1)
          setPagination((p) => (p.pageIndex === lastIndex ? p : { ...p, pageIndex: lastIndex }))
          return
        }
        setRows(page.rows)
        setTotalCount(page.totalCount)
        setLoading(false)
      },
      (e) => {
        if (!aliveRef.current || controller.signal.aborted || reqId !== reqIdRef.current) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refetchTick, sourceKey])

  const refetch = React.useCallback(() => setRefetchTick((t) => t + 1), [])

  // Sort resets its page immediately (safe — no debounce). Filter/global setters
  // only update state; the debounced effect above owns their page reset.
  const onSortingChange = React.useCallback((u: Updater<DsSort[]>) => {
    setSorting((prev) => apply(u, prev))
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [])
  const onColumnFiltersChange = React.useCallback(
    (u: Updater<DsColumnFilter[]>) => setColumnFilters((prev) => apply(u, prev)),
    [],
  )
  const onGlobalFilterChange = React.useCallback(
    (u: Updater<string>) => setGlobalFilter((prev) => apply(u, prev)),
    [],
  )
  const onPaginationChange = React.useCallback(
    (u: Updater<DsPagination>) => setPagination((prev) => apply(u, prev)),
    [],
  )

  const tableProps: BstServerTableProps<TData> = {
    data: rows,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    autoResetPageIndex: false,
    rowCount: totalCount,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    loading,
    error,
  }

  return { rows, totalCount, loading, error, refetch, tableProps }
}
