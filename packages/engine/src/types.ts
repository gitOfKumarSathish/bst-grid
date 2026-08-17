import type * as React from 'react'
import type { ColumnDef, RowData } from '@tanstack/react-table'
import type { BstTableFeatures } from './features.js'
import type { CellTypeRegistry } from './registry/registry.js'
import type { CellRenderProps } from './registry/types.js'
import type { BstCellSpan, BstSpanContext } from './spanning.js'
import type { BstFormatRule } from './formatting.js'
import type { VirtualizationOptions } from './virtualization.js'
import type { BstExportOptions } from './export.js'
import type { BstSaveEvent, CommitPolicy, SaveTrigger } from './runtime.js'

/** A Bst-Table column definition, pre-bound to the engine's feature set. */
export type BstTableColumn<TData extends RowData> = ColumnDef<BstTableFeatures, TData, any>

/** Options for the Editing feature (Phase 2). Passing an object implies enabled (§12). */
export interface EditingOptions {
  /**
   * `'cell'` = commit each cell; `'row'` = deferred row session (C2 ≡ I2);
   * `'batch'` = EVERY edit (typed or pasted) stays an unsaved draft until an
   * explicit save — the mode behind the review-changes sheet + single `onSave`
   * API call. Default `'cell'`.
   */
  mode?: 'cell' | 'row' | 'batch'
  /** When a committed value is saved. Default `['enter', 'blur']`. */
  saveOn?: SaveTrigger | SaveTrigger[]
  /** What happens when a commit is invalid. Default `'blockCommitOnError'`. */
  policy?: CommitPolicy
}

/** Options for the Validation feature (Phase 2). */
export interface ValidationOptions {
  policy?: CommitPolicy
}

/** Row context handed to the `row` class/style slot (K2 dynamic row styling). */
export interface BstRowContext<TData extends RowData = any> {
  row: TData
  rowId: string
  /** Visual (post sort/filter/paginate) row index. */
  index: number
}

/** Column context handed to the `headerCell` class/style slot. */
export interface BstHeaderSlotContext {
  columnId: string
}

/**
 * Consumer-owned class names for the grid's structural slots — the custom-CSS
 * hook (K1/K2). Static strings for fixed parts; `headerCell` / `row` / `cell`
 * also accept a function for per-item classes. Every slot **composes with**
 * (never replaces) the built-in `bst-*` classes, so themes keep working.
 * `root` targets the same element as the `<BstTable className>` prop (the scroll
 * wrapper). Slots map to: `root`→`.bst-table-scroll`, `table`→`<table>`,
 * `header`→`<thead>`, `headerRow`→header `<tr>`, `headerCell`→`<th>`,
 * `filterRow`→the per-column filter `<tr>`, `body`→`<tbody>`, `row`→body `<tr>`,
 * `cell`→body `<td>`, `empty`→the "No rows" `<td>`.
 */
export interface BstClassNames<TData extends RowData = any> {
  root?: string
  table?: string
  header?: string
  headerRow?: string
  headerCell?: string | ((ctx: BstHeaderSlotContext) => string | undefined)
  filterRow?: string
  body?: string
  row?: string | ((ctx: BstRowContext<TData>) => string | undefined)
  cell?: string | ((ctx: CellRenderProps<TData>) => string | undefined)
  empty?: string
}

/** Inline styles / CSS variables per structural slot — parallels {@link BstClassNames}. */
export interface BstStyles<TData extends RowData = any> {
  root?: React.CSSProperties
  table?: React.CSSProperties
  header?: React.CSSProperties
  headerRow?: React.CSSProperties
  headerCell?:
    | React.CSSProperties
    | ((ctx: BstHeaderSlotContext) => React.CSSProperties | undefined)
  filterRow?: React.CSSProperties
  body?: React.CSSProperties
  row?: React.CSSProperties | ((ctx: BstRowContext<TData>) => React.CSSProperties | undefined)
  cell?: React.CSSProperties | ((ctx: CellRenderProps<TData>) => React.CSSProperties | undefined)
  empty?: React.CSSProperties
}

/**
 * Engine-behaviour toggles (§12 `enable*` layer). OOTB data features default ON
 * (opt-out); heavy features (editing, validation) default OFF (opt-in).
 */
