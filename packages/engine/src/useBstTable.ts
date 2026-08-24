import * as React from 'react'
import { useTable } from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import { bstTableFeatures } from './features.js'
import type {
  BstClassNames,
  BstStyles,
  BstContextMenuContext,
  BstContextMenuItem,
  EditingOptions,
  UseBstTableOptions,
  ValidationOptions,
} from './types.js'
import type { BstCellSpan, BstSpanContext } from './spanning.js'
import type { BstFormatRule } from './formatting.js'
import type { BstExportOptions, BstExportScope } from './export.js'
import { createRuntime } from './runtime.js'
import type { BstRuntime, CommitPolicy, RuntimeCtx, SaveTrigger } from './runtime.js'
import { createDefaultRegistry } from './registry/defaults.js'
import type { CellTypeRegistry } from './registry/registry.js'
import type { BstColumnMeta } from './registry/types.js'
import { resolveVirtualization } from './virtualization.js'
import type { ResolvedVirtualization } from './virtualization.js'
import { resolveStickyHeader } from './stickyHeader.js'
import type { ResolvedStickyHeader } from './stickyHeader.js'
import { autoGenerateColumns, makeRowNumberColumn, ROW_NUMBER_COLUMN_ID } from './columns.js'

const DEFAULT_PAGE_SIZE = 10

/** Where the runtime handle is stashed on the table instance (read by the renderer). */
export const BST_RUNTIME: unique symbol = Symbol.for('bst-table.runtime')

