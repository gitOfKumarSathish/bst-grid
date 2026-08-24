import * as React from 'react'
import type { RowData } from '@tanstack/react-table'
import type { BstTableInstance } from './useBstTable.js'

/**
 * Grid-state save/restore (X21). A serializable snapshot of a grid's **view
 * state** — sort, filters, and the column layout (order · size · visibility ·
 * pinning) plus grouping, expansion, row pinning, selection and pagination — so a
 * per-user "view" can be persisted and restored across reloads.
 *
 * This is distinct from the runtime **settings sheet** (`useBstSettings`), which
 * toggles *features* on and off. Grid state captures how the data is currently
 * *arranged*, not which capabilities are enabled.
 *
 * v9 note: v9 removed `table.getState()`. The current snapshot is read from
 * `table.store.state` and restored through the per-slice setters
 * (`setSorting`, `setColumnOrder`, …) — this module wraps both.
 */

/** Bumped only if the snapshot shape changes incompatibly (older blobs are dropped on load). */
export const BST_GRID_STATE_VERSION = 1

/** localStorage namespace — parallels the settings sheet's `bst-table:settings:`. */
const STORAGE_PREFIX = 'bst-table:state:'

/** The view-state slices a snapshot can carry. */
export type BstGridStateKey =
  | 'sorting'
  | 'columnFilters'
  | 'globalFilter'
  | 'columnOrder'
  | 'columnSizing'
  | 'columnVisibility'
  | 'columnPinning'
  | 'grouping'
  | 'expanded'
  | 'rowPinning'
  | 'rowSelection'
  | 'pagination'

/** Every snapshot slice, in a stable order. */
export const BST_GRID_STATE_KEYS: readonly BstGridStateKey[] = [
  'sorting',
  'columnFilters',
  'globalFilter',
  'columnOrder',
  'columnSizing',
  'columnVisibility',
  'columnPinning',
  'grouping',
  'expanded',
  'rowPinning',
  'rowSelection',
  'pagination',
]

/** The "layout" slices — what `resetGridState` clears by default (not pagination/selection). */
const LAYOUT_KEYS: readonly BstGridStateKey[] = BST_GRID_STATE_KEYS.filter(
  (k) => k !== 'pagination' && k !== 'rowSelection',
)

/** Slices keyed by column id — sanitised against the live columns on apply. */
const COLUMN_KEYS = new Set<BstGridStateKey>([
  'sorting',
  'columnFilters',
  'columnOrder',
  'columnSizing',
  'columnVisibility',
  'columnPinning',
  'grouping',
])

/** A serializable grid view-state snapshot (plain JSON — safe to persist per user). */
export interface BstGridState {
  /** Schema version — {@link BST_GRID_STATE_VERSION}. */
  version: number
  sorting?: Array<{ id: string; desc: boolean }>
  columnFilters?: Array<{ id: string; value: unknown }>
  globalFilter?: unknown
  columnOrder?: string[]
  columnSizing?: Record<string, number>
  columnVisibility?: Record<string, boolean>
  /** v9 pinning is `{ start, end }` (renamed from v8 left/right). */
  columnPinning?: { start?: string[]; end?: string[] }
  grouping?: string[]
  expanded?: true | Record<string, boolean>
  rowPinning?: { top?: string[]; bottom?: string[] }
  rowSelection?: Record<string, boolean>
  pagination?: { pageIndex: number; pageSize: number }
}

/** Narrow which slices a snapshot / restore touches. */
export interface BstGridStateSelect {
  /** Only these slices (default: all). */
  include?: BstGridStateKey[]
  /** Drop these slices (applied after `include`). */
  exclude?: BstGridStateKey[]
}

function selectedKeys(sel?: BstGridStateSelect, base: readonly BstGridStateKey[] = BST_GRID_STATE_KEYS) {
  const inc = sel?.include ?? base
  const ex = new Set(sel?.exclude ?? [])
  return inc.filter((k) => !ex.has(k))
}

/** Snapshots must not alias TanStack's live state (callers store/mutate them). */
function clone<T>(v: T): T {
  return v == null || typeof v !== 'object' ? v : (JSON.parse(JSON.stringify(v)) as T)
}

/** The per-slice setter name on the table for each key. */
const SETTER: Record<BstGridStateKey, string> = {
  sorting: 'setSorting',
  columnFilters: 'setColumnFilters',
  globalFilter: 'setGlobalFilter',
  columnOrder: 'setColumnOrder',
  columnSizing: 'setColumnSizing',
  columnVisibility: 'setColumnVisibility',
  columnPinning: 'setColumnPinning',
  grouping: 'setGrouping',
  expanded: 'setExpanded',
  rowPinning: 'setRowPinning',
  rowSelection: 'setRowSelection',
  pagination: 'setPagination',
}