export interface BstTableEngineToggles {
  /** Column sorting. Maps to v9 `enableSorting`. Default: true. */
  enableSorting?: boolean
  /** Global search filtering behaviour. Maps to v9 `enableGlobalFilter`. Default: true. */
  enableGlobalFilter?: boolean
  /** Per-column filtering behaviour (drives the E3 filter builder). Maps to v9 `enableColumnFilters`. Default: true. */
  enableColumnFilters?: boolean
  /**
   * Set Filter (AG4) — an Excel-style **checklist of distinct values** per column,
   * rendered in the per-column filter row. When on, categorical columns
   * (`singleSelect` / `multiSelect` / `radio` / `boolean`) use the checklist; any
   * column can force it via `meta.filter: 'set'` or opt out via
   * `meta.filter: 'condition'`. Needs `enableColumnFilters` + the filter row
   * (`enableColumnFilterRow`) to be visible. Default: false.
   */
  enableSetFilter?: boolean
  /**
   * Multi-filter (AG11) — **stack several filter types on one column**. A column
   * opts in with `meta.filter` as an array (e.g. `['condition', 'set']`), which
   * renders the listed filters **stacked** in its filter row; a row must satisfy
   * **all** of them (AND). Needs `enableColumnFilters` + `enableColumnFilterRow`
   * (and `enableSetFilter` for a `'set'` part). Default: false.
   */
  enableMultiFilter?: boolean
  /** Column show/hide behaviour. Maps to v9 `enableHiding`. Default: true. */
  enableHiding?: boolean
  /** Column resizing. Maps to v9 `enableColumnResizing`. Default: true. */
  enableColumnResizing?: boolean
  /**
   * Fit-to-viewport layout (G3) — size columns to the container so there is **no
   * horizontal scroll**. The data columns share the available width in proportion
   * to their own sizes (utility columns stay fixed); manual column resizing is
   * suppressed while this is on. Default: false.
   */
  fitColumns?: boolean
  /**
   * Responsive column hiding (G4) — when the grid is too narrow to fit its
   * columns, hide the lowest-priority ones (per `meta.responsivePriority`, higher
   * = kept longer) until they fit; restore them as it widens. Only auto-hidden
   * columns are restored, so it never fights a manual hide. No-op under
   * `fitColumns`. Default: false.
   */
  enableResponsive?: boolean
  /** Column pinning (sticky left/right). Maps to v9 `enableColumnPinning`. Default: false. */
  enableColumnPinning?: boolean
  /**
   * Column reordering — the adapter column menu (move left/right) **and**
   * drag-to-reorder on the header (→ v9 `setColumnOrder`). Default: false.
   */
  enableColumnOrdering?: boolean
  /**
   * Render a per-column filter row under the header (the "dual filter" — works
   * alongside the filter-builder panel; both drive `columnFilters`). Each column
   * gets a type-appropriate control (text/number/date input, select dropdown,
   * boolean tri-state). Needs `enableColumnFilters`. Default: false.
   */
  enableColumnFilterRow?: boolean
  /** Pagination behaviour + initial page size. `false` shows all rows. Default: true. */
  pagination?: boolean | { pageSize?: number }
  /** Inline editing feature. `boolean | EditingOptions`. Default: false (opt-in). */
  enableEditing?: boolean | EditingOptions
  /** Validation feature. `boolean | ValidationOptions`. Default: false (opt-in). */
  enableValidation?: boolean | ValidationOptions
  /** Row add/delete/duplicate lifecycle. Default: false (opt-in). */
  enableRowActions?: boolean
  /**
   * Row selection (Phase 3) — a leading checkbox column with header "select all"
   * (indeterminate when partial) and per-row checkboxes. Maps to v9
   * `enableRowSelection`; state lives in `table.state.rowSelection`, keyed by
   * `getRowId`. Read it via `table.getSelectedRowModel()`. Default: false (opt-in).
   */
  enableRowSelection?: boolean
  /**
   * Cell / range selection + keyboard navigation (Phase 3). Click / Shift-click
   * to select a range; Arrow / Shift+Arrow / Tab / Home / End / Ctrl+A to move
   * the active cell; Enter / F2 to edit. Default: false (opt-in).
   */
  enableCellSelection?: boolean
  /**
   * Clipboard copy / paste (Phase 3, H1–H4). Copy the selection as TSV
   * (Ctrl/Cmd+C); paste TSV from the active cell (Ctrl/Cmd+V) honouring
   * editability + validation. Implies `enableCellSelection`; paste additionally
   * requires `enableEditing`. Default: false (opt-in).
   */
  enableClipboard?: boolean
  /**
   * Copy a whole **column** across all pages (H3) — the Ctrl/Cmd+Space gesture and
   * the Columns-menu "Copy column" button. A sub-toggle of clipboard; set `false`
   * to disable column-copy while keeping the rest of the clipboard. Default: true.
   */
  enableCopyColumn?: boolean
  /**
   * Copy a whole **row** (H2) — the Shift+Space gesture / `runtime.copyRow`. A
   * sub-toggle of clipboard; set `false` to disable row-copy. Default: true.
   */
  enableCopyRow?: boolean
  /**
   * Undo / redo of committed data changes (Phase 3, C5) — cell edits, paste,
   * and row add/delete/duplicate. Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or
   * Ctrl/Cmd+Y redoes; adapters also render Undo/Redo buttons. Snapshot-based,
   * so it needs `onDataChange`. Default: false (opt-in).
   */
  enableUndoRedo?: boolean
  /**
   * Conditional formatting (K3) — whether the `conditionalFormats` rules are
   * applied. The rules themselves stay on `conditionalFormats` (presence is the
   * developer opt-in); this flag lets the applied styling be switched off/on at
   * runtime — e.g. from the settings sheet — without dropping the rules.
   * Default: true.
   */
  enableConditionalFormatting?: boolean
  /**
   * Batch editing (runtime switch for `enableEditing.mode: 'batch'`). When set it
   * OVERRIDES the configured editing mode: `true` forces batch mode (every edit
   * stays an unsaved draft until the explicit Review & save), `false` forces a
   * batch-configured grid back to per-cell commits. Leave unset to follow
   * `enableEditing.mode`. Needs `enableEditing`; this is the flag the settings
   * sheet toggles ("Editing" group), so end-users can switch batch mode per table.
   */
  enableBatchEditing?: boolean
  /**
   * Row virtualization (D1) — render only the rows inside the scroll viewport
   * (plus overscan), so a 10k / 1M-row grid stays fast with a bounded DOM. Pass
   * `true`, or an object to tune it (`{ overscan, estimateRowSize, estimateColumnSize }`
   * — an object implies enabled, §12). Opt-in. Default false. The scroll box needs
   * a bounded height — one is applied by default and can be overridden via
   * `styles.root`. **Yields to** master-detail, grouping, cell spanning and row
   * pinning (the grid renders un-windowed when one of those is on). Built on
   * `@tanstack/react-virtual`.
   */
  enableVirtualization?: boolean | VirtualizationOptions
  /**
   * Column virtualization (D1) — also window the columns horizontally, for very
   * wide (100+ column) grids. Sub-toggle of `enableVirtualization` (needs it on).
   * Falls back to rendering all columns when column pinning, `fitColumns`, grouped
   * headers or cell spanning is active. Default false.
   */
  enableColumnVirtualization?: boolean
  /**
   * Export (Phase 5, AG1–AG3) — download the grid as **CSV** / **Excel** (`.xlsx`)
   * or open a **print** view. `true` enables all three; pass a
   * {@link BstExportOptions} object to choose formats and set the file name / row
   * scope (an object implies enabled, §12). Opt-in. Default false. Adapters render
   * an "Export" toolbar menu (`showExport`); drive it programmatically via
   * `runtime.exportCsv()` / `runtime.exportExcel()` / `runtime.printTable()`.
   * **Dependency-free** — the `.xlsx` is a hand-built OOXML package, no `exceljs`.
   */
  enableExport?: boolean | BstExportOptions
  /**
   * CSV export sub-toggle (AG1). `false` hides the CSV menu item and makes
   * `runtime.exportCsv()` a no-op, while keeping Excel/Print. Needs
   * `enableExport`. Default: true.
   */
  enableCsvExport?: boolean
  /**
   * Excel `.xlsx` export sub-toggle (AG2). `false` hides the Excel menu item and
   * makes `runtime.exportExcel()` a no-op. Needs `enableExport`. Default: true.
   */
  enableExcelExport?: boolean
  /**
   * Print sub-toggle (AG3). `false` hides the Print menu item and makes
   * `runtime.printTable()` a no-op. Needs `enableExport`. Default: true.
   */
  enablePrint?: boolean
  /**
   * Auto row height (AG26) — rows grow to fit **wrapped** content instead of
   * truncating each cell to one line; the browser measures the content, so no
   * JS measurement is needed. Every body cell wraps; opt individual columns in
   * (or out) with `meta.wrapText`. Composes with manual row resize (a resized row
   * keeps its explicit height and clips the wrapped content). Default: false.
   */
  enableAutoRowHeight?: boolean
  /**
   * Right-click context menu (AG6) — a menu at the cursor with default actions
   * (Copy · Copy row · Copy column while clipboard is on; Export CSV / Excel while
   * export is on; Autosize column) plus any items returned by `getContextMenuItems`.
   * If the resolved item list is empty the native browser menu is left alone.
   * Default: false.
   */
  enableContextMenu?: boolean
}

