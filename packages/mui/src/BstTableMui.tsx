import * as React from 'react'
import {
  useBstGrid,
  useBstSettings,
  filterSettingsGroups,
  shouldShowSettingsSearch,
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
} from '@bloomskill/table-engine'
import type { RowData } from '@tanstack/react-table'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListSubheader from '@mui/material/ListSubheader'
import InputAdornment from '@mui/material/InputAdornment'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import PushPinIcon from '@mui/icons-material/PushPin'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'
import DensityMediumIcon from '@mui/icons-material/DensityMedium'
import FilterListIcon from '@mui/icons-material/FilterList'
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill'
import SettingsIcon from '@mui/icons-material/Settings'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import SegmentIcon from '@mui/icons-material/Segment'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { useTheme } from '@mui/material/styles'
import { createMuiPreset } from './celltypes.js'
import type { BstIconOverrides, IconProps } from '@bloomskill/table-engine'

// Adapt a MUI icon (sized via `fontSize`) to the engine body-icon contract
// (`{ size, className }`), so the shared <BstTable> body renders Material icons.
const mi =
  (Comp: React.ComponentType<any>): React.FC<IconProps> =>
  ({ size, className }) => <Comp className={className} sx={{ fontSize: size }} />

export interface BstTableMuiProps<TData extends RowData> extends UseBstTableOptions<TData> {
  title?: string
  /** Chrome toggles (§12 `show*` layer). Each defaults to true. */
  showToolbar?: boolean
  showSearch?: boolean
  showColumnsMenu?: boolean
  showPagination?: boolean
  /** Add-row button (requires `enableRowActions`). Default: follows enableRowActions. */
  showAddRow?: boolean
  /** Save/Cancel bar shown when there are dirty edits (requires `enableEditing`). */
  showSaveBar?: boolean
  /**
   * "Review & save" flow: an "{n} unsaved" chip + button opening a right-hand
   * sheet (MUI Drawer) that lists every unsaved edit (row · column · previous →
   * new value) with per-change / per-row revert, and holds the final **Save**
   * confirmation — ONE `onSave` call for the whole batch, never per cell. While
   * on, it replaces the plain save bar. Default: on when
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
   * `enableExport`; the menu items follow the per-format sub-toggles
   * (`enableCsvExport` / `enableExcelExport` / `enablePrint`). Default: follows
   * `enableExport`.
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
   * Settings gear → a right-side sheet (MUI Drawer) where the end-user toggles
   * this grid's features at runtime — **per table**, persisted to `localStorage`.
   * `true`, or a `BstSettingsOptions` object (`features` / `title` / `persistKey`
   * / `persist`). Default: false (opt-in). Only features the developer has
   * provisioned appear; e.g. disabling "Copy & paste" here turns off clipboard.
   */
  showSettings?: boolean | BstSettingsOptions
  /** Keyboard-shortcuts help button (⌨) + overlay; also opens on `?`. Lists only
   * the shortcuts active on this grid. `boolean`, or `{ platform }` to force
   * ⌘/Ctrl key rendering (default auto-detects). Default: false (opt-in). */
  showShortcuts?: boolean | { platform?: 'mac' | 'pc' | 'auto' }
  /** Page-size choices in the pagination bar. Default: [5, 10, 20, 50]. */
  pageSizeOptions?: number[]
  /** Custom class name on the outer card (the whole component). Fine-grained
   * slots go on `classNames` (forwarded to the grid body). */
  className?: string
  /** Inline style on the outer card. */
  style?: React.CSSProperties
}

/**
 * MUI style adapter. Owns the "chrome" + the MUI cell editors (via
 * `createMuiPreset`); the grid body is the engine's neutral <BstTable/>. Every
 * piece of chrome is a §12 `show*` toggle and no-ops when its underlying
 * `enable*` behaviour is off.
 */
