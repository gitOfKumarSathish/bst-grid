/**
 * Flag-dependency rules for `bst_validate_config`.
 *
 * This is the ONE part of the corpus that cannot be extracted from source: the
 * relationships between flags live in prose ("implies `enableCellSelection`;
 * paste additionally requires `enableEditing`") scattered across TSDoc, §12
 * notes and README sections.
 *
 * So it gets the same guard the codebase already uses for the settings sheet:
 * `rules.test.ts` asserts every `toggle`-kind flag in the corpus has an entry
 * here — **adding a Bst-Table toggle fails the build until a rule is
 * registered**, exactly as `engine/src/settings.ts` fails to compile until a new
 * toggle is registered in `SETTINGS_META` (CLAUDE.md §12 "settings-sheet parity").
 * An empty `{}` is a legitimate entry meaning "no dependencies".
 */

/** What one flag needs, implies, or conflicts with. */
export interface FlagRule {
  /** Flags that must be ON for this one to have any effect. */
  requires?: string[]
  /** Flags this one turns on implicitly — worth stating, never an error. */
  implies?: string[]
  /** Non-boolean options/callbacks without which the feature can't work. */
  needsOptions?: Array<{ name: string; why: string }>
  /** Flags that make this one inert, or that this one disables. */
  conflictsWith?: Array<{ flag: string; why: string }>
  /** Anything else an agent should know when switching this on. */
  note?: string
}

/**
 * Chrome (`show*`) flags are no-ops when their behaviour (`enable*`) flag is off
 * — CLAUDE.md §12 "Chrome follows behaviour: a `show*` flag is a no-op when its
 * underlying `enable*` is off. Chrome never implies behaviour."
 */
export const RULES: Record<string, FlagRule> = {
  // ---- Data operations ----
  enableSorting: {},
  enableGlobalFilter: {},
  enableColumnFilters: {},
  pagination: {},
  enableGrouping: {
    note: 'Set which columns to group via `initialState.grouping` (or `table.setGrouping`); a column aggregates by declaring `aggregationFn`.',
  },

  // ---- Columns ----
  enableHiding: {},
  enableColumnResizing: {
    conflictsWith: [{ flag: 'fitColumns', why: 'manual column resizing is suppressed while `fitColumns` is on' }],
  },
  enableColumnPinning: {},
  enableColumnOrdering: {},
  enableColumnFilterRow: {
    requires: ['enableColumnFilters'],
  },
  fitColumns: {
    conflictsWith: [
      { flag: 'enableColumnResizing', why: '`fitColumns` suppresses the resizers' },
      { flag: 'enableResponsive', why: 'responsive hiding is a no-op under `fitColumns`' },
    ],
  },
  enableResponsive: {
    needsOptions: [
      { name: 'meta.responsivePriority', why: 'columns without a priority are hidden in arbitrary order' },
    ],
    conflictsWith: [{ flag: 'fitColumns', why: 'responsive hiding is a no-op under `fitColumns`' }],
  },

  // ---- Rows ----
  enableExpanding: {
    needsOptions: [{ name: 'renderDetail', why: 'without it an expanded row shows an empty detail panel' }],
    note: 'Optionally narrow which rows expand with `getRowCanExpand`.',
  },
  enableRowPinning: {},
  enableRowResize: {},
  enableRowSelection: {
    needsOptions: [{ name: 'getRowId', why: 'selection state is keyed by row id; without it selection breaks on re-sort' }],
    note: 'Read the selection with `table.getSelectedRowModel()`.',
  },
  enableRowActions: {
    needsOptions: [{ name: 'onDataChange', why: 'add/delete/duplicate must write back to your data' }],
    note: 'Supply `createRow` to control the shape of a newly added row.',
  },

  // ---- Editing ----
  enableEditing: {
    needsOptions: [
      { name: 'getRowId', why: 'edits target rows by id, never by index' },
      { name: 'onDataChange', why: 'without it committed edits have nowhere to go' },
    ],
    note: "Modes: 'cell' (default, commit per cell) · 'row' (deferred row session) · 'batch' (every edit stays a draft until an explicit save).",
  },
  enableValidation: {
    requires: ['enableEditing'],
    note: "Policy `'blockCommitOnError'` (default) refuses an invalid commit; `'commitButFlag'` accepts and marks it.",
  },
  enableBatchEditing: {
    requires: ['enableEditing'],
    needsOptions: [
      { name: 'onSave', why: 'batch mode defers every edit to one explicit save; without `onSave` nothing is persisted' },
    ],
    note: 'Overrides `enableEditing.mode` at runtime. `onSave` fires ONCE per save action with the whole change set — make one backend request from it, never one per cell.',
  },
  enableUndoRedo: {
    needsOptions: [{ name: 'onDataChange', why: 'undo/redo is snapshot-based and replays through your data setter' }],
  },
  enableConditionalFormatting: {
    needsOptions: [{ name: 'conditionalFormats', why: 'the flag gates rules; with no rules it has nothing to apply' }],
    note: 'Defaults to ON — it is the runtime off-switch for rules already passed, not the opt-in.',
  },

  // ---- Selection & clipboard ----
  enableCellSelection: {},
  enableClipboard: {
    implies: ['enableCellSelection'],
    note: 'Copy works read-only; PASTE additionally requires `enableEditing`.',
  },
  enableCopyColumn: {
    requires: ['enableClipboard'],
    note: 'Defaults to ON — set false to disable Ctrl/⌘+Space column copy while keeping the rest of the clipboard.',
  },
  enableCopyRow: {
    requires: ['enableClipboard'],
    note: 'Defaults to ON — set false to disable Shift+Space row copy while keeping the rest of the clipboard.',
  },

  // ---- Display / render ----
  enableCellSpanning: {
    needsOptions: [
      { name: 'getCellSpan or meta.rowSpan', why: 'spanning is opt-in per cell; without either nothing merges' },
    ],
  },

  // ---- Performance (D1 — row/column virtualization) ----
  enableVirtualization: {
    conflictsWith: [
      { flag: 'enableExpanding', why: 'the grid renders un-windowed (yields) while master-detail is on' },
      { flag: 'enableGrouping', why: 'the grid renders un-windowed (yields) while grouping is on' },
      { flag: 'enableCellSpanning', why: 'the grid renders un-windowed (yields) while cell spanning is on' },
      { flag: 'enableRowPinning', why: 'the grid renders un-windowed (yields) while row pinning is on' },
    ],
    note: "Paints only the visible rows for large datasets. Object form tunes `overscan` / `estimateRowSize` / `estimateColumnSize`. Needs a bounded scroll-box height (applied by default; override via `styles.root`).",
  },
  enableColumnVirtualization: {
    requires: ['enableVirtualization'],
    note: 'Also windows columns horizontally, for very wide grids. Falls back to all-columns under column pinning, `fitColumns`, grouped headers or cell spanning.',
  },

  // ---- Adapter chrome (§12: chrome follows behaviour) ----
  showToolbar: { note: 'The container for search, menus and buttons — turning it off hides all toolbar chrome.' },
  showSearch: { requires: ['enableGlobalFilter'] },
  showFilterBuilder: { requires: ['enableColumnFilters'] },
  showFormatBuilder: { requires: ['enableConditionalFormatting'] },
  showColumnsMenu: { requires: ['enableHiding'] },
  showPagination: { requires: ['pagination'] },
  showAddRow: { requires: ['enableRowActions'] },
  showSaveBar: { requires: ['enableEditing'] },
  showChangesSheet: {
    requires: ['enableEditing'],
    note: 'Replaces the plain save bar; follows `enableEditing.mode: "batch"`.',
  },
  showSelectionInfo: { requires: ['enableRowSelection'] },
  showUndoRedo: { requires: ['enableUndoRedo'] },
  showColumnEditToggle: { requires: ['enableEditing'] },
  showDensityToggle: {},
  showSettings: {
    note: 'Renders a gear → a sheet where END-USERS flip this grid\'s features on/off at runtime, persisted to localStorage.',
  },
}

