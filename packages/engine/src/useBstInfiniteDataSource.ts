import * as React from 'react'
import type { DataSource, DataSourceQuery } from './datasource.js'
import type { DsSort, DsColumnFilter } from './useBstDataSource.js'
import { isConditionActive } from './filtering.js'

/**
 * A2 infinite scroll / fetch-on-scroll. The server-tier companion to
 * {@link useBstDataSource}: instead of replacing the page on every change, it
 * **accumulates** windows as the user scrolls to the end, so the grid grows into
 * a long virtualized list. Pairs with `enableVirtualization` (you don't want tens
 * of thousands of rows in the DOM) and `pagination={false}` / `showPagination={false}`.
 *
 * Sort / filter / quick-filter still run server-side (manual mode); changing any
 * of them **resets** the accumulation to the first window. Wire `onReachEnd` (===
 * `fetchNextPage`) into `<BstTable onReachEnd>` — the grid fires it once when the
 * viewport nears the tail.
 *
 * ```tsx
 * const inf = useBstInfiniteDataSource(source, { pageSize: 100 })
 * <BstTableMui
 *   columns={columns}
 *   getRowId={(r) => r.id}
 *   enableVirtualization
 *   pagination={false}
 *   showPagination={false}
 *   onReachEnd={inf.fetchNextPage}
 *   {...inf.tableProps}
 * />
 * ```
 */

type Updater<T> = T | ((old: T) => T)
const apply = <T>(u: Updater<T>, old: T): T =>
  typeof u === 'function' ? (u as (o: T) => T)(old) : u

export interface UseBstInfiniteDataSourceOptions {
  /** Rows fetched per window (the scroll increment). Default 50. */
  pageSize?: number
  /** Debounce (ms) on filter / quick-filter changes before the reset fetch. Default 300. */
  debounceMs?: number
  initialSorting?: DsSort[]
  initialColumnFilters?: DsColumnFilter[]
  initialGlobalFilter?: string
  /** Change to force a full reset when you swap to a genuinely different source. */
  sourceKey?: string | number
}

/** Props to spread into the grid to run it in infinite (append) server mode. */
export interface BstInfiniteTableProps<TData> {
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
    pagination: { pageIndex: number; pageSize: number }
  }
  onSortingChange: (u: Updater<DsSort[]>) => void
  onColumnFiltersChange: (u: Updater<DsColumnFilter[]>) => void
  onGlobalFilterChange: (u: Updater<string>) => void
  onPaginationChange: (u: Updater<unknown>) => void
  /** Initial fetch in flight (X23) — drives the loading overlay (not appends). */
  loading: boolean
  /** Last fetch error, or null (X23) — drives the error overlay. */
  error: Error | null
}

