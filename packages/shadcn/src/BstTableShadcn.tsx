import * as React from 'react'
import {
  useBstGrid,
  useBstSettings,
  filterSettingsGroups,
  shouldShowSettingsSearch,
  useToolbarOverflow,
  useBstGridState,
  loadGridState,
  BstTable,
  BstFilterBuilder,
  BstConditionalFormatBuilder,
  BstShortcuts,
  useStoreSelector,
} from '@bloomskill/table-engine'
import type {
  UseBstTableOptions,
  BstSettingsOptions,
  BstCellEdit,
  BstFormatRule,
  BstFormatBuilderColumn,
  BstGridStateOptions,
  BstTableInstance,
} from '@bloomskill/table-engine'
import type { RowData } from '@tanstack/react-table'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { createShadcnPreset } from './celltypes.js'
import { resolveIcons } from './icons/default.js'
import type { BstShadcnIconOverrides } from './icons/types.js'

export interface BstTableShadcnProps<TData extends RowData> extends UseBstTableOptions<TData> {
  title?: string
  /**
   * Palette source. `'zinc'` (default) uses the self-contained shadcn "zinc"
   * tokens (no Tailwind build needed). `'inherit'` re-points every token at the
   * host shadcn CSS variables (`--background`/`--foreground`/`--card`/`--muted`/
   * `--border`/`--input`/`--ring`/`--primary`/`--radius`) and the host font, so
   * the grid matches a shadcn app's theme automatically.
   */
  theme?: 'zinc' | 'inherit'
  /**
   * Token format the host uses when `theme="inherit"`. `'hsl'` (default) = classic
   * HSL channels (`hsl(var(--background))`, the shadcn CLI default). `'oklch'` =
   * full-color tokens (`var(--background)`; Tailwind v4 / newer shadcn; also rgb/hex).
   */
  tokenFormat?: 'hsl' | 'oklch'
  /**
   * Dark palette control (ignored when `theme="inherit"`, where the host's `.dark`
   * class flips the inherited tokens). `true`/`false` forces it; omitted follows an
   * ancestor `.dark` / `[data-theme="dark"]` class (next-themes / shadcn convention).
   */
  dark?: boolean
  /**
   * Icon overrides. Any subset; unspecified slots use the built-in lucide-styled
   * SVGs. Ready-made presets:
   * `@bloomskill/table-shadcn/icons/{lucide,tabler,hugeicons,phosphor,remix}`.
   */
  icons?: BstShadcnIconOverrides
  /** Chrome toggles (§12 `show*` layer). Each defaults to true. */
  showToolbar?: boolean
  showSearch?: boolean
  showColumnsMenu?: boolean
  showPagination?: boolean
  /** Add-row button (requires `enableRowActions`). Default: follows enableRowActions. */
  showAddRow?: boolean
  /** Save/Discard bar shown when there are dirty edits (requires `enableEditing`). */
  showSaveBar?: boolean
  /**
   * "Review & save" flow: an "{n} unsaved" badge + button opening a right-hand
   * sheet that lists every unsaved edit (row · column · previous → new value)
   * with per-change / per-row revert, and holds the final **Save** confirmation
   * — ONE `onSave` call for the whole batch, never per cell. While on, it
   * replaces the plain save bar. Default: on when
   * `enableEditing={{ mode: 'batch' }}`, else off.
   */
  showChangesSheet?: boolean
  /** Labels a row in the changes sheet. Default: `Row {rowId}`. */
  changesRowLabel?: (row: TData | undefined, rowId: string) => React.ReactNode
  /** "{n} selected" chip + Clear (requires `enableRowSelection`). Default: follows it. */
  showSelectionInfo?: boolean
  /** Undo/Redo buttons (requires `enableUndoRedo`). Default: follows it. */
  showUndoRedo?: boolean
  /** Row-height density toggle button (compact / normal / comfortable). Default: false. */
  showDensityToggle?: boolean
  /**
   * Export menu (CSV / Excel / Print) in the toolbar (AG1–AG3). Requires
   * `enableExport`; items follow the per-format sub-toggles (`enableCsvExport` /
   * `enableExcelExport` / `enablePrint`). Default: follows `enableExport`.
   */
  showExport?: boolean
  /**
   * Status bar footer (AG5) — total / filtered row count, and, when a cell range
   * is selected, the sum / avg / min / max / count of its numeric cells. Default:
   * false.
   */
  showStatusBar?: boolean
  /** Filter-builder button + panel (E3). Requires `enableColumnFilters`. Default: false. */
  showFilterBuilder?: boolean
  /**
   * Conditional-format builder button + panel (K3) — a toolbar "Formats" button
   * that opens/closes a panel hosting `<BstConditionalFormatBuilder>`, so
   * end-users create / edit / delete `conditionalFormats` rules at runtime.
   * Uncontrolled by default (edits are local UI state seeded from
   * `conditionalFormats`); pass `onConditionalFormatsChange` to own the rules.
   * Requires `enableConditionalFormatting` (default on). Default: false.
   */
  showFormatBuilder?: boolean
  /** Controlled-mode callback for rule edits made in the format builder. */
  onConditionalFormatsChange?: (rules: BstFormatRule<TData>[]) => void
  /**
   * Per-column **edit lock/unlock** toggle in the Columns menu (requires
   * `enableEditing`). Lets an end-user make an editable column read-only (or back)
   * at runtime — `runtime.setColumnEditable`. Default: false (opt-in).
   */
  showColumnEditToggle?: boolean
  /**
   * Settings gear → a right-side sheet where the end-user toggles this grid's
   * features at runtime — **per table**, persisted to `localStorage`. `true`, or a
   * `BstSettingsOptions` object (`features` / `title` / `persistKey` / `persist`).
   * Default: false (opt-in). Only features the developer has provisioned appear;
   * e.g. disabling "Copy & paste" here turns off clipboard.
   */
  showSettings?: boolean | BstSettingsOptions
  /** Keyboard-shortcuts help button (⌨) + overlay; also opens on `?`. Lists only
   * the shortcuts active on this grid. `boolean`, or `{ platform }` to force
   * ⌘/Ctrl key rendering (default auto-detects). Default: false (opt-in). */
  showShortcuts?: boolean | { platform?: 'mac' | 'pc' | 'auto' }
  /**
   * Grid-state save/restore (AG21). Pass `{ key }` to persist this grid's **view**
   * — sort · filter · column order/size/visibility/pinning · grouping · … — to
   * `localStorage` and restore it on the next mount. One prop does both: it seeds
   * `initialState` from the stored snapshot (unless you passed your own) and writes
   * changes back (debounced). Accepts the full `BstGridStateOptions`. Distinct from
   * `showSettings`, which toggles *features*.
   */
  gridState?: BstGridStateOptions
  /** Page-size choices in the pagination bar. Default: [5, 10, 20, 50]. */
  pageSizeOptions?: number[]
  /** Custom class name on the outer card (the whole component). Fine-grained
   * slots go on `classNames` (forwarded to the grid body). */
  className?: string
  /** Inline style on the outer card. */
  style?: React.CSSProperties
}