/** One entry in the right-click context menu (AG6). */
export interface BstContextMenuItem {
  /** Stable key (React list key). */
  key?: string
  /** Menu label. */
  label?: React.ReactNode
  /** Invoked when the item is chosen; the menu closes afterwards. */
  onSelect?: () => void
  /** Greyed out + non-interactive. */
  disabled?: boolean
  /** Render a divider instead of an item (`label` / `onSelect` ignored). */
  separator?: boolean
  /** Optional leading icon. */
  icon?: React.ReactNode
}

/** Context handed to `getContextMenuItems` — the right-clicked cell + the defaults. */
export interface BstContextMenuContext<TData extends RowData = any> {
  rowId: string
  columnId: string
  value: unknown
  row: TData | undefined
  /** The items Bst-Table would show by default — spread and extend them. */
  defaultItems: BstContextMenuItem[]
}

export interface UseBstTableOptions<TData extends RowData> extends BstTableEngineToggles {
  data: TData[]
  columns: BstTableColumn<TData>[]
  /** Stable row identity — required for editing/selection; strongly recommended always. */
  getRowId?: (row: TData, index: number) => string
  /** Extra initial state merged over engine defaults (sorting, filters, …). */
  initialState?: Record<string, unknown>

  // ---- Server mode (manual sort / filter / paginate — Plan.md §5). Usually
  // supplied by `useBstDataSource(source).tableProps`; the grid then renders the
  // page you hand it and its chrome drives the query via the `on*Change` hooks. ----
  /** Sort server-side — the grid renders `data` as-is (no client sort). */
  manualSorting?: boolean
  /** Filter server-side — the grid renders `data` as-is (no client filter). */
  manualFiltering?: boolean
  /** Paginate server-side — `data` is the current page; set `rowCount`. */
  manualPagination?: boolean
  /** Group server-side. */
  manualGrouping?: boolean
  /** Total rows across all pages (server mode) — drives the page count. */
  rowCount?: number
  /** Explicit page count (alternative to `rowCount`). */
  pageCount?: number
  /** Disable TanStack's automatic page-index reset (server mode manages it). */
  autoResetPageIndex?: boolean
  /** Controlled table state (partial) — `{ sorting, columnFilters, globalFilter, pagination }`. */
  state?: Record<string, unknown>
  /** Controlled-state change callbacks (server mode). Each receives a TanStack updater. */
  onSortingChange?: (updater: any) => void
  onColumnFiltersChange?: (updater: any) => void
  onGlobalFilterChange?: (updater: any) => void
  onPaginationChange?: (updater: any) => void
  onGroupingChange?: (updater: any) => void
  onExpandedChange?: (updater: any) => void
  /**
   * Cell-type registry (Plan.md §2.3). Adapters supply one via their preset
   * (`createMuiPreset` / `createShadcnPreset`). Falls back to the engine's
   * neutral default renderers when omitted.
   */
  cellTypes?: CellTypeRegistry
  /**
   * Controlled-data write-back. Called with the next `data` array whenever an
   * edit commits or a row is added/deleted/duplicated. Writes target rows by
   * `rowId`, never by index (Plan.md §2.5 rule for editing).
   */
  onDataChange?: (next: TData[]) => void
  /**
   * Batched save hook (I2/I4) — called **once per save action** (`commitAll`,
   * `commitRowSession`, the review sheet's confirm) with the full change set:
   * flat cell edits (old → new), per-row groups with a ready `patch` body, and
   * the next data array. Make ONE backend request from it — never per cell/row/
   * column. `await`ed: throwing/rejecting **aborts the save and keeps every
   * draft**, so a failed API call loses nothing and the user can retry. Pairs
   * with `enableEditing: { mode: 'batch' }`, where every edit defers until the
   * explicit save.
   */
  onSave?: (event: BstSaveEvent<TData>) => void | Promise<void>
  /** Factory for a blank row (row add). A temp id is assigned if none is set. */
  createRow?: () => Partial<TData>
  /** Prefix for generated temp ids on created/duplicated rows. Default `'tmp_'`. */
  tempIdPrefix?: string
  /** F1 — disable interaction for the whole grid. */
  disabled?: boolean
  /** F2 — disable interaction per row. */
  rowDisabled?: (row: TData) => boolean
  /**
   * F4 — disable interaction per cell (grid-level, cross-cutting predicate).
   * Complements per-column `meta.disabled`; either disabling wins. Runs only for
   * cells whose row is present.
   */
  cellDisabled?: (ctx: { row: TData; rowId: string; columnId: string }) => boolean
  /**
   * Cell spanning (A5) — merge body cells across columns and/or rows. Opt-in.
   * Default false. Declare spans via `meta.rowSpan: 'group'` (auto-merge equal
   * values in a column) and/or the `getCellSpan` callback below.
   */
  enableCellSpanning?: boolean
  /**
   * Per-cell span for column/row merging (needs `enableCellSpanning`). Return
   * `{ colSpan?, rowSpan? }` for the **top-left origin** of a merged block; the
   * cells it covers are skipped automatically. Runs for every visible cell, so
   * keep it cheap. For simple vertical merging of equal values, prefer
   * `meta.rowSpan: 'group'`.
   */
  getCellSpan?: (ctx: BstSpanContext<TData>) => BstCellSpan | undefined
  /**
   * Master-detail (A4) — a leading expander column; clicking it reveals a detail
   * panel row rendered by `renderDetail`. Opt-in. Default false. Built on v9's
   * `rowExpandingFeature`.
   */
  enableExpanding?: boolean
  /** Which rows can expand (needs `enableExpanding`). Default: all rows. */
  getRowCanExpand?: (row: TData) => boolean
  /**
   * Renders the detail panel shown under an expanded row (needs
   * `enableExpanding`) — a full-width row spanning every column. Return `null`
   * to render nothing for a given row.
   */
  renderDetail?: (row: TData) => React.ReactNode
  /**
   * Build the right-click context menu (AG6, needs `enableContextMenu`). Receives
   * the clicked cell plus `defaultItems` (Copy / Export / …); return the final
   * list — spread `defaultItems` to keep them, prepend/append your own, or return
   * a fresh array. Omit to show the defaults.
   */
  getContextMenuItems?: (ctx: BstContextMenuContext<TData>) => BstContextMenuItem[]
  /**
   * Row pinning (G1) — freeze rows to the top/bottom of the grid via a leading
   * pin column; pinned rows stay put across sort/filter/pagination and stick
   * while the body scrolls. Opt-in. Default false. Maps to v9 `enableRowPinning`.
   */
  enableRowPinning?: boolean
  /**
   * Row resizing (G2) — drag the bottom edge of any row to set its height; the
   * whole row's cells grow/shrink and content is clipped when shorter. Per-row
   * heights are local UI state (double-click a row's handle to reset it). Opt-in.
   * Default false. Column resize is separate (`enableColumnResizing`).
   */
  enableRowResize?: boolean
  /**
   * Multi-column grouping (E4) — group rows by one or more columns, with
   * collapsible group headers and per-column aggregates. Opt-in. Default false.
   * Set which columns to group via `initialState.grouping` (or `table.setGrouping`);
   * a column aggregates by declaring `aggregationFn` (`'sum' | 'count' | 'mean' |
   * 'min' | 'max' | 'extent' | 'uniqueCount'`). Maps to v9 `enableGrouping` +
   * `columnGroupingFeature`.
   */
  enableGrouping?: boolean
  /**
   * Conditional formatting (K3) — declarative rules that map a condition to a
   * cell/row class + style (or blank the cell for F5). Reuses the E3 operators;
   * build the rules with `<BstConditionalFormatBuilder>`. Composes with the
   * `classNames`/`styles` slots and `meta.cellStyle`. Applied only while
   * `enableConditionalFormatting` (default true) is on — the runtime off-switch.
   */
  conditionalFormats?: BstFormatRule<TData>[]
  /**
   * Custom CSS hooks — extra class names per structural slot (root, table,
   * header, headerRow, headerCell, filterRow, body, row, cell, empty). Static
   * strings, or a function for `headerCell` / `row` / `cell`. They compose with
   * the built-in classes, so consumers can style the grid with their own CSS
   * without forking the renderer (K1/K2).
   */
  classNames?: BstClassNames<TData>
  /** Inline styles / CSS variables per structural slot (parallels `classNames`). */
  styles?: BstStyles<TData>
  /**
   * Fired once when the user scrolls near the end of the (row-virtualized) body —
   * the hook for A2 infinite scroll / fetch-on-scroll. Wire it to
   * `useBstInfiniteDataSource(...).fetchNextPage`. No-op unless
   * `enableVirtualization` is on (it needs the row virtualizer to know the end is
   * near). Debounced against repeat fires for the same tail.
   */
  onReachEnd?: () => void
  /** How many rows from the end trigger `onReachEnd`. Default 8. */
  endReachedThreshold?: number
}