export interface BstRuntimeHandle<TData extends RowData> {
  runtime: BstRuntime<TData>
  registry: CellTypeRegistry
  editingMode: 'cell' | 'row' | 'batch'
  enableRowActions: boolean
  /** Row selection checkbox column is active (Phase 3). */
  enableRowSelection: boolean
  /** Column pinning (sticky) is active (Phase 3) — affects the select column too. */
  enableColumnPinning: boolean
  /** Column drag-to-reorder is active (Phase 3). */
  enableColumnOrdering: boolean
  /** Per-column header filter row is rendered (Phase 3, "dual filter"). */
  enableColumnFilterRow: boolean
  /** Set Filter (X4) — eligible columns show a distinct-values checklist in the filter row. */
  enableSetFilter: boolean
  /** Multi-filter (X11) — columns with an array `meta.filter` stack those filters. */
  enableMultiFilter: boolean
  /** Cell/range selection + keyboard nav is active (Phase 3). */
  enableCellSelection: boolean
  /** Type-to-edit — spreadsheet-style entry (type to overwrite; Enter/Tab
   *  commit-and-move). True only when editing + cell selection are also on.
   *  Read by the keydown handler and the shortcuts overlay (`<BstShortcuts>`). */
  enableTypeToEdit: boolean
  /** Clipboard copy/paste is active (Phase 3). */
  enableClipboard: boolean
  /** Undo/redo is active (Phase 3, C5). */
  enableUndoRedo: boolean
  /** Inline editing is active — read by the shortcuts overlay (`<BstShortcuts>`). */
  enableEditing: boolean
  /** Whole-column copy gesture is active (clipboard on + not opted out). */
  enableCopyColumn: boolean
  /** Whole-row copy gesture is active (clipboard on + not opted out). */
  enableCopyRow: boolean
  /**
   * Column ids the caller supplied an explicit `columnDef.cell` for. v9 always
   * populates a *default* `cell`, so this is how the renderer knows to honour a
   * user renderer vs. fall through to the cell-type registry.
   */
  userCellColumns: Set<string>
  /** Consumer-supplied class-name slots — custom CSS hooks (K1/K2). */
  classNames?: BstClassNames<TData>
  /** Consumer-supplied style slots (parallels `classNames`). */
  styles?: BstStyles<TData>
  /** Cell spanning (A5) is active — the renderer computes a col/row span plan. */
  enableCellSpanning: boolean
  /** Explicit per-cell span callback (used only when spanning is on). */
  getCellSpan?: (ctx: BstSpanContext<TData>) => BstCellSpan | undefined
  /** Master-detail (A4) — a leading expander column + detail panel rows. */
  enableExpanding: boolean
  /** Renders the detail panel for an expanded row (master-detail). */
  renderDetail?: (row: TData) => React.ReactNode
  /** Row pinning (G1) — a leading pin column + frozen top/bottom rows. */
  enableRowPinning: boolean
  /** Row resizing (G2) — drag a row's bottom edge to set its height. */
  enableRowResize: boolean
  /** Auto row height (X26) — body cells wrap and rows grow to fit their content. */
  enableAutoRowHeight: boolean
  /** Right-click context menu (X6). */
  enableContextMenu: boolean
  /** Builds the context-menu items for the clicked cell (given the defaults). */
  getContextMenuItems?: (ctx: BstContextMenuContext<TData>) => BstContextMenuItem[]
  /** Find (X8) — the in-grid search box (highlight + jump) is active. */
  enableFind: boolean
  /** Find matches case-sensitively (X8). */
  findCaseSensitive: boolean
  /** Multi-column grouping (E4) — collapsible group rows + aggregates. */
  enableGrouping: boolean
  /** Conditional-format rules (K3) applied to cells/rows at render. */
  conditionalFormats?: BstFormatRule<TData>[]
  /**
   * Fit-to-viewport layout (G3) — size the columns to the container width so
   * there is **no horizontal scroll**. The renderer measures the scroll box and
   * distributes its width across the data columns (utility columns keep their
   * fixed size). Default false (columns keep their own widths + scroll).
   */
  fitColumns: boolean
  /** Responsive column hiding (G4) — hide low-priority columns when narrow. */
  enableResponsive: boolean
  /** Row virtualization (D1) — render only the viewport's rows. Resolved config. */
  virtualization: ResolvedVirtualization
  /** Sticky-header viewport (G3/G4) — bounded body height + pinned header. Resolved config. */
  stickyHeader: ResolvedStickyHeader
  /** A2 infinite scroll — fired once when the virtualized body nears its end. */
  onReachEnd?: () => void
  /** Rows-from-end that trigger `onReachEnd`. Default 8. */
  endReachedThreshold?: number
  /** Export (X1–X3) is enabled — adapters render the "Export" toolbar menu. */
  enableExport: boolean
  /** Which export formats are on (CSV / Excel / Print) — filters the menu items. */
  exportFormats: { csv: boolean; excel: boolean; print: boolean }
  /** Row-number column (X9) is active — a leading `#` column was injected. */
  enableRowNumbers: boolean
  /** Auto-generated columns (X27) were used because no columns were supplied. */
  enableAutoColumns: boolean
  /** Loading / error overlays (X23) may render (default true). */
  enableOverlays: boolean
  /** Loading state (X23) — drives the loading overlay. */
  loading?: boolean
  /** Error state (X23) — drives the error overlay. */
  error?: React.ReactNode | Error | null
  /** Overlay label overrides (X23). */
  overlayText?: { loading?: string; error?: string }
  /** Custom loading overlay (X23). */
  renderLoadingOverlay?: () => React.ReactNode
  /** Custom error overlay (X23). */
  renderErrorOverlay?: (error: unknown) => React.ReactNode
}

/** Column ids whose column def carries a user-authored `cell` renderer. */
function collectUserCellColumns(
  columns: ReadonlyArray<Record<string, unknown>>,
  into: Set<string> = new Set<string>(),
): Set<string> {
  for (const c of columns) {
    const sub = c.columns as ReadonlyArray<Record<string, unknown>> | undefined
    if (Array.isArray(sub)) {
      collectUserCellColumns(sub, into)
    } else if (c.cell != null) {
      const id = (c.id ?? c.accessorKey) as string | undefined
      if (id) into.add(String(id))
    }
  }
  return into
}

function resolveEditing(v: boolean | EditingOptions | undefined, batch?: boolean) {
  const enabled = v === true || (typeof v === 'object' && v !== null)
  const o = typeof v === 'object' && v !== null ? v : {}
  const saveOnRaw = o.saveOn ?? (['enter', 'blur'] as SaveTrigger[])
  const saveOn = Array.isArray(saveOnRaw) ? saveOnRaw : [saveOnRaw]
  const policy: CommitPolicy = o.policy ?? 'blockCommitOnError'
  // `enableBatchEditing` (the settings-sheet switch) overrides the configured
  // mode: true forces 'batch'; false forces a batch grid back to per-cell.
  const configured = o.mode ?? 'cell'
  const mode =
    batch === true ? 'batch' : batch === false && configured === 'batch' ? 'cell' : configured
  return { enabled, mode, saveOn, policy }
}