/** Non-boolean options that are inert unless a flag is on. */
export const OPTION_REQUIRES: Record<string, { flag: string; why: string }> = {
  renderDetail: { flag: 'enableExpanding', why: 'the detail panel only renders for expandable rows' },
  getRowCanExpand: { flag: 'enableExpanding', why: 'expansion must be enabled first' },
  getCellSpan: { flag: 'enableCellSpanning', why: 'spans are only read when spanning is on' },
  conditionalFormats: { flag: 'enableConditionalFormatting', why: 'rules are gated by the flag (which defaults to on)' },
  onSave: { flag: 'enableEditing', why: 'the save hook only fires from an editing session' },
  createRow: { flag: 'enableRowActions', why: 'the row factory is only used by row add' },
  pageSizeOptions: { flag: 'pagination', why: 'page sizes are meaningless without pagination' },
  changesRowLabel: { flag: 'enableEditing', why: 'labels rows in the review-changes sheet' },
}

/** Server-mode options that only make sense together. */
export const SERVER_MODE_RULES: Array<{ when: string; needs: string[]; why: string }> = [
  {
    when: 'manualPagination',
    needs: ['rowCount', 'pageCount'],
    why: 'the grid cannot compute a page count from a single page of data',
  },
]

/**
 * Capabilities an agent is most likely to assume exist. Each maps to its
 * COVERAGE.md leaf so the validator can answer with the real status and the
 * documented workaround instead of a flat refusal.
 */
// Patterns deliberately omit leading `\b`: the giveaway usually arrives inside a
// camelCase prop an agent invented (`onWebSocketUpdate`, `enableLiveUpdates`),
// where a word boundary would never match.
//
// NOTE: virtualization (D1, `enableVirtualization` / `enableColumnVirtualization`)
// and infinite scroll (A2, `useBstInfiniteDataSource` + `onReachEnd`) are NOT here —
// both are built. Virtualization's rules live in the RULES table above; infinite
// scroll is a hook (no toggle), documented in the DataSource guide.
export const NOT_BUILT: Array<{ match: RegExp; requirement: string; instead: string }> = [
  {
    match: /websocket|live[\s_-]*(merge|update)/i,
    requirement: 'I5',
    instead:
      'Live/WebSocket merge is NOT built. Push external updates by replacing the `data` prop; there is no conflict policy against in-flight edits yet.',
  },
  {
    match: /pdf[\s_-]*thumbnail/i,
    requirement: 'B5',
    instead:
      'In-cell PDF *thumbnails* are NOT built (they need pdf.js). PDF *preview* IS built — click a file cell to open it in the native browser PDF viewer (`BstFilePreview`); the cell shows image thumbnails and a file-type icon fallback. Upload/delete via `cellMeta.onUpload`/`onDelete` or the `DataSource` file verbs is also built (I3).',
  },
]