export function BstTableMui<TData extends RowData>(props: BstTableMuiProps<TData>) {
  // Runtime settings sheet: overrides applied to `props` up front so every §12
  // `enable*`/`show*` toggle downstream reflects the user's choices (§12 chrome).
  const settingsOptions =
    typeof props.showSettings === 'object' ? props.showSettings : undefined
  const settingsEnabled = props.showSettings != null && props.showSettings !== false
  const { props: eff, model: settings } = useBstSettings<BstTableMuiProps<TData>>(
    props,
    settingsOptions,
  )
  const {
    title,
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

  const preset = React.useMemo(() => cellTypes ?? createMuiPreset(), [cellTypes])
  const gridOpts = {
    ...rest,
    cellTypes: preset,
    conditionalFormats: effectiveFormats,
  } as UseBstTableOptions<TData>
  const { table, runtime, handle } = useBstGrid<TData>(gridOpts)
  const theme = useTheme()
  // Forward MUI icons into the engine body so the whole grid is Material-consistent.
  const bodyIcons = React.useMemo<BstIconOverrides>(
    () => ({
      sortAsc: mi(ArrowUpwardIcon),
      sortDesc: mi(ArrowDownwardIcon),
      sortNone: mi(UnfoldMoreIcon),
      expandExpanded: mi(KeyboardArrowDownIcon),
      expandCollapsed: mi(KeyboardArrowRightIcon),
      pin: mi(PushPinIcon),
      booleanTrue: mi(CheckIcon),
      remove: mi(CloseIcon),
    }),
    [],
  )
  const [colAnchor, setColAnchor] = React.useState<null | HTMLElement>(null)
  const [exportAnchor, setExportAnchor] = React.useState<null | HTMLElement>(null)
  const [moreAnchor, setMoreAnchor] = React.useState<null | HTMLElement>(null)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsQuery, setSettingsQuery] = React.useState('')
  const closeSettings = React.useCallback(() => {
    setSettingsOpen(false)
    setSettingsQuery('')
  }, [])
  const [changesOpen, setChangesOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState(false)
  const [density, setDensity] = React.useState<'compact' | 'normal' | 'comfortable'>('normal')
  const cycleDensity = () =>
    setDensity((d) => (d === 'normal' ? 'compact' : d === 'compact' ? 'comfortable' : 'normal'))
  const [filtersOpen, setFiltersOpen] = React.useState(false)

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
  // Subscribe to per-column edit overrides so the menu toggle reflects them live.
  const columnEdit = useStoreSelector(runtime.store, (s) => s.columnEdit)
  const colIsEditable = (col: any): boolean =>
    col.columnDef.meta?.type !== 'action' && !!col.columnDef.meta?.editable
  const colEditAllowed = (col: any): boolean =>
    columnEdit[col.id as string] ??
    (typeof col.columnDef.meta?.editable === 'function' ? true : !!col.columnDef.meta?.editable)

  // chrome follows behaviour (§12)
  const searchOn = showSearch && (rest.enableGlobalFilter ?? true)
  const colsMenuOn = showColumnsMenu && (rest.enableHiding ?? true)
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
  // Smart header: low-frequency controls collapse into a single "⋯ More" menu.
  const moreOn = formatBuilderOn || undoRedoOn || densityOn
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

  const vars = {
    '--bst-table-bg': theme.palette.background.paper,
    '--bst-table-fg': theme.palette.text.primary,
    '--bst-table-muted': theme.palette.text.secondary,
    '--bst-table-border': theme.palette.divider,
    '--bst-table-header-bg': theme.palette.mode === 'dark' ? '#161a20' : theme.palette.grey[50],
    '--bst-table-row-hover': theme.palette.action.hover,
    '--bst-table-accent': theme.palette.primary.main,
    '--bst-table-radius': `${theme.shape.borderRadius}px`,
    '--bst-table-font': theme.typography.fontFamily ?? 'inherit',
  } as React.CSSProperties

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

  // Nothing left to review (saved / discarded / all reverted) → close the sheet.
  React.useEffect(() => {
    if (dirtyCount === 0) setChangesOpen(false)
  }, [dirtyCount])

  return (
    <Paper
      variant="outlined"
      className={className}
      style={style}
      sx={{
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {toolbarOn && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            px: 1.5,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiButton-root': { textTransform: 'none', fontWeight: 500 },
          }}
        >
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
              {title}
            </Typography>
          )}
          {searchOn && (
            <>
              <SearchIcon fontSize="small" color="disabled" />
              <TextField
                size="small"
                placeholder="Search…"
                value={table.state.globalFilter ?? ''}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
                sx={{ minWidth: 220 }}
              />
            </>
          )}
          {filterBuilderOn && (
            <Button
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setFiltersOpen((o) => !o)}
              color={activeFilterCount > 0 ? 'primary' : 'inherit'}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          )}
          <span style={{ flex: 1 }} />
          {exportOn && (
            <>
              <Button
                size="small"
                startIcon={<FileDownloadIcon />}
                onClick={(e) => setExportAnchor(e.currentTarget)}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportAnchor}
                open={!!exportAnchor}
                onClose={() => setExportAnchor(null)}
              >
                {exportFmts.csv && (
                  <MenuItem
                    onClick={() => {
                      runtime.exportCsv()
                      setExportAnchor(null)
                    }}
                  >
                    Download CSV
                  </MenuItem>
                )}
                {exportFmts.excel && (
                  <MenuItem
                    onClick={() => {
                      runtime.exportExcel()
                      setExportAnchor(null)
                    }}
                  >
                    Download Excel
                  </MenuItem>
                )}
                {exportFmts.print && (
                  <MenuItem
                    onClick={() => {
                      runtime.printTable()
                      setExportAnchor(null)
                    }}
                  >
                    Print
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
          {selectionInfoOn && (
            <>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${selectedCount} selected`}
              />
              <Button size="small" onClick={() => table.resetRowSelection()}>
                Clear
              </Button>
            </>
          )}
          {saveBarOn && (
            <>
              <Chip size="small" color="warning" label={`${dirtyCount} unsaved`} />
              <Button size="small" onClick={() => runtime.cancelAll()}>
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => void runtime.commitAll()}
              >
                Save
              </Button>
            </>
          )}
          {reviewBarOn && (
            <>
              <Chip size="small" color="warning" label={`${dirtyCount} unsaved`} />
              <Button size="small" onClick={() => runtime.cancelAll()}>
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => {
                  setSaveError(false)
                  setChangesOpen(true)
                }}
              >
                Review & save
              </Button>
            </>
          )}
          {colsMenuOn && (
            <>
              <Button
                size="small"
                startIcon={<ViewColumnIcon />}
                onClick={(e) => setColAnchor(e.currentTarget)}
              >
                Columns
              </Button>
              <Menu
                anchorEl={colAnchor}
                open={Boolean(colAnchor)}
                onClose={() => setColAnchor(null)}
              >
                {orderedColumns.map((col: any) => (
                  <MenuItem key={col.id} dense disableRipple sx={{ gap: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={col.getIsVisible()}
                      onClick={(e) => {
                        e.stopPropagation()
                        col.toggleVisibility()
                      }}
                    />
                    <ListItemText
                      primary={colLabel(col)}
                      onClick={() => col.toggleVisibility()}
                      sx={{ cursor: 'pointer', mr: 1 }}
                    />
                    {orderingOn && (
                      <>
                        <IconButton
                          size="small"
                          aria-label={`Move ${colLabel(col)} left`}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveColumn(col.id, -1)
                          }}
                        >
                          <ChevronLeftIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`Move ${colLabel(col)} right`}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveColumn(col.id, 1)
                          }}
                        >
                          <ChevronRightIcon fontSize="inherit" />
                        </IconButton>
                      </>
                    )}
                    {pinningOn && (
                      <IconButton
                        size="small"
                        color={col.getIsPinned() === 'start' ? 'primary' : 'default'}
                        aria-label={`Pin ${colLabel(col)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          col.pin(col.getIsPinned() === 'start' ? false : 'start')
                        }}
                      >
                        <PushPinIcon fontSize="inherit" />
                      </IconButton>
                    )}
                    {groupingOn && col.getCanGroup?.() && (
                      <IconButton
                        size="small"
                        color={col.getIsGrouped() ? 'primary' : 'default'}
                        aria-label={`Group by ${colLabel(col)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          col.toggleGrouping()
                        }}
                      >
                        <SegmentIcon fontSize="inherit" />
                      </IconButton>
                    )}
                    {copyColumnOn && (
                      <IconButton
                        size="small"
                        aria-label={`Copy ${colLabel(col)} column`}
                        title="Copy column (all pages)"
                        onClick={(e) => {
                          e.stopPropagation()
                          void runtime.copyColumn(col.id)
                        }}
                      >
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    )}
                    {editToggleOn && colIsEditable(col) && (
                      <IconButton
                        size="small"
                        color={colEditAllowed(col) ? 'primary' : 'default'}
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
                        <EditIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          {moreOn && (
            <>
              <IconButton
                size="small"
                aria-label="More options"
                onClick={(e) => setMoreAnchor(e.currentTarget)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}>
                {formatBuilderOn && (
                  <MenuItem
                    onClick={() => {
                      setFormatsOpen((o) => !o)
                      setMoreAnchor(null)
                    }}
                  >
                    <FormatColorFillIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Formats{formatRules.length > 0 ? ` (${formatRules.length})` : ''}
                  </MenuItem>
                )}
                {undoRedoOn && (
                  <MenuItem
                    disabled={!canUndo}
                    onClick={() => {
                      runtime.undo()
                      setMoreAnchor(null)
                    }}
                  >
                    <UndoIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Undo
                  </MenuItem>
                )}
                {undoRedoOn && (
                  <MenuItem
                    disabled={!canRedo}
                    onClick={() => {
                      runtime.redo()
                      setMoreAnchor(null)
                    }}
                  >
                    <RedoIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Redo
                  </MenuItem>
                )}
                {densityOn && (
                  <MenuItem onClick={() => cycleDensity()} sx={{ textTransform: 'capitalize' }}>
                    <DensityMediumIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Density: {density}
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
          {settingsOn && (
            <IconButton
              size="small"
              aria-label={settingsTitle}
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          )}
          {showShortcuts && (
            <BstShortcuts
              table={table}
              platform={typeof showShortcuts === 'object' ? showShortcuts.platform : undefined}
            />
          )}
        </Stack>
      )}

      {settingsOn && (
        <Drawer anchor="right" open={settingsOpen} onClose={closeSettings}>
          <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                px: 2,
                py: 1.5,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                {settingsTitle}
              </Typography>
              <IconButton
                size="small"
                aria-label="Close settings"
                onClick={closeSettings}
                sx={{ color: 'inherit' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            {settingsSearchOn && (
              <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="Search settings…"
                  value={settingsQuery}
                  onChange={(e) => setSettingsQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
            )}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {settingsGroups.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ px: 2, py: 3, textAlign: 'center' }}
                >
                  No settings match “{settingsQuery}”.
                </Typography>
              )}
              {settingsGroups.map((group, gi) => (
                <List
                  key={group.name}
                  dense
                  disablePadding
                  sx={gi > 0 ? { borderTop: 1, borderColor: 'divider' } : undefined}
                  subheader={
                    <ListSubheader
                      disableSticky
                      sx={{
                        lineHeight: '40px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'text.primary',
                      }}
                    >
                      {group.name}
                    </ListSubheader>
                  }
                >
                  {group.items.map((item) => (
                    <ListItem
                      key={item.key}
                      sx={{
                        ...(item.disabled ? { opacity: 0.5 } : {}),
                        ...(item.parentKey
                          ? {
                              pl: '32px',
                              position: 'relative',
                              // Dotted branch connector from the parent row above
                              // (Bitbucket-style): a vertical line down the gutter…
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: '20px',
                                top: 0,
                                bottom: item.lastChild ? '50%' : 0,
                                borderLeft: '1.5px dotted',
                                borderColor: 'text.secondary',
                              },
                              // …and a horizontal elbow into this row.
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                left: '20px',
                                top: '50%',
                                width: '9px',
                                borderTop: '1.5px dotted',
                                borderColor: 'text.secondary',
                              },
                            }
                          : {}),
                      }}
                      secondaryAction={
                        <Switch
                          edge="end"
                          size="small"
                          checked={item.value && !item.disabled}
                          disabled={item.disabled}
                          onChange={(e) => item.set(e.target.checked)}
                          slotProps={{ input: { 'aria-label': item.label } }}
                        />
                      }
                    >
                      <ListItemText
                        primary={item.label}
                        secondary={
                          item.disabled && item.disabledBy
                            ? `Needs ${item.disabledBy}`
                            : item.hint
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ))}
            </Box>
            <Divider />
            <Stack direction="row" sx={{ p: 1.5, gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, alignSelf: 'center' }}>
                {settings.overrideCount > 0
                  ? `${settings.overrideCount} changed`
                  : 'Saved to this browser'}
              </Typography>
              <Button
                size="small"
                disabled={settings.overrideCount === 0}
                onClick={() => settings.reset()}
              >
                Reset
              </Button>
            </Stack>
          </Box>
        </Drawer>
      )}

      {changesSheetOn && (
        <Drawer anchor="right" open={changesOpen} onClose={() => setChangesOpen(false)}>
          <Box
            sx={{ width: 360, display: 'flex', flexDirection: 'column', height: '100%' }}
            role="dialog"
            aria-label="Unsaved changes"
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                Unsaved changes ({dirtyCount})
              </Typography>
              <IconButton
                size="small"
                aria-label="Close changes"
                onClick={() => setChangesOpen(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {changeGroups.map((g) => (
                <List
                  key={g.rowId}
                  dense
                  disablePadding
                  subheader={
                    <ListSubheader
                      disableSticky
                      sx={{ lineHeight: '32px', fontWeight: 600, display: 'flex', gap: 0.5 }}
                    >
                      <Box component="span" sx={{ flex: 1, alignSelf: 'center' }}>
                        {changesRowLabel ? changesRowLabel(g.row, g.rowId) : `Row ${g.rowId}`}
                      </Box>
                      <IconButton
                        size="small"
                        aria-label={`Revert row ${g.rowId}`}
                        title="Revert every change in this row"
                        onClick={() => runtime.revertRow(g.rowId)}
                      >
                        <UndoIcon fontSize="inherit" />
                      </IconButton>
                    </ListSubheader>
                  }
                >
                  {g.changes.map((c) => (
                    <ListItem
                      key={c.rowId + '::' + c.columnId}
                      secondaryAction={
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={`Revert ${columnLabel(c.columnId)} in row ${c.rowId}`}
                          title="Revert this change"
                          onClick={() => runtime.revertCell(c.rowId, c.columnId)}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={columnLabel(c.columnId)}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                        secondary={
                          <>
                            <Box
                              component="span"
                              sx={{ textDecoration: 'line-through', color: 'text.disabled' }}
                            >
                              {changeText(c.oldText)}
                            </Box>
                            {' → '}
                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
                              {changeText(c.newText)}
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ))}
            </Box>
            <Divider />
            <Stack direction="row" sx={{ p: 1.5, gap: 1, alignItems: 'center' }}>
              <Typography
                variant="caption"
                color={saveError ? 'error' : 'text.secondary'}
                role={saveError ? 'alert' : undefined}
                sx={{ flex: 1 }}
              >
                {saveError ? 'Couldn’t save — your changes are kept.' : 'Saved in one batch call'}
              </Typography>
              <Button size="small" disabled={saving} onClick={() => runtime.cancelAll()}>
                Discard all
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={() => void saveAllChanges()}
              >
                {saving ? 'Saving…' : `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`}
              </Button>
            </Stack>
          </Box>
        </Drawer>
      )}

      {filterBuilderOn && filtersOpen && (
        <div
          className="bst-table-root"
          style={{ ...vars, padding: 12, borderBottom: `1px solid ${theme.palette.divider}` }}
        >
          <BstFilterBuilder table={table} icons={bodyIcons} />
        </div>
      )}

      {formatBuilderOn && formatsOpen && (
        <div
          className="bst-table-root"
          style={{ ...vars, padding: 12, borderBottom: `1px solid ${theme.palette.divider}` }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              Conditional formatting
            </Typography>
            <IconButton
              size="small"
              aria-label="Close conditional formatting"
              onClick={() => setFormatsOpen(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
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
        style={vars}
        data-bst-density={density === 'normal' ? undefined : density}
      >
        <BstTable table={table} icons={bodyIcons} />
      </div>

      {addRowOn && (
        <Stack direction="row" sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button size="small" startIcon={<AddIcon />} onClick={() => runtime.addRow()}>
            Add row
          </Button>
        </Stack>
      )}

      {paginationBarOn && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', p: 1, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.secondary">
            Rows per page
          </Typography>
          <Select
            size="small"
            value={pg.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            sx={{ height: 32 }}
          >
            {pageSizeOptions.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
          <span style={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {from}–{to} of {total}
          </Typography>
          <IconButton
            size="small"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            size="small"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      )}

      {statusBarOn && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            px: 1.5,
            py: 0.75,
            borderTop: 1,
            borderColor: 'divider',
            fontSize: 13,
            color: 'text.secondary',
            flexWrap: 'wrap',
          }}
        >
          <span>
            {total.toLocaleString()} {total === 1 ? 'row' : 'rows'}
            {total < statusBarTotal ? ` (of ${statusBarTotal.toLocaleString()})` : ''}
          </span>
          {rowSelectionOn && selectedCount > 0 && <span>· {selectedCount} selected</span>}
          <span style={{ flex: 1 }} />
          {selStats && selStats.numericCount > 0 && (
            <span>
              Sum {fmtStat(selStats.sum)} · Avg {fmtStat(selStats.avg)} · Min {fmtStat(selStats.min)} ·
              Max {fmtStat(selStats.max)} · Count {selStats.count}
            </span>
          )}
          {selStats && selStats.numericCount === 0 && selStats.count > 1 && (
            <span>Count {selStats.count}</span>
          )}
        </Stack>
      )}
    </Paper>
  )
}