function resolveValidation(
  v: boolean | ValidationOptions | undefined,
  fallbackPolicy: CommitPolicy,
) {
  const enabled = v === true || (typeof v === 'object' && v !== null)
  const o = typeof v === 'object' && v !== null ? v : {}
  return { enabled, policy: o.policy ?? fallbackPolicy }
}

/**
 * Resolve the export toggles (Phase 5, X1–X3). `enableExport` is the master
 * (`boolean | BstExportOptions`, an object implying enabled); the top-level
 * per-format flags (`enableCsvExport`/`enableExcelExport`/`enablePrint`, the
 * settings-sheet switches) win over the object's `csv`/`excel`/`print` fields.
 */
function resolveExport(
  v: boolean | BstExportOptions | undefined,
  csv?: boolean,
  excel?: boolean,
  print?: boolean,
) {
  const enabled = v === true || (typeof v === 'object' && v !== null)
  const o = typeof v === 'object' && v !== null ? v : {}
  return {
    enabled,
    csv: csv ?? o.csv ?? true,
    excel: excel ?? o.excel ?? true,
    print: print ?? o.print ?? true,
    fileName: o.fileName ?? 'export',
    scope: (o.scope ?? 'all') as BstExportScope,
    includeHeaders: o.includeHeaders ?? true,
  }
}

function buildCtx<TData extends RowData>(
  table: any,
  opts: UseBstTableOptions<TData>,
  registry: CellTypeRegistry,
): { ctx: RuntimeCtx<TData>; editingMode: 'cell' | 'row' | 'batch' } {
  const getRowId = opts.getRowId ?? ((_row: TData, i: number) => String(i))
  const data = opts.data
  const rowIndexById = new Map<string, number>()
  data.forEach((row, i) => rowIndexById.set(getRowId(row, i), i))

  const metaByColumn = new Map<string, BstColumnMeta<TData>>()
  const fieldByColumn = new Map<string, string>()
  const headerByColumn = new Map<string, string>()
  const columnIds: string[] = []

  for (const col of table.getAllLeafColumns() as any[]) {
    const id: string = col.id
    columnIds.push(id)
    const header = col.columnDef.header
    headerByColumn.set(id, typeof header === 'string' ? header : id)
    const rawMeta = (col.columnDef.meta ?? {}) as BstColumnMeta<TData>
    const cellType = registry.get(rawMeta.type)
    const merged: BstColumnMeta<TData> = {
      ...rawMeta,
      cellMeta: {
        ...((cellType.defaultMeta as Record<string, unknown> | undefined) ?? {}),
        ...(rawMeta.cellMeta ?? {}),
      },
    }
    metaByColumn.set(id, merged)
    const cm = (rawMeta.cellMeta ?? {}) as Record<string, unknown>
    const accessorKey = col.columnDef.accessorKey
    fieldByColumn.set(
      id,
      (cm.field as string) ?? (typeof accessorKey === 'string' ? accessorKey : id),
    )
  }

  const editing = resolveEditing(opts.enableEditing, opts.enableBatchEditing)
  const validation = resolveValidation(opts.enableValidation, editing.policy)
  const exp = resolveExport(
    opts.enableExport,
    opts.enableCsvExport,
    opts.enableExcelExport,
    opts.enablePrint,
  )
  // Find (X8) — `enableFind` is `boolean | BstFindOptions` (an object implies on).
  const findOpts =
    typeof opts.enableFind === 'object' && opts.enableFind !== null ? opts.enableFind : undefined

  // Visual (paint-order) maps — the coordinate space selection + keyboard nav
  // operate in. Row order is post sort/filter/pagination; column order is the
  // current visible leaf order. Refreshed every render (§2.5).
  const visibleLeafColumns = table.getVisibleLeafColumns() as any[]
  const visibleColumnIds = visibleLeafColumns.map((c) => c.id as string)
  const colVisualIndex = new Map<string, number>()
  visibleColumnIds.forEach((id, i) => colVisualIndex.set(id, i))

  const rowModelRows = table.getRowModel().rows as any[]
  // The coordinate space MUST match the painted body-row order in <BstTable> so
  // selection / nav / paste coordinates line up with what's on screen. With row
  // pinning the paint order is top → center → bottom (not the row-model order),
  // so build the map from the same sequence (#9/#21). Pinning off → identical to
  // the row model, so the common path is unchanged.
  const paintedRows = opts.enableRowPinning
    ? [
        ...((table.getTopRows?.() ?? []) as any[]),
        ...((table.getCenterRows?.() ?? []) as any[]),
        ...((table.getBottomRows?.() ?? []) as any[]),
      ]
    : rowModelRows
  const visibleRowIds = paintedRows.map((r) => r.id as string)
  const rowVisualIndex = new Map<string, number>()
  visibleRowIds.forEach((id, i) => rowVisualIndex.set(id, i))

  // Every row after filter + sort but BEFORE pagination — copy-column (H3) spans
  // all pages. v9's method is `getPrePaginatedRowModel`; fall back to the
  // paginated rows if it isn't present.
  const allRowIds = (
    (table.getPrePaginatedRowModel?.()?.rows ?? rowModelRows) as any[]
  ).map((r) => r.id as string)

  // Clipboard implies cell selection (there must be something to copy/paste at).
  const enableClipboard = !!opts.enableClipboard
  const enableCellSelection = !!opts.enableCellSelection || enableClipboard

  const ctx: RuntimeCtx<TData> = {
    registry,
    data,
    rowIndexById,
    getRowId,
    metaByColumn,
    fieldByColumn,
    headerByColumn,
    columnIds,
    visibleRowIds,
    allRowIds,
    visibleColumnIds,
    rowVisualIndex,
    colVisualIndex,
    enableEditing: editing.enabled,
    enableValidation: validation.enabled,
    enableCellSelection,
    enableClipboard,
    enableCopyColumn: opts.enableCopyColumn,
    enableCopyRow: opts.enableCopyRow,
    enableUndoRedo: !!opts.enableUndoRedo,
    enableFind: !!opts.enableFind,
    findCaseSensitive: !!findOpts?.caseSensitive,
    findScope: findOpts?.scope ?? 'view',
    enableExport: exp.enabled,
    enableCsvExport: exp.csv,
    enableExcelExport: exp.excel,
    enablePrint: exp.print,
    exportFileName: exp.fileName,
    exportScope: exp.scope,
    exportIncludeHeaders: exp.includeHeaders,
    policy: validation.policy,
    saveOn: editing.saveOn,
    batchEditing: editing.mode === 'batch',
    gridDisabled: !!opts.disabled,
    rowDisabled: opts.rowDisabled,
    cellDisabled: opts.cellDisabled,
    onDataChange: opts.onDataChange,
    onSave: opts.onSave,
    createRow: opts.createRow,
    tempIdPrefix: opts.tempIdPrefix ?? 'tmp_',
  }
  return { ctx, editingMode: editing.mode }
}