/**
 * shadcn/Radix style adapter. Same engine + <BstTable/> body; only the chrome +
 * editor preset differ. Every piece of chrome is a §12 `show*` toggle and
 * no-ops when its underlying `enable*` behaviour is off. Import
 * "@bloomskill/table-shadcn/styles.css".
 */
/**
 * Minimal focus trap for the dependency-free slide-over sheets (#20). While
 * `active`, it moves focus into the sheet, cycles Tab within it, and on close
 * restores focus to whatever held it before. (Escape-to-close is wired
 * separately; MUI's Drawer does all of this natively, so only the shadcn skin
 * needs it.) Returns a ref to attach to the sheet's container.
 */
function useFocusTrap(active: boolean) {
  const ref = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    const node = ref.current
    if (!active || !node) return
    const previous = document.activeElement as HTMLElement | null
    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      )
    ;(focusable()[0] ?? node).focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const el = document.activeElement
      if (e.shiftKey && (el === first || !node.contains(el))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (el === last || !node.contains(el))) {
        e.preventDefault()
        first.focus()
      }
    }
    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [active])
  return ref
}

/**
 * Null-rendering child that wires grid-state persistence (AG21) via the engine
 * hook — rendered only when `gridState` is set, so other grids pay nothing.
 */
function GridStatePersist<TData extends RowData>({
  table,
  options,
}: {
  table: BstTableInstance<TData>
  options: BstGridStateOptions
}) {
  useBstGridState(table, options)
  return null
}

