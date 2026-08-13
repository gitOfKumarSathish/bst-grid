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
export {
  operatorsForType,
  operatorArity,
  evalCondition,
  isConditionActive,
  filterFn_bstCondition,
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  SELECT_OPERATORS,
  BOOLEAN_OPERATORS,
} from './filtering.js'
export type { FilterOperator, FilterCondition } from './filtering.js'

// ---- DataSource (server tier — manual sort / filter / paginate; Plan.md §5) ----
export { createClientDataSource, createServerDataSource } from './datasource.js'
export type {
  DataSource,
  DataSourceQuery,
  DataSourcePage,
  DataSourceSort,
  DataSourceFilter,
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
} from './types.js'

// ---- features (v9 registration) ----
export { bstTableFeatures } from './features.js'
export type { BstTableFeatures } from './features.js'

// ---- cell spanning (A5) ----
export { computeCellSpans } from './spanning.js'
export type { BstCellSpan, BstSpanContext, SpanPlan, SpanRow, SpanCol } from './spanning.js'

// ---- column auto-size (D3) ----
export { computeAutoWidth, measureTextWidth } from './autosize.js'
export type { AutoSizeOptions } from './autosize.js'

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
export { useBstSettings, applySettingsOverrides, BST_SETTINGS_REGISTRY } from './settings.js'
export type {
  BstSettingKey,
  BstSettingsItem,
  BstSettingsGroup,
  BstSettingsModel,
  BstSettingsOptions,
  BstSettingsOverrides,
} from './settings.js'

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
} from './runtime.js'
export { runValidators, hasBlockingError } from './validation/validate.js'

// Re-export helpers so consumers get typed columns without importing
// @tanstack/react-table directly.
export { createColumnHelper, flexRender } from '@tanstack/react-table'