/**
 * Snapshot the grid's current view state as plain JSON (X21). Pass `include` /
 * `exclude` to capture only some slices (e.g. skip `rowSelection` / `pagination`).
 */
export function getGridState<TData extends RowData>(
  table: BstTableInstance<TData>,
  select?: BstGridStateSelect,
): BstGridState {
  const state = ((table as any).store?.state ?? {}) as Record<string, unknown>
  const out = { version: BST_GRID_STATE_VERSION } as unknown as Record<string, unknown>
  for (const k of selectedKeys(select)) {
    const v = state[k]
    if (v !== undefined) out[k] = clone(v)
  }
  return out as unknown as BstGridState
}

function sanitizeColumnSlice(k: BstGridStateKey, raw: unknown, valid: Set<string>): unknown {
  switch (k) {
    case 'columnOrder':
    case 'grouping':
      return Array.isArray(raw) ? raw.filter((id) => valid.has(String(id))) : raw
    case 'sorting':
    case 'columnFilters':
      return Array.isArray(raw)
        ? raw.filter((e) => e && valid.has(String((e as { id?: unknown }).id)))
        : raw
    case 'columnSizing':
    case 'columnVisibility': {
      const obj = (raw ?? {}) as Record<string, unknown>
      const picked: Record<string, unknown> = {}
      for (const key of Object.keys(obj)) if (valid.has(key)) picked[key] = obj[key]
      return picked
    }
    case 'columnPinning': {
      const p = (raw ?? {}) as { start?: unknown; end?: unknown }
      return {
        start: Array.isArray(p.start) ? p.start.filter((id) => valid.has(String(id))) : [],
        end: Array.isArray(p.end) ? p.end.filter((id) => valid.has(String(id))) : [],
      }
    }
    default:
      return raw
  }
}

/**
 * Restore a (partial) view-state snapshot onto the grid (X21). Entries that
 * reference a column which no longer exists are dropped, so a snapshot survives a
 * column-set change without wedging the grid. Pass `include` / `exclude` to
 * restore a subset. Silently ignores an absent snapshot.
 */
export function applyGridState<TData extends RowData>(
  table: BstTableInstance<TData>,
  state: Partial<BstGridState> | null | undefined,
  select?: BstGridStateSelect,
): void {
  if (!state) return
  const keys = new Set(selectedKeys(select))
  const valid = new Set(
    ((table as any).getAllLeafColumns() as Array<{ id: string }>).map((c) => c.id),
  )
  const t = table as unknown as Record<string, (v: unknown) => void>
  for (const k of BST_GRID_STATE_KEYS) {
    if (!keys.has(k) || !(k in state)) continue
    const raw = (state as Record<string, unknown>)[k]
    if (raw === undefined) continue
    const value = COLUMN_KEYS.has(k) ? sanitizeColumnSlice(k, raw, valid) : clone(raw)
    const setter = t[SETTER[k]]
    if (typeof setter === 'function') setter(value)
  }
}

/**
 * An "empty" snapshot — the cleared view (no sort / filter, default column
 * layout). By default omits `pagination` and `rowSelection` (clearing those is
 * rarely what "reset view" means); request them via `include` if you want them.
 */
export function emptyGridState(select?: BstGridStateSelect): BstGridState {
  const empties: Record<BstGridStateKey, unknown> = {
    sorting: [],
    columnFilters: [],
    globalFilter: '',
    columnOrder: [],
    columnSizing: {},
    columnVisibility: {},
    columnPinning: { start: [], end: [] },
    grouping: [],
    expanded: {},
    rowPinning: { top: [], bottom: [] },
    rowSelection: {},
    pagination: { pageIndex: 0, pageSize: 10 },
  }
  const out = { version: BST_GRID_STATE_VERSION } as unknown as Record<string, unknown>
  for (const k of selectedKeys(select, LAYOUT_KEYS)) out[k] = empties[k]
  return out as unknown as BstGridState
}

/**
 * Clear the grid's view back to defaults — sort · filter · column layout ·
 * grouping · expansion · row pinning. `pagination` and `rowSelection` are left
 * as-is unless you pass them via `include`.
 */
export function resetGridState<TData extends RowData>(
  table: BstTableInstance<TData>,
  select?: BstGridStateSelect,
): void {
  applyGridState(table, emptyGridState(select), select ?? { include: [...LAYOUT_KEYS] })
}

/* ------------------------------------------------------------------ persistence */

/** Minimal `localStorage`-shaped contract, so `sessionStorage` / a mock also work. */
export interface BstGridStateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): BstGridStateStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

