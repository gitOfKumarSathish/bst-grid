// ---- table + hooks ----
export { useBstTable, useBstGrid, getBstRuntime, BST_RUNTIME } from './useBstTable.js'
export type { BstTableInstance, BstRuntimeHandle } from './useBstTable.js'
export { BstTable } from './BstTable.js'

// ---- body icons (injectable engine-body glyphs — sort / expander / pin / boolean / file) ----
export {
  defaultBstIcons,
  resolveBstIcons,
  BstIconsContext,
  useBstIcons,
  BST_ICON_SLOTS,
} from './icons.js'
export type { BstIcons, BstIconOverrides, IconProps, IconComponent } from './icons.js'

// ---- filter builder (E3) ----
export { BstFilterBuilder } from './BstFilterBuilder.js'
export { BstSetFilter } from './BstSetFilter.js'
export type { BstSetFilterProps, BstSetFilterOption } from './BstSetFilter.js'
export {
  operatorsForType,
  operatorArity,
  evalCondition,
  isConditionActive,
  filterFn_bstCondition,
  combineFilterConditions,
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  SELECT_OPERATORS,
  BOOLEAN_OPERATORS,
} from './filtering.js'
export type { FilterOperator, FilterCondition, FilterConditionGroup } from './filtering.js'

// ---- DataSource (server tier — manual sort / filter / paginate; Plan.md §5) ----
export { createClientDataSource, createServerDataSource, createFileHandlers } from './datasource.js'
export type {
  DataSource,
  DataSourceQuery,
  DataSourcePage,
  DataSourceSort,
  DataSourceFilter,
  BstFileRef,
  DataSourceFileContext,
  BstFileCellHandlers,
} from './datasource.js'
export { useBstDataSource } from './useBstDataSource.js'
export type {
  UseBstDataSourceOptions,
  BstDataSourceResult,
  BstServerTableProps,
  DsSort,
  DsColumnFilter,
  DsPagination,
} from './useBstDataSource.js'
// ---- infinite scroll (A2 — fetch-on-scroll append over a DataSource) ----
export { useBstInfiniteDataSource } from './useBstInfiniteDataSource.js'
export type {
  UseBstInfiniteDataSourceOptions,
  BstInfiniteDataSourceResult,
  BstInfiniteTableProps,
} from './useBstInfiniteDataSource.js'

// ---- virtualization (D1 — row/column windowing helpers; wiring lives in BstTable) ----
export { resolveVirtualization, virtualizationBypassReason } from './virtualization.js'
export type {
  VirtualizationOptions,
  ResolvedVirtualization,
  VirtualizationCompat,
} from './virtualization.js'

// ---- sticky-header viewport (G3/G4) ----
export {
  resolveStickyHeader,
  STICKY_DEFAULT_MAX_HEIGHT_PX,
  STICKY_ROW_PX,
  STICKY_HEADER_PX,
} from './stickyHeader.js'
export type { BstStickyHeaderOptions, ResolvedStickyHeader } from './stickyHeader.js'

// ---- pagination "Rows per page" helpers (incl. the `'all'` choice) ----
export {
  resolvePageSizeChoices,
  pageSizeForChoice,
  PAGE_SIZE_ALL,
  PAGE_SIZE_ALL_APPLIED,
} from './pagination.js'
export type { BstPageSizeOption, BstPageSizeChoice } from './pagination.js'

// ---- options / column types ----
export type {
  BstTableColumn,
  UseBstTableOptions,
  BstTableEngineToggles,
  EditingOptions,
  ValidationOptions,
  BstClassNames,
  BstStyles,
  BstRowContext,
  BstHeaderSlotContext,
  BstContextMenuItem,
  BstContextMenuContext,
  AutoColumnsOptions,
} from './types.js'

// ---- column helpers: auto-generate (AG27) + row-number (AG9) ----
export {
  autoGenerateColumns,
  humanizeKey,
  inferCellType,
  ROW_NUMBER_COLUMN_ID,
  RESERVED_COLUMN_PREFIX,
} from './columns.js'

// ---- features (v9 registration) ----
export { bstTableFeatures } from './features.js'
export type { BstTableFeatures } from './features.js'

// ---- cell spanning (A5) ----
export { computeCellSpans } from './spanning.js'
export type { BstCellSpan, BstSpanContext, SpanPlan, SpanRow, SpanCol } from './spanning.js'

// ---- column auto-size (D3) ----
export { computeAutoWidth, measureTextWidth } from './autosize.js'
export type { AutoSizeOptions } from './autosize.js'

// Export (Phase 5, AG1–AG3) — dep-free CSV / Excel / print serializers + DOM glue.
export {
  toCsv,
  toXlsx,
  buildPrintHtml,
  downloadBlob,
  printHtml,
  ensureExtension,
  EXPORT_MIME,
} from './export.js'
export type {
  BstExportColumn,
  BstExportMatrix,
  BstExportOptions,
  BstExportRunOptions,
  BstExportFormat,
  BstExportScope,
  CsvOptions,
  XlsxOptions,
  PrintOptions,
} from './export.js'

// ---- conditional formatting (K3) ----
export { BstConditionalFormatBuilder } from './BstConditionalFormatBuilder.js'
export type { BstFormatBuilderColumn } from './BstConditionalFormatBuilder.js'
export { evalCellFormat, evalRowFormat, DEFAULT_FORMAT_PRESETS } from './formatting.js'
export type {
  BstFormatRule,
  BstFormatScope,
  BstFormatContext,
  FormatResult,
  BstFormatPreset,
} from './formatting.js'