export function BstTableShadcn<TData extends RowData>(props: BstTableShadcnProps<TData>) {
  // Runtime settings sheet: overrides applied to `props` up front so every §12
  // `enable*`/`show*` toggle downstream reflects the user's choices (§12 chrome).
  const settingsOptions =
    typeof props.showSettings === 'object' ? props.showSettings : undefined
  const settingsEnabled = props.showSettings != null && props.showSettings !== false
  const { props: eff, model: settings } = useBstSettings<BstTableShadcnProps<TData>>(
    props,
    settingsOptions,
  )
  const {
    title,
    theme = 'zinc',
    tokenFormat = 'hsl',
    dark,
    icons,
    showToolbar = true,
    showSearch = true,
    showColumnsMenu = true,
    showPagination,
    showAddRow,
    showSaveBar,
    showChangesSheet,
    changesRowLabel,
    showSelectionInfo,
    showUndoRedo,
    showDensityToggle,
    showExport,
    showStatusBar,
    showFilterBuilder,
    showFormatBuilder,
    onConditionalFormatsChange,
    showColumnEditToggle,
    showSettings: _showSettings,
    showShortcuts,
    gridState,
    pageSizeOptions = [5, 10, 20, 50],
    className,
    style,
    cellTypes,
    ...rest
  } = eff

  // Runtime conditional-format rules (K3 builder chrome). Uncontrolled: edits
  // live here, seeded from the `conditionalFormats` prop; controlled (callback
  // given): the prop stays the source of truth.
  const [localFormats, setLocalFormats] = React.useState<BstFormatRule<TData>[] | null>(null)
  const effectiveFormats = onConditionalFormatsChange
    ? rest.conditionalFormats
    : localFormats ?? rest.conditionalFormats
  const formatRules = effectiveFormats ?? []
  const handleFormatsChange = (next: BstFormatRule<TData>[]) => {
    if (!onConditionalFormatsChange) setLocalFormats(next)
    onConditionalFormatsChange?.(next)
  }

  const preset = React.useMemo(() => cellTypes ?? createShadcnPreset(), [cellTypes])
  // Grid-state restore (AG21): seed initialState from the stored snapshot once
  // (mount-only), unless the caller passed their own. Save-on-change is the child.
  const restoredInitialState = React.useMemo(
    () => rest.initialState ?? (gridState ? loadGridState(gridState.key, gridState.storage) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const gridOpts = {
    ...rest,
    initialState: restoredInitialState,
    cellTypes: preset,
    conditionalFormats: effectiveFormats,
  } as UseBstTableOptions<TData>
  const { table, runtime, handle } = useBstGrid<TData>(gridOpts)
  const I = React.useMemo(() => resolveIcons(icons), [icons])
  // Forward the resolved chrome icons into the engine body for the overlapping
  // slots, so the whole grid uses one icon set. Sort arrows + file-type icons
  // have no chrome equivalent and keep the engine's (lucide-styled) defaults.
  const bodyIcons = React.useMemo(
    () => ({
      pin: I.pin,
      booleanTrue: I.check,
      remove: I.close,
      expandExpanded: I.chevronDown,
      expandCollapsed: I.chevronRight,
    }),
    [I],
  )

  // Theme mode → outer classes shared by the card AND the portaled Radix menu.
  // inherit: host shadcn tokens (dark/light is the host's `.dark`). zinc: forced
  // via `dark` (sc-dark/sc-light) else follows an ancestor `.dark` in CSS.
  const themeInherit = theme === 'inherit'
  const themeClass =
    (themeInherit ? ' sc-inherit' + (tokenFormat === 'oklch' ? ' sc-fmt-color' : '') : '') +
    (themeInherit ? '' : dark === true ? ' sc-dark' : dark === false ? ' sc-light' : '')
  const menuClass = 'sc-menu' + themeClass

  const dirtyCount = useStoreSelector(runtime.store, (s) => Object.keys(s.dirtyCells).length)
  // Draft object identity — re-renders the changes sheet when a draft VALUE
  // changes even though the dirty count stays the same.
  const drafts = useStoreSelector(runtime.store, (s) => s.drafts)
  void drafts
  const canUndo = useStoreSelector(runtime.store, (s) => s.undoDepth > 0)
  const canRedo = useStoreSelector(runtime.store, (s) => s.redoDepth > 0)
  // Re-render the status bar when the selection changes (stats read on render).
  const selKey = useStoreSelector(runtime.store, (s) =>
    s.activeCell && s.anchorCell
      ? `${s.activeCell.rowId}|${s.activeCell.columnId}|${s.anchorCell.rowId}|${s.anchorCell.columnId}|${s.wholeSelect?.id ?? ''}`
      : '',
  )
  void selKey
  // Subscribe to the per-column edit overrides so the menu toggle reflects them live.
  const columnEdit = useStoreSelector(runtime.store, (s) => s.columnEdit)
  // A column is edit-capable (gets the toggle) when it declares `meta.editable`.
  const colIsEditable = (col: any): boolean =>
    col.columnDef.meta?.type !== 'action' && !!col.columnDef.meta?.editable
  // Its current allowed state: the runtime override, else the static default.
  const colEditAllowed = (col: any): boolean =>
    columnEdit[col.id as string] ??
    (typeof col.columnDef.meta?.editable === 'function'
      ? true
      : !!col.columnDef.meta?.editable)
  const [density, setDensity] = React.useState<'compact' | 'normal' | 'comfortable'>('normal')
  const cycleDensity = () =>
    setDensity((d) => (d === 'normal' ? 'compact' : d === 'compact' ? 'comfortable' : 'normal'))
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsQuery, setSettingsQuery] = React.useState('')
  // Clear the search whenever the sheet closes (covers every close path: overlay,
  // close button, Escape) so it reopens fresh.
  React.useEffect(() => {
    if (!settingsOpen) setSettingsQuery('')
  }, [settingsOpen])
  const [changesOpen, setChangesOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState(false)

  // Escape closes the settings / changes sheet (MUI's Drawer does this natively;
  // the dependency-free sheet wires it here).
  React.useEffect(() => {
    if (!settingsOpen && !changesOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false)
        setChangesOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [settingsOpen, changesOpen])

  // Nothing left to review (saved / discarded / all reverted) → close the sheet.
  React.useEffect(() => {
    if (dirtyCount === 0) setChangesOpen(false)
  }, [dirtyCount])

  const searchOn = showSearch && (rest.enableGlobalFilter ?? true)
  const hidingOn = rest.enableHiding ?? true
  // The Columns menu also hosts pin / reorder / group / copy controls, so it must
  // stay available whenever ANY of those is on — not only when column hiding is
  // enabled. Otherwise turning hiding off strands an already-pinned/grouped grid
  // with no UI to undo it (#16).
  const colsMenuOn =
    showColumnsMenu &&
    (hidingOn ||
      !!rest.enableColumnPinning ||
      !!rest.enableColumnOrdering ||
      !!rest.enableGrouping)
  const editingOn = !!rest.enableEditing
  const rowActionsOn = !!rest.enableRowActions
  const rowSelectionOn = !!rest.enableRowSelection
  const selectedCount = table.getSelectedRowModel().rows.length
  const addRowOn = (showAddRow ?? rowActionsOn) && rowActionsOn
  // Review-changes sheet: default on in batch editing mode (where every edit
  // defers until the confirm), opt-in elsewhere. While on it replaces the plain
  // save bar — the final confirmation lives in the sheet.
  const batchEditing =
    rest.enableBatchEditing ??
    (typeof rest.enableEditing === 'object' && rest.enableEditing?.mode === 'batch')
  const changesSheetOn = (showChangesSheet ?? batchEditing) && editingOn
  const reviewBarOn = changesSheetOn && dirtyCount > 0
  const saveBarOn =
    (showSaveBar ?? editingOn) && editingOn && dirtyCount > 0 && !changesSheetOn
  const selectionInfoOn =
    (showSelectionInfo ?? rowSelectionOn) && rowSelectionOn && selectedCount > 0
  const undoRedoOn = (showUndoRedo ?? !!rest.enableUndoRedo) && !!rest.enableUndoRedo
  const pinningOn = !!rest.enableColumnPinning
  const orderingOn = !!rest.enableColumnOrdering
  const groupingOn = !!rest.enableGrouping
  const clipboardOn = !!rest.enableClipboard
  const copyColumnOn = clipboardOn && rest.enableCopyColumn !== false
  const editToggleOn = !!showColumnEditToggle && editingOn
  const densityOn = !!showDensityToggle
  const statusBarOn = !!showStatusBar
  const exportFmts = handle.exportFormats
  const exportEnabled =
    handle.enableExport && (exportFmts.csv || exportFmts.excel || exportFmts.print)
  const exportOn = (showExport ?? exportEnabled) && exportEnabled
  const filterBuilderOn = !!showFilterBuilder && (rest.enableColumnFilters ?? true)
  const formatBuilderOn = !!showFormatBuilder && rest.enableConditionalFormatting !== false
  const [formatsOpen, setFormatsOpen] = React.useState(false)
  // Smart header (Phase 2) — the toolbar's action buttons are RESPONSIVE: shown
  // inline when there's room, and collapsed into a single "⋯ More" menu (lowest
  // priority first) only as the width shrinks. Measured via ResizeObserver.
  const toolbarRef = React.useRef<HTMLDivElement>(null)
  const collapsible = React.useMemo(() => {
    const l: { id: string; priority: number }[] = []
    if (filterBuilderOn) l.push({ id: 'filters', priority: 5 })
    if (exportOn) l.push({ id: 'export', priority: 4 })
    if (undoRedoOn) l.push({ id: 'history', priority: 3 })
    if (formatBuilderOn) l.push({ id: 'formats', priority: 2 })
    if (densityOn) l.push({ id: 'density', priority: 1 })
    return l
  }, [filterBuilderOn, exportOn, undoRedoOn, formatBuilderOn, densityOn])
  const ov = useToolbarOverflow(toolbarRef, collapsible)
  const moreShown = ov.size > 0
  // Builder column list derived from the grid's own columns (leafs, minus action columns).
  const formatColumns = React.useMemo<BstFormatBuilderColumn[]>(() => {
    const flatten = (cols: any[]): any[] =>
      cols.flatMap((c) => (Array.isArray(c.columns) ? flatten(c.columns) : [c]))
    return flatten((rest.columns as any[]) ?? [])
      .filter((c) => c.meta?.type !== 'action' && c.meta?.type !== 'actionMenu')
      .map((c) => ({
        id: String(c.id ?? c.accessorKey ?? ''),
        header: typeof c.header === 'string' ? c.header : String(c.id ?? c.accessorKey ?? ''),
        type: c.meta?.type as string | undefined,
      }))
      .filter((c) => c.id)
  }, [rest.columns])
  const settingsOn = settingsEnabled && settings.items.length > 0
  const settingsTitle = settingsOptions?.title ?? 'Table settings'
  const settingsSearchOn = shouldShowSettingsSearch(settingsOptions?.search, settings.items.length)
  const settingsGroups = settingsSearchOn
    ? filterSettingsGroups(settings.groups, settingsQuery)
    : settings.groups

  // Focus-trap the dependency-free slide-over sheets (#20): focus enters on open,
  // Tab cycles within, and focus is restored to the opener on close.
  const settingsTrapRef = useFocusTrap(settingsOn && settingsOpen)
  const changesTrapRef = useFocusTrap(changesSheetOn && changesOpen)
  const activeFilterCount = (table.state.columnFilters ?? []).length
  const paginationEnabled = rest.pagination !== false
  const paginationBarOn = (showPagination ?? paginationEnabled) && paginationEnabled
  const toolbarOn =
    showToolbar &&
    (Boolean(title) ||
      searchOn ||
      colsMenuOn ||
      addRowOn ||
      saveBarOn ||
      reviewBarOn ||
      selectionInfoOn ||
      undoRedoOn ||
      densityOn ||
      exportOn ||
      filterBuilderOn ||
      formatBuilderOn ||
      settingsOn)

  const pg = table.state.pagination
  const total = table.getRowCount()
  const from = total === 0 ? 0 : pg.pageIndex * pg.pageSize + 1
  const to = Math.min((pg.pageIndex + 1) * pg.pageSize, total)
  // Status bar (AG5): pre-filter total + selection aggregates.
  const statusBarTotal = table.getPreFilteredRowModel().rows.length
  const selStats = statusBarOn ? runtime.getSelectionStats() : null
  const fmtStat = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const colLabel = (col: any) =>
    typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id

  // Column ordering helpers (menu move-left/right → v9 setColumnOrder).
  const colById = new Map<string, any>(table.getAllLeafColumns().map((c: any) => [c.id, c]))
  const orderNow = (): string[] => {
    const explicit = (table.state.columnOrder ?? []) as string[]
    const leafIds = Array.from(colById.keys())
    if (explicit.length === 0) return leafIds
    const kept = explicit.filter((id) => colById.has(id))
    const missing = leafIds.filter((id) => !kept.includes(id))
    return [...kept, ...missing]
  }
  const orderedColumns = orderingOn
    ? orderNow().map((id) => colById.get(id))
    : table.getAllLeafColumns()
  const moveColumn = (colId: string, dir: -1 | 1) => {
    const order = orderNow()
    const i = order.indexOf(colId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const next = order.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    table.setColumnOrder(next)
  }

  // Review-changes sheet: the unsaved edits grouped per row (cheap — O(dirty)).
  const columnLabel = (columnId: string) => {
    const col = colById.get(columnId)
    return col ? colLabel(col) : columnId
  }
  const changeGroups: Array<{
    rowId: string
    row: TData | undefined
    changes: BstCellEdit<TData>[]
  }> = []
  if (changesSheetOn && changesOpen) {
    for (const c of runtime.getChangeSet()) {
      let g = changeGroups.find((x) => x.rowId === c.rowId)
      if (!g) {
        g = { rowId: c.rowId, row: c.row, changes: [] }
        changeGroups.push(g)
      }
      g.changes.push(c)
    }
  }
  const saveAllChanges = async () => {
    setSaving(true)
    setSaveError(false)
    // ONE runtime save → ONE `onSave` call with the whole batch. `false` =
    // validation blocked or the save call failed — drafts are kept either way.
    const ok = await runtime.commitAll()
    setSaving(false)
    if (ok) setChangesOpen(false)
    else setSaveError(true)
  }
  const changeText = (t: string) => (t === '' ? '(empty)' : t)

  return (
    <div className={'sc-card' + themeClass + (className ? ' ' + className : '')} style={style}>
      {gridState ? <GridStatePersist table={table} options={gridState} /> : null}
      {toolbarOn && (
        <div className="sc-toolbar" ref={toolbarRef}>
          {title && <span className="sc-title">{title}</span>}
          {searchOn && (
            <div className="sc-search">
              <I.search size={16} className="sc-search-icon" />
              <input
                className="sc-input"
                placeholder="Search…"
                value={table.state.globalFilter ?? ''}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
              />
            </div>
          )}
          {filterBuilderOn && !ov.has('filters') && (
            <span data-tb="filters" style={{ display: 'inline-flex' }}>
              <button className="sc-btn" onClick={() => setFiltersOpen((o) => !o)}>
                <I.filter size={16} />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </span>
          )}
          <span style={{ flex: 1 }} />
          {exportOn && !ov.has('export') && (
            <span data-tb="export" style={{ display: 'inline-flex' }}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="sc-btn" aria-label="Export">
                  {/* Inline download glyph (lucide idiom), so no icon-slot churn. */}
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Export
                  <I.chevronDown size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={menuClass} align="end" sideOffset={4}>
                  {exportFmts.csv && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      onSelect={() => runtime.exportCsv()}
                    >
                      Download CSV
                    </DropdownMenu.Item>
                  )}
                  {exportFmts.excel && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      onSelect={() => runtime.exportExcel()}
                    >
                      Download Excel
                    </DropdownMenu.Item>
                  )}
                  {exportFmts.print && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      onSelect={() => runtime.printTable()}
                    >
                      Print
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            </span>
          )}
          {undoRedoOn && !ov.has('history') && (
            <span data-tb="history" style={{ display: 'inline-flex', gap: 4 }}>
              <button
                className="sc-btn sc-icon"
                disabled={!canUndo}
                onClick={() => runtime.undo()}
                aria-label="Undo"
              >
                <I.undo size={17} />
              </button>
              <button
                className="sc-btn sc-icon"
                disabled={!canRedo}
                onClick={() => runtime.redo()}
                aria-label="Redo"
              >
                <I.redo size={17} />
              </button>
            </span>
          )}
          {formatBuilderOn && !ov.has('formats') && (
            <span data-tb="formats" style={{ display: 'inline-flex' }}>
              <button className="sc-btn" onClick={() => setFormatsOpen((o) => !o)}>
                <I.format size={16} />
                Formats{formatRules.length > 0 ? ` (${formatRules.length})` : ''}
              </button>
            </span>
          )}
          {densityOn && !ov.has('density') && (
            <span data-tb="density" style={{ display: 'inline-flex' }}>
              <button
                className="sc-btn"
                onClick={cycleDensity}
                style={{ textTransform: 'capitalize' }}
              >
                <I.density size={16} />
                {density}
              </button>
            </span>
          )}
          {selectionInfoOn && (
            <>
              <span className="sc-badge">{selectedCount} selected</span>
              <button className="sc-btn" onClick={() => table.resetRowSelection()}>
                Clear
              </button>
            </>
          )}
          {saveBarOn && (
            <>
              <span className="sc-badge">{dirtyCount} unsaved</span>
              <button className="sc-btn" onClick={() => runtime.cancelAll()}>
                Discard
              </button>
              <button className="sc-btn sc-btn-primary" onClick={() => void runtime.commitAll()}>
                <I.save size={16} />
                Save
              </button>
            </>
          )}
          {reviewBarOn && (
            <>
              <span className="sc-badge">{dirtyCount} unsaved</span>
              <button className="sc-btn" onClick={() => runtime.cancelAll()}>
                Discard
              </button>
              <button
                className="sc-btn sc-btn-primary"
                onClick={() => {
                  setSaveError(false)
                  setChangesOpen(true)
                }}
              >
                <I.save size={16} />
                Review & save
              </button>
            </>
          )}
          {colsMenuOn && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="sc-btn">
                  <I.columns size={16} />
                  Columns
                  <I.chevronDown size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={menuClass} align="end" sideOffset={4}>
                  {orderedColumns.map((col: any) => (
                    <DropdownMenu.CheckboxItem
                      key={col.id}
                      className="sc-menu-item"
                      checked={col.getIsVisible()}
                      onCheckedChange={() => hidingOn && col.toggleVisibility()}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="sc-check">
                        {col.getIsVisible() ? <I.check size={14} /> : null}
                      </span>
                      <span style={{ flex: 1 }}>{colLabel(col)}</span>
                      {orderingOn && (
                        <>
                          <button
                            className="sc-menu-btn"
                            aria-label={`Move ${colLabel(col)} left`}
                            onClick={(e) => {
                              e.stopPropagation()
                              moveColumn(col.id, -1)
                            }}
                          >
                            <I.chevronLeft size={15} />
                          </button>
                          <button
                            className="sc-menu-btn"
                            aria-label={`Move ${colLabel(col)} right`}
                            onClick={(e) => {
                              e.stopPropagation()
                              moveColumn(col.id, 1)
                            }}
                          >
                            <I.chevronRight size={15} />
                          </button>
                        </>
                      )}
                      {pinningOn && (
                        <button
                          className={
                            'sc-menu-btn' + (col.getIsPinned() === 'start' ? ' is-active' : '')
                          }
                          aria-label={`Pin ${colLabel(col)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            col.pin(col.getIsPinned() === 'start' ? false : 'start')
                          }}
                        >
                          <I.pin size={14} />
                        </button>
                      )}
                      {groupingOn && col.getCanGroup?.() && (
                        <button
                          className={'sc-menu-btn' + (col.getIsGrouped() ? ' is-active' : '')}
                          aria-label={`Group by ${colLabel(col)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            col.toggleGrouping()
                          }}
                        >
                          <I.group size={14} />
                        </button>
                      )}
                      {copyColumnOn && (
                        // Copy the whole column (all pages) — uses the pluggable
                        // `copy` icon slot (built-in SVG, or the caller's preset).
                        <button
                          className="sc-menu-btn"
                          aria-label={`Copy ${colLabel(col)} column`}
                          title="Copy column (all pages)"
                          onClick={(e) => {
                            e.stopPropagation()
                            void runtime.copyColumn(col.id)
                          }}
                        >
                          <I.copy size={14} />
                        </button>
                      )}
                      {editToggleOn && colIsEditable(col) && (
                        // Lock/unlock editing for the whole column (is-active = editable).
                        <button
                          className={'sc-menu-btn' + (colEditAllowed(col) ? ' is-active' : '')}
                          aria-label={
                            colEditAllowed(col)
                              ? `Lock ${colLabel(col)} editing`
                              : `Allow ${colLabel(col)} editing`
                          }
                          title="Toggle column editing"
                          onClick={(e) => {
                            e.stopPropagation()
                            runtime.setColumnEditable(col.id, !colEditAllowed(col))
                          }}
                        >
                          <I.edit size={14} />
                        </button>
                      )}
                    </DropdownMenu.CheckboxItem>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          {moreShown && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="sc-btn sc-icon" data-tb-more aria-label="More options">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="12" cy="19" r="1.6" />
                  </svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className={menuClass} align="end" sideOffset={4}>
                  {ov.has('filters') && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      onSelect={() => setFiltersOpen((o) => !o)}
                    >
                      <I.filter size={16} />
                      Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </DropdownMenu.Item>
                  )}
                  {ov.has('export') && exportFmts.csv && (
                    <DropdownMenu.Item className="sc-menu-item" onSelect={() => runtime.exportCsv()}>
                      Download CSV
                    </DropdownMenu.Item>
                  )}
                  {ov.has('export') && exportFmts.excel && (
                    <DropdownMenu.Item className="sc-menu-item" onSelect={() => runtime.exportExcel()}>
                      Download Excel
                    </DropdownMenu.Item>
                  )}
                  {ov.has('export') && exportFmts.print && (
                    <DropdownMenu.Item className="sc-menu-item" onSelect={() => runtime.printTable()}>
                      Print
                    </DropdownMenu.Item>
                  )}
                  {ov.has('formats') && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      onSelect={() => setFormatsOpen((o) => !o)}
                    >
                      <I.format size={16} />
                      Formats{formatRules.length > 0 ? ` (${formatRules.length})` : ''}
                    </DropdownMenu.Item>
                  )}
                  {ov.has('history') && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      disabled={!canUndo}
                      onSelect={() => runtime.undo()}
                    >
                      <I.undo size={16} />
                      Undo
                    </DropdownMenu.Item>
                  )}
                  {ov.has('history') && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      disabled={!canRedo}
                      onSelect={() => runtime.redo()}
                    >
                      <I.redo size={16} />
                      Redo
                    </DropdownMenu.Item>
                  )}
                  {ov.has('density') && (
                    <DropdownMenu.Item
                      className="sc-menu-item"
                      style={{ textTransform: 'capitalize' }}
                      onSelect={(e) => {
                        e.preventDefault()
                        cycleDensity()
                      }}
                    >
                      <I.density size={16} />
                      Density: {density}
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          {settingsOn && (
            <button
              className="sc-btn sc-icon"
              aria-label={settingsTitle}
              onClick={() => setSettingsOpen(true)}
            >
              <I.settings size={17} />
            </button>
          )}
          {showShortcuts && (
            <BstShortcuts
              table={table}
              className="sc-btn sc-icon"
              platform={typeof showShortcuts === 'object' ? showShortcuts.platform : undefined}
            />
          )}
        </div>
      )}

      {settingsOn && settingsOpen && (
        <div className="sc-sheet-overlay" onClick={() => setSettingsOpen(false)}>
          <aside
            ref={settingsTrapRef}
            className="sc-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={settingsTitle}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sc-sheet-header">
              <span className="sc-sheet-title">{settingsTitle}</span>
              <button
                className="sc-btn sc-icon"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                <I.close size={16} />
              </button>
            </div>
            {settingsSearchOn && (
              <div className="sc-sheet-search">
                <I.search size={15} className="sc-sheet-search-icon" />
                <input
                  type="search"
                  className="sc-input"
                  placeholder="Search settings…"
                  aria-label="Search settings"
                  value={settingsQuery}
                  onChange={(e) => setSettingsQuery(e.target.value)}
                />
              </div>
            )}
            <div className="sc-sheet-body">
              {settingsGroups.length === 0 && (
                <div className="sc-sheet-empty">No settings match “{settingsQuery}”.</div>
              )}
              {settingsGroups.map((group) => (
                <div key={group.name} className="sc-sheet-group">
                  <div className="sc-sheet-group-label">{group.name}</div>
                  {group.items.map((item) => (
                    <label
                      key={item.key}
                      className={`sc-sheet-row${item.disabled ? ' sc-sheet-row-disabled' : ''}${
                        item.parentKey ? ' sc-dep-child' : ''
                      }${item.lastChild ? ' sc-dep-last' : ''}`}
                    >
                      <span className="sc-sheet-row-text">
                        <span>{item.label}</span>
                        {(item.disabled && item.disabledBy
                          ? `Needs ${item.disabledBy}`
                          : item.hint) && (
                          <span className="sc-sheet-hint">
                            {item.disabled && item.disabledBy
                              ? `Needs ${item.disabledBy}`
                              : item.hint}
                          </span>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="sc-switch-input"
                        role="switch"
                        aria-label={item.label}
                        checked={item.value && !item.disabled}
                        disabled={item.disabled}
                        onChange={(e) => item.set(e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="sc-sheet-footer">
              <span className="sc-muted" style={{ flex: 1 }}>
                {settings.overrideCount > 0
                  ? `${settings.overrideCount} changed`
                  : 'Saved to this browser'}
              </span>
              <button
                className="sc-btn"
                disabled={settings.overrideCount === 0}
                onClick={() => settings.reset()}
              >
                Reset
              </button>
            </div>
          </aside>
        </div>
      )}

      {changesSheetOn && changesOpen && (
        <div className="sc-sheet-overlay" onClick={() => setChangesOpen(false)}>
          <aside
            ref={changesTrapRef}
            className="sc-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved changes"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sc-sheet-header">
              <span className="sc-sheet-title">Unsaved changes ({dirtyCount})</span>
              <button
                className="sc-btn sc-icon"
                aria-label="Close changes"
                onClick={() => setChangesOpen(false)}
              >
                <I.close size={16} />
              </button>
            </div>
            <div className="sc-sheet-body">
              {changeGroups.map((g) => (
                <div key={g.rowId} className="sc-sheet-group">
                  <div className="sc-sheet-group-label sc-change-rowlabel">
                    <span style={{ flex: 1 }}>
                      {changesRowLabel ? changesRowLabel(g.row, g.rowId) : `Row ${g.rowId}`}
                    </span>
                    <button
                      className="sc-menu-btn"
                      aria-label={`Revert row ${g.rowId}`}
                      title="Revert every change in this row"
                      onClick={() => runtime.revertRow(g.rowId)}
                    >
                      <I.undo size={14} />
                    </button>
                  </div>
                  {g.changes.map((c) => (
                    <div key={c.rowId + '::' + c.columnId} className="sc-change-row">
                      <div className="sc-change-main">
                        <span className="sc-change-col">{columnLabel(c.columnId)}</span>
                        <span className="sc-change-diff">
                          <span className="sc-change-old">{changeText(c.oldText)}</span>
                          <span className="sc-change-arrow">→</span>
                          <span className="sc-change-new">{changeText(c.newText)}</span>
                        </span>
                      </div>
                      <button
                        className="sc-btn sc-icon"
                        aria-label={`Revert ${columnLabel(c.columnId)} in row ${c.rowId}`}
                        title="Revert this change"
                        onClick={() => runtime.revertCell(c.rowId, c.columnId)}
                      >
                        <I.undo size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="sc-sheet-footer">
              <span
                className={saveError ? 'sc-change-error' : 'sc-muted'}
                style={{ flex: 1 }}
                role={saveError ? 'alert' : undefined}
              >
                {saveError
                  ? 'Couldn’t save — your changes are kept.'
                  : 'Saved in one batch call'}
              </span>
              <button
                className="sc-btn"
                disabled={saving}
                onClick={() => runtime.cancelAll()}
              >
                Discard all
              </button>
              <button
                className="sc-btn sc-btn-primary"
                disabled={saving}
                onClick={() => void saveAllChanges()}
              >
                <I.save size={16} />
                {saving ? 'Saving…' : `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {filterBuilderOn && filtersOpen && (
        <div className="sc-filter-panel bst-table-root">
          <BstFilterBuilder table={table} icons={bodyIcons} />
        </div>
      )}

      {formatBuilderOn && formatsOpen && (
        <div className="sc-filter-panel bst-table-root">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>Conditional formatting</span>
            <button
              className="sc-btn sc-icon"
              aria-label="Close conditional formatting"
              onClick={() => setFormatsOpen(false)}
            >
              <I.close size={15} />
            </button>
          </div>
          <BstConditionalFormatBuilder<TData>
            rules={formatRules}
            onChange={handleFormatsChange}
            columns={formatColumns}
            icons={bodyIcons}
          />
        </div>
      )}

      <div
        className="bst-table-root"
        data-bst-density={density === 'normal' ? undefined : density}
      >
        <BstTable table={table} icons={bodyIcons} />
      </div>

      {addRowOn && (
        <div className="sc-footer">
          <button className="sc-btn" onClick={() => runtime.addRow()}>
            <I.plus size={16} />
            Add row
          </button>
        </div>
      )}

      {paginationBarOn && (
        <div className="sc-footer">
          <span className="sc-muted">Rows per page</span>
          <select
            className="sc-select"
            value={pg.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span style={{ flex: 1 }} />
          <span className="sc-muted">
            {from}–{to} of {total}
          </span>
          <button
            className="sc-btn sc-icon"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <I.chevronLeft size={18} />
          </button>
          <button
            className="sc-btn sc-icon"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <I.chevronRight size={18} />
          </button>
        </div>
      )}

      {statusBarOn && (
        <div className="sc-footer sc-statusbar">
          <span className="sc-muted">
            {total.toLocaleString()} {total === 1 ? 'row' : 'rows'}
            {total < statusBarTotal ? ` (of ${statusBarTotal.toLocaleString()})` : ''}
          </span>
          {rowSelectionOn && selectedCount > 0 && (
            <span className="sc-muted">· {selectedCount} selected</span>
          )}
          <span style={{ flex: 1 }} />
          {selStats && selStats.numericCount > 0 && (
            <span className="sc-muted">
              Sum {fmtStat(selStats.sum)} · Avg {fmtStat(selStats.avg)} · Min {fmtStat(selStats.min)} ·
              Max {fmtStat(selStats.max)} · Count {selStats.count}
            </span>
          )}
          {selStats && selStats.numericCount === 0 && selStats.count > 1 && (
            <span className="sc-muted">Count {selStats.count}</span>
          )}
        </div>
      )}
    </div>
  )
}