export interface BstInfiniteDataSourceResult<TData> {
  /** All rows accumulated so far (across every loaded window). */
  rows: TData[]
  /** Total rows matching the current query across all windows. */
  totalCount: number
  /** The first-window (reset) fetch is in flight. */
  loading: boolean
  /** A follow-on window (append) fetch is in flight. */
  isFetchingNextPage: boolean
  /** More rows remain to load (accumulated < total). */
  hasNextPage: boolean
  /** The last fetch's error, or null. */
  error: Error | null
  /** Load the next window and append it. No-op while fetching or at the end. */
  fetchNextPage: () => void
  /** Alias of `fetchNextPage`, named for `<BstTable onReachEnd>`. */
  onReachEnd: () => void
  /** Reset and re-fetch the first window (e.g. after a mutation). */
  refetch: () => void
  /** Spread into the grid to run it in infinite server mode. */
  tableProps: BstInfiniteTableProps<TData>
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

export function useBstInfiniteDataSource<TData>(
  source: DataSource<TData>,
  options: UseBstInfiniteDataSourceOptions = {},
): BstInfiniteDataSourceResult<TData> {
  const pageSize = options.pageSize ?? 50
  const debounceMs = options.debounceMs ?? 300
  const sourceKey = options.sourceKey

  const [sorting, setSorting] = React.useState<DsSort[]>(options.initialSorting ?? [])
  const [columnFilters, setColumnFilters] = React.useState<DsColumnFilter[]>(
    options.initialColumnFilters ?? [],
  )
  const [globalFilter, setGlobalFilter] = React.useState<string>(options.initialGlobalFilter ?? '')

  const [rows, setRows] = React.useState<TData[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [isFetchingNextPage, setIsFetchingNextPage] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [refetchTick, setRefetchTick] = React.useState(0)

  const rawFilters = React.useMemo(
    () => ({ columnFilters, globalFilter }),
    [columnFilters, globalFilter],
  )
  const debounced = useDebounced(rawFilters, debounceMs)

  // The query WITHOUT offset/limit — its identity decides when to reset.
  const queryBase = React.useMemo(
    () => ({
      sort: sorting.map((s) => ({ id: s.id, desc: !!s.desc })),
      filters: debounced.columnFilters
        .filter((f) => isConditionActive(f.value))
        .map((f) => ({ id: f.id, value: f.value })),
      quickFilter: debounced.globalFilter.trim() ? debounced.globalFilter : undefined,
    }),
    [sorting, debounced],
  )

  // Refs so `fetchNextPage` reads live values without being re-created each render,
  // and a stale append can't clobber a newer reset (generation token).
  const sourceRef = React.useRef(source)
  sourceRef.current = source
  const genRef = React.useRef(0)
  const rowsRef = React.useRef<TData[]>(rows)
  rowsRef.current = rows
  const totalRef = React.useRef(0)
  totalRef.current = totalCount
  const queryBaseRef = React.useRef(queryBase)
  queryBaseRef.current = queryBase
  const busyRef = React.useRef(false)
  const loadedRef = React.useRef(false)
  const aliveRef = React.useRef(true)
  React.useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // Reset: query identity / source / refetch changed → fetch the first window and
  // REPLACE the accumulation. Bumping the generation invalidates any in-flight append.
  React.useEffect(() => {
    const gen = ++genRef.current
    const controller = new AbortController()
    busyRef.current = true
    loadedRef.current = false
    setLoading(true)
    setError(null)
    const query: DataSourceQuery = { ...queryBase, offset: 0, limit: pageSize }
    sourceRef.current.fetch(query, controller.signal).then(
      (page) => {
        if (!aliveRef.current || gen !== genRef.current) return
        setRows(page.rows)
        setTotalCount(page.totalCount)
        setLoading(false)
        busyRef.current = false
        loadedRef.current = true
      },
      (e) => {
        if (!aliveRef.current || controller.signal.aborted || gen !== genRef.current) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
        busyRef.current = false
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryBase, sourceKey, refetchTick, pageSize])

  const fetchNextPage = React.useCallback(() => {
    if (busyRef.current || !loadedRef.current) return
    const offset = rowsRef.current.length
    if (offset >= totalRef.current) return // at the end
    const gen = genRef.current
    const controller = new AbortController()
    busyRef.current = true
    setIsFetchingNextPage(true)
    const query: DataSourceQuery = { ...queryBaseRef.current, offset, limit: pageSize }
    sourceRef.current.fetch(query, controller.signal).then(
      (page) => {
        if (!aliveRef.current || gen !== genRef.current) return // a reset superseded us
        setRows((prev) => [...prev, ...page.rows])
        setTotalCount(page.totalCount)
        setIsFetchingNextPage(false)
        busyRef.current = false
      },
      (e) => {
        if (!aliveRef.current || controller.signal.aborted || gen !== genRef.current) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setIsFetchingNextPage(false)
        busyRef.current = false
      },
    )
  }, [pageSize])

  const refetch = React.useCallback(() => setRefetchTick((t) => t + 1), [])

  const onSortingChange = React.useCallback(
    (u: Updater<DsSort[]>) => setSorting((prev) => apply(u, prev)),
    [],
  )
  const onColumnFiltersChange = React.useCallback(
    (u: Updater<DsColumnFilter[]>) => setColumnFilters((prev) => apply(u, prev)),
    [],
  )
  const onGlobalFilterChange = React.useCallback(
    (u: Updater<string>) => setGlobalFilter((prev) => apply(u, prev)),
    [],
  )
  const onPaginationChange = React.useCallback(() => {}, [])

  const hasNextPage = loadedRef.current ? rows.length < totalCount : rows.length < totalCount && !loading

  const tableProps: BstInfiniteTableProps<TData> = {
    data: rows,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    autoResetPageIndex: false,
    rowCount: totalCount,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      // One "page" holding everything loaded — the grid renders `data` as-is
      // (manual pagination) and row virtualization windows it.
      pagination: { pageIndex: 0, pageSize: Math.max(rows.length, 1) },
    },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    // Only the initial load covers the grid; appends use `isFetchingNextPage`.
    loading: loading && rows.length === 0,
    error,
  }

  return {
    rows,
    totalCount,
    loading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    onReachEnd: fetchNextPage,
    refetch,
    tableProps,
  }
}