// ---- runtime settings sheet (§12 chrome — per-table feature toggles) ----
export {
  useBstSettings,
  applySettingsOverrides,
  filterSettingsGroups,
  shouldShowSettingsSearch,
  isSettingActive,
  BST_SETTINGS_REGISTRY,
} from './settings.js'
export type {
  BstSettingKey,
  BstSettingsItem,
  BstSettingsGroup,
  BstSettingsModel,
  BstSettingsOptions,
  BstSettingsOverrides,
} from './settings.js'

// ---- grid-state save/restore (AG21 — per-user view snapshots) ----
export {
  useBstGridState,
  getGridState,
  applyGridState,
  resetGridState,
  emptyGridState,
  loadGridState,
  saveGridState,
  clearGridState,
  BST_GRID_STATE_KEYS,
  BST_GRID_STATE_VERSION,
} from './gridState.js'
export type {
  BstGridState,
  BstGridStateKey,
  BstGridStateSelect,
  BstGridStateOptions,
  BstGridStateController,
  BstGridStateStorage,
} from './gridState.js'

// ---- in-cell PDF thumbnails (B5 — pdf.js-backed, injected) ----
export {
  BstPdfThumbnailerProvider,
  useBstPdfThumbnailer,
  createPdfjsThumbnailer,
} from './pdfThumbnail.js'
export type { PdfThumbnailRenderer, PdfThumbnailerOptions } from './pdfThumbnail.js'

// ---- keyboard shortcuts (in-UI overlay + headless registry) ----
export { BstShortcuts } from './BstShortcuts.js'
export type { BstShortcutsProps } from './BstShortcuts.js'
export {
  BST_SHORTCUTS_REGISTRY,
  resolveActiveShortcuts,
  formatShortcutToken,
} from './shortcuts.js'
export type {
  BstShortcut,
  ShortcutCategory,
  ResolvedShortcut,
  ResolvedShortcutGroup,
} from './shortcuts.js'

// ---- responsive toolbar overflow (smart-header Phase 2) ----
export { partitionToolbar, useToolbarOverflow } from './toolbar.js'
export type { ToolbarItemWidth } from './toolbar.js'

// ---- cell-type registry (Plan.md §2.3) ----
export { createCellTypeRegistry, defineCellType } from './registry/registry.js'
export type { CellTypeRegistry } from './registry/registry.js'
export {
  createDefaultRegistry,
  defaultCellTypes,
  textCellType,
  longTextCellType,
  numberCellType,
  dateTimeCellType,
  booleanCellType,
  singleSelectCellType,
  multiSelectCellType,
  radioCellType,
  hyperlinkCellType,
  filesCellType,
  sparklineCellType,
  kpiCellType,
  actionCellType,
  actionMenuCellType,
  BstFilePreview,
} from './registry/defaults.js'

// ---- advanced cell types (B1 QR/barcode, J2 rich text) + their dep-free encoders ----
export {
  qrCellType,
  barcodeCellType,
  richTextCellType,
  RichTextEditor,
  advancedCellTypes,
} from './cells/celltypes.js'
export { qrMatrix } from './cells/qr.js'
export type { QrMatrix, QrEcLevel } from './cells/qr.js'
// ---- Field formats (ERP presets: Aadhaar / PAN / GSTIN / IFSC / … via cellMeta.pattern) ----
export {
  FIELD_FORMATS,
  resolveFieldFormat,
  defineFieldFormat,
  verhoeffValid,
  verhoeffChecksum,
  isValidAadhaar,
  isValidPan,
  isValidGstin,
  gstinCheckDigit,
  isValidIfsc,
  isValidPassport,
  isValidIec,
  isValidEsic,
  isValidUan,
  isValidSwift,
  isValidIban,
  luhnValid,
} from './cells/formats.js'
export type { FieldFormat, FieldPattern } from './cells/formats.js'
export { code128 } from './cells/barcode.js'
export type { BarcodeResult } from './cells/barcode.js'
export { sanitizeHtml, htmlToText, escapeHtml, isRichTextEmpty } from './cells/richtext.js'
export type {
  CellType,
  CellRenderProps,
  CellEditProps,
  CellValidateContext,
  BstColumnMeta,
  BstOption,
  BstCellApi,
  FieldError,
  FieldErrorLevel,
} from './registry/types.js'

// ---- interaction store + runtime (editing / validation / rows) ----
export {
  cellKey,
  splitCellKey,
  createInteractionStore,
  createStore,
} from './interaction/store.js'
export type {
  CellRef,
  InteractionState,
  InteractionStore,
  Store,
} from './interaction/store.js'
export { useStoreSelector, arrayEqual } from './interaction/useStoreSelector.js'
export { createRuntime } from './runtime.js'
export type {
  BstRuntime,
  RuntimeCtx,
  CellChange,
  BstCellEdit,
  BstRowChange,
  BstSaveEvent,
  CellAccess,
  SaveTrigger,
  CommitPolicy,
  VisualIndex,
  MoveActiveOptions,
  BstSelectionStats,
} from './runtime.js'
export { runValidators, hasBlockingError } from './validation/validate.js'

// Re-export helpers so consumers get typed columns without importing
// @tanstack/react-table directly.
export { createColumnHelper, flexRender } from '@tanstack/react-table'