/**
 * The single entry point apps use. Wraps TanStack v9 `useTable`, resolves the
 * §12 `enable*` toggles, and (Phase 2) builds the Bst-Table runtime — cell-type
 * registry + editing + validation + row lifecycle — attaching it to the table so
 * `<BstTable/>` can render editors and error states. Backward compatible: a
 * zero-config call still returns a plain read-only-capable table.
 */
export function useBstTable<TData extends RowData>(opts: UseBstTableOptions<TData>) {
  const pag = opts.pagination ?? true
  const paginationEnabled = pag !== false
  const pageSize =
    typeof pag === 'object' ? (pag.pageSize ?? DEFAULT_PAGE_SIZE) : DEFAULT_PAGE_SIZE

  // Server mode (Plan.md §5) — pass through to v9 ONLY the manual/controlled
  // options the caller actually set. Passing `state`/`on*Change` as `undefined`
  // makes v9 treat state as controlled-but-unmanaged and freezes the grid, so we
  // omit them entirely in the default client mode. Usually from `useBstDataSource`.
  const serverOpts: Record<string, unknown> = {}
  {
    const s = opts as unknown as Record<string, unknown>
    for (const k of [
      'manualSorting',
      'manualFiltering',
      'manualPagination',
      'manualGrouping',
      'rowCount',
      'pageCount',
      'autoResetPageIndex',
      'state',
      'onSortingChange',
      'onColumnFiltersChange',
      'onGlobalFilterChange',
      'onPaginationChange',
      'onGroupingChange',
      'onExpandedChange',
    ]) {
      if (s[k] !== undefined) serverOpts[k] = s[k]
    }
  }

  // Effective columns: X27 auto-generate when none are supplied, then X9
  // prepend the row-number column. Memoized on the inputs that determine them so
  // a stable `columns`/`data` ref does not churn the table's column state.
  const columns = React.useMemo(() => {
    const base =
      opts.enableAutoColumns && (!opts.columns || opts.columns.length === 0)
        ? autoGenerateColumns(opts.data, opts.autoColumns)
        : opts.columns
    return opts.enableRowNumbers
      ? [makeRowNumberColumn(opts.rowNumberHeader), ...base]
      : base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.columns,
    opts.data,
    opts.enableAutoColumns,
    opts.enableRowNumbers,
    opts.rowNumberHeader,
    opts.autoColumns,
  ])

  // Seed state. The row-number column (X9) is pinned to the **start** so it stays
  // the leftmost data column — ahead of any user-pinned column — and sticks during
  // horizontal scroll. Injected here (not just in the column def) so it survives a
  // consumer-supplied `initialState`/`gridState` that sets its own column pinning.
  const initialState: Record<string, unknown> = {
    pagination: {
      pageIndex: 0,
      pageSize: paginationEnabled ? pageSize : Number.MAX_SAFE_INTEGER,
    },
    // v9 pinning state is { start, end } (renamed from v8 left/right) and its
    // logic reads these arrays directly, so they must exist even when the
    // feature is off (otherwise `.start.length` / `.includes` throws).
    columnPinning: { start: [], end: [] },
    columnOrder: [],
    expanded: {},
    rowPinning: { top: [], bottom: [] },
    grouping: [],
    ...opts.initialState,
  }
  if (opts.enableRowNumbers) {
    const cp = (initialState.columnPinning ?? { start: [], end: [] }) as {
      start?: string[]
      end?: string[]
    }
    const start = (cp.start ?? []).filter((id) => id !== ROW_NUMBER_COLUMN_ID)
    initialState.columnPinning = { start: [ROW_NUMBER_COLUMN_ID, ...start], end: cp.end ?? [] }
  }

  const table = useTable({
    features: bstTableFeatures,
    data: opts.data,
    columns,
    getRowId: opts.getRowId,
    globalFilterFn: 'includesString',
    enableSorting: opts.enableSorting ?? true,
    enableGlobalFilter: opts.enableGlobalFilter ?? true,
    enableColumnFilters: opts.enableColumnFilters ?? true,
    enableHiding: opts.enableHiding ?? true,
    enableColumnResizing: opts.enableColumnResizing ?? true,
    enableColumnPinning: opts.enableColumnPinning ?? false,
    enableRowSelection: opts.enableRowSelection ?? false,
    // Master-detail (A4): expansion is driven by whether a row "can expand".
    getRowCanExpand: opts.enableExpanding
      ? (row: any) => (opts.getRowCanExpand ? opts.getRowCanExpand(row.original) : true)
      : undefined,
    enableRowPinning: opts.enableRowPinning ?? false,
    enableGrouping: opts.enableGrouping ?? false,
    // Keep grouped columns in place (we render group rows over the existing
    // column layout rather than reordering/removing the grouped column).
    groupedColumnMode: false,
    columnResizeMode: 'onChange',
    // Default every column to the operator-aware condition filter (E3) so the
    // filter-builder's `{ op, value }` conditions work without per-column setup.
    // A column may still override `filterFn` in its def.
    defaultColumn: { filterFn: 'bstCondition' },
    ...(serverOpts as any),
    initialState,
  })

  // Registry: adapter preset if supplied, else the neutral engine defaults (stable).
  const defaultRegistryRef = React.useRef<CellTypeRegistry | null>(null)
  if (!defaultRegistryRef.current) defaultRegistryRef.current = createDefaultRegistry()
  const registry = opts.cellTypes ?? defaultRegistryRef.current

  const { ctx, editingMode } = buildCtx<TData>(table, opts, registry)

  // Runtime is created once (stable identity); its context is refreshed each render.
  const runtimeRef = React.useRef<BstRuntime<TData> | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createRuntime<TData>(ctx)
  else runtimeRef.current.updateCtx(ctx)

  const handle: BstRuntimeHandle<TData> = {
    runtime: runtimeRef.current,
    registry,
    editingMode,
    enableRowActions: !!opts.enableRowActions,
    enableRowSelection: !!opts.enableRowSelection,
    enableColumnPinning: !!opts.enableColumnPinning,
    enableColumnOrdering: !!opts.enableColumnOrdering,
    enableColumnFilterRow: !!opts.enableColumnFilterRow && (opts.enableColumnFilters ?? true),
    enableSetFilter: !!opts.enableSetFilter && (opts.enableColumnFilters ?? true),
    enableMultiFilter:
      !!opts.enableMultiFilter &&
      (opts.enableColumnFilters ?? true) &&
      !!opts.enableColumnFilterRow,
    enableCellSelection: ctx.enableCellSelection,
    // Type-to-edit is effective only with editing + cell selection both on.
    enableTypeToEdit: !!opts.enableTypeToEdit && !!ctx.enableEditing && ctx.enableCellSelection,
    enableClipboard: ctx.enableClipboard,
    enableUndoRedo: ctx.enableUndoRedo,
    enableEditing: !!ctx.enableEditing,
    enableCopyColumn: !!ctx.enableClipboard && ctx.enableCopyColumn !== false,
    enableCopyRow: !!ctx.enableClipboard && ctx.enableCopyRow !== false,
    userCellColumns: collectUserCellColumns(
      columns as unknown as ReadonlyArray<Record<string, unknown>>,
    ),
    classNames: opts.classNames,
    styles: opts.styles,
    enableCellSpanning: !!opts.enableCellSpanning,
    getCellSpan: opts.getCellSpan,
    enableExpanding: !!opts.enableExpanding,
    renderDetail: opts.renderDetail,
    enableRowPinning: !!opts.enableRowPinning,
    enableRowResize: !!opts.enableRowResize,
    enableAutoRowHeight: !!opts.enableAutoRowHeight,
    enableContextMenu: !!opts.enableContextMenu,
    getContextMenuItems: opts.getContextMenuItems,
    enableFind: !!ctx.enableFind,
    findCaseSensitive: !!ctx.findCaseSensitive,
    enableGrouping: !!opts.enableGrouping,
    conditionalFormats:
      opts.enableConditionalFormatting !== false ? opts.conditionalFormats : undefined,
    fitColumns: !!opts.fitColumns,
    enableResponsive: !!opts.enableResponsive,
    virtualization: resolveVirtualization(opts.enableVirtualization, opts.enableColumnVirtualization),
    stickyHeader: resolveStickyHeader(opts.enableStickyHeader),
    onReachEnd: opts.onReachEnd,
    endReachedThreshold: opts.endReachedThreshold,
    enableExport: !!ctx.enableExport,
    exportFormats: {
      csv: ctx.enableCsvExport !== false,
      excel: ctx.enableExcelExport !== false,
      print: ctx.enablePrint !== false,
    },
    enableRowNumbers: !!opts.enableRowNumbers,
    enableAutoColumns:
      !!opts.enableAutoColumns && (!opts.columns || opts.columns.length === 0),
    enableOverlays: opts.enableOverlays !== false,
    loading: opts.loading,
    error: opts.error,
    overlayText: opts.overlayText,
    renderLoadingOverlay: opts.renderLoadingOverlay,
    renderErrorOverlay: opts.renderErrorOverlay,
  }
  ;(table as unknown as Record<symbol, unknown>)[BST_RUNTIME] = handle

  return table
}

export type BstTableInstance<TData extends RowData> = ReturnType<typeof useBstTable<TData>>

/** Read the runtime handle a `useBstTable` render attached to the table. */
export function getBstRuntime<TData extends RowData>(
  table: unknown,
): BstRuntimeHandle<TData> {
  const handle = (table as Record<symbol, unknown>)[BST_RUNTIME] as
    | BstRuntimeHandle<TData>
    | undefined
  if (!handle) {
    throw new Error(
      'Bst-Table: runtime not attached. Render the table produced by useBstTable / useBstGrid.',
    )
  }
  return handle
}

/**
 * Convenience hook returning the table plus direct handles to the runtime and
 * registry — for adapter chrome that drives the grid (Add row, dirty state,
 * bulk save via `runtime.getDirtyChanges()`).
 */
export function useBstGrid<TData extends RowData>(opts: UseBstTableOptions<TData>) {
  const table = useBstTable<TData>(opts)
  const handle = getBstRuntime<TData>(table)
  return { table, runtime: handle.runtime, registry: handle.registry, handle }
}