/** Persist a snapshot under `bst-table:state:<key>`. No-op when storage is unavailable. */
export function saveGridState(
  key: string,
  state: BstGridState,
  storage?: BstGridStateStorage,
): void {
  const s = storage ?? defaultStorage()
  if (!s) return
  try {
    s.setItem(STORAGE_PREFIX + key, JSON.stringify(state))
  } catch {
    /* quota / private mode — stay in-memory */
  }
}

/**
 * Load a persisted snapshot. Returns `undefined` when absent, unparseable, or from
 * an incompatible schema version — feed the result straight into
 * `useBstTable({ initialState })` for a flash-free restore.
 */
export function loadGridState(key: string, storage?: BstGridStateStorage): BstGridState | undefined {
  const s = storage ?? defaultStorage()
  if (!s) return undefined
  try {
    const raw = s.getItem(STORAGE_PREFIX + key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as BstGridState
    if (!parsed || typeof parsed !== 'object' || parsed.version !== BST_GRID_STATE_VERSION) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

/** Remove a persisted snapshot (leaves the live grid untouched). */
export function clearGridState(key: string, storage?: BstGridStateStorage): void {
  const s = storage ?? defaultStorage()
  if (!s) return
  try {
    s.removeItem(STORAGE_PREFIX + key)
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------------- hook */

export interface BstGridStateOptions extends BstGridStateSelect {
  /** Key suffix, namespaced under `bst-table:state:`. */
  key: string
  /** Storage backend (default `window.localStorage`). */
  storage?: BstGridStateStorage
  /** Persist changes automatically. Default `true`. */
  persist?: boolean
  /** Debounce writes, in ms (rapid column-resize etc.). Default `300`; `0` = synchronous. */
  debounceMs?: number
}

/** Imperative handle returned by {@link useBstGridState}. */
export interface BstGridStateController {
  /** The full `bst-table:state:<key>` storage key, or `null` when persistence is off. */
  storageKey: string | null
  /** Current snapshot of the grid. */
  getState: () => BstGridState
  /** Restore a snapshot onto the grid. */
  applyState: (state: Partial<BstGridState> | null | undefined) => void
  /** Force-write the current snapshot now (bypasses the debounce). */
  save: () => void
  /** Delete the persisted snapshot (the live view is untouched). */
  clear: () => void
  /**
   * Reset the grid's view (sort / filter / column layout / grouping) to defaults.
   * With auto-persist on, the default view is then written back; call `clear()`
   * too if you want to forget the persisted snapshot entirely.
   */
  reset: () => void
}

/**
 * Persist a grid's view state to storage and keep it in sync (X21).
 *
 * For a **flash-free restore**, feed `loadGridState(key)` into
 * `useBstTable({ initialState })` so the grid mounts already arranged; this hook
 * then writes later changes back (debounced).
 *
 * ```tsx
 * const table = useBstTable({ data, columns, initialState: loadGridState('orders') })
 * const view = useBstGridState(table, { key: 'orders' })
 * // <button onClick={view.reset}>Reset view</button>
 * ```
 */
export function useBstGridState<TData extends RowData>(
  table: BstTableInstance<TData>,
  options: BstGridStateOptions,
): BstGridStateController {
  const { key, storage, persist = true, debounceMs = 300 } = options
  const hasSelect = !!(options.include || options.exclude)
  const select = React.useMemo<BstGridStateSelect | undefined>(
    () => (hasSelect ? { include: options.include, exclude: options.exclude } : undefined),
    // include/exclude arrays are treated as stable per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasSelect, options.include, options.exclude],
  )
  const storageKey = persist ? STORAGE_PREFIX + key : null

  // Recomputed each render; the effect writes only when the encoded snapshot changes.
  const snapshot = getGridState(table, select)
  const encoded = JSON.stringify(snapshot)
  const firstRun = React.useRef(true)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!persist) return
    // The first run corresponds to the initialState we (probably) just restored,
    // so there's nothing new to persist.
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const write = () => saveGridState(key, JSON.parse(encoded) as BstGridState, storage)
    if (debounceMs <= 0) {
      write()
      return
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(write, debounceMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded, persist, key, debounceMs])

  return React.useMemo<BstGridStateController>(
    () => ({
      storageKey,
      getState: () => getGridState(table, select),
      applyState: (s) => applyGridState(table, s, select),
      save: () => saveGridState(key, getGridState(table, select), storage),
      clear: () => clearGridState(key, storage),
      reset: () => resetGridState(table, select),
    }),
    // `table` identity is stable across renders (useBstTable returns one instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey, key, select],
  )
}
