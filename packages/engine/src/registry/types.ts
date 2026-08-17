import type * as React from 'react'
import type { RowData } from '@tanstack/react-table'

/**
 * Cell-type registry contract (Plan.md §2.3). A `CellType` bundles the read
 * renderer (hot path, plain DOM — NO MUI), an optional edit renderer (adapters
 * own this), parse/format (clipboard + text I/O) and a validator. Types are
 * selected per column via `columnDef.meta.type` and resolved once per column.
 *
 * Everything here is framework-owned and UI-agnostic so it stays tsc-clean and
 * lets MUI / shadcn adapters implement the same contract (§2.6).
 */

/** Severity of a validation finding. */
export type FieldErrorLevel = 'error' | 'warning'

/** A single validation finding for a cell or row (feeds L1–L3 error UI). */
export interface FieldError {
  level: FieldErrorLevel
  message: string
  code?: string
}

/** Option for option-based cells — singleSelect / multiSelect / radio (overlap #12). */
export interface BstOption {
  value: string
  label?: string
  /** Swatch / badge color (any CSS color). */
  color?: string
  /** Leading icon node (adapter-provided). */
  icon?: React.ReactNode
  /** Avatar / image URL rendered as a small circle. */
  avatar?: string
  /** Free-form image URL. */
  image?: string
  description?: string
  disabled?: boolean
}

/**
 * Per-column meta the registry + features read. Authored on `columnDef.meta`
 * and typed via the `columnMeta` slot on `tableFeatures` (no global declaration
 * merging — Plan.md §2.1). All fields optional; `type` defaults to `'text'`.
 */
export interface BstColumnMeta<TData extends RowData = any, TValue = any> {
  /** Selects the CellType from the registry. Default: `'text'`. */
  type?: string
  /** Free-form settings passed through to the CellType (precision, variant, …). */
  cellMeta?: Record<string, unknown>
  /** Force inline vs popup editing for this column (overrides the CellType default). */
  editMode?: 'inline' | 'popup'
  /** Whether this column is editable — static or per-row. Default: `false`. */
  editable?: boolean | ((row: TData) => boolean)
  /**
   * Access control (F3 column / F4 cell). Disable interaction for this column —
   * `true` disables the whole column; a predicate disables per row/cell. A
   * disabled cell is never editable and renders in a muted style; it cascades
   * under the grid `disabled` + `rowDisabled` options and overrides `editable`.
   * Selection + copy still work on a disabled cell.
   */
  disabled?: boolean | ((row: TData) => boolean)
  /** Options for option-based cells (singleSelect / multiSelect / radio). */
  options?: BstOption[]
  /**
   * Per-column filter UI in the filter row (AG4 / AG11). With `enableSetFilter` on,
   * `'set'` forces the **Set Filter** (a checklist of distinct values) for this
   * column, and `'condition'` opts back into the default operator input. When
   * unset, categorical columns (`singleSelect` / `multiSelect` / `radio` /
   * `boolean`) use the Set Filter and the rest use the condition input.
   *
   * **Multi-filter (AG11):** an **array** (e.g. `['condition', 'set']`) **stacks**
   * those filters in the row — a row must satisfy all of them (AND). Needs
   * `enableMultiFilter`; falls back to the first entry when it's off.
   */
  filter?: 'set' | 'condition' | Array<'set' | 'condition'>
  /**
   * Wrap this column's content onto multiple lines and let the row grow to fit it
   * (AG26). Turns off the single-line truncation for this column only — the row
   * sizes to the tallest cell. Independent of the grid-wide `enableAutoRowHeight`.
   */
  wrapText?: boolean
  /** Display format: an `Intl.*` options bag, or a shorthand string. */
  format?: string | Record<string, unknown>
  /** BCP-47 locale for number / date parse + format. */
  locale?: string
  /** Placeholder shown in empty editors. */
  placeholder?: string
  /** Column-level validator — runs after the CellType validator. */
  validate?: (
    value: TValue,
    ctx: CellValidateContext<TData>,
  ) => FieldError[] | Promise<FieldError[]>
  /** Conditional formatting (K1/K3): extra class names for the cell. */
  cellClassName?: (p: CellRenderProps<TData, TValue>) => string | undefined
  /** Conditional formatting (K1/K3): inline style / CSS vars for the cell. */
  cellStyle?: (p: CellRenderProps<TData, TValue>) => React.CSSProperties | undefined
  /** Custom CSS: extra class name(s) for this column's header cell (`<th>`). */
  headerClassName?: string
  /** Custom CSS: inline style / CSS vars for this column's header cell (`<th>`). */
  headerStyle?: React.CSSProperties
  /**
   * Cell spanning (A5): `'group'` auto-merges vertically-consecutive cells in this
   * column that share an equal value into one tall cell. Needs `enableCellSpanning`.
   * For explicit / column spans use the grid-level `getCellSpan`.
   */
  rowSpan?: 'group'
  /** Responsive priority (G4) — higher stays visible longer when the grid is
   * narrow; the lowest-priority columns hide first. Default 0. Needs `enableResponsive`. */
  responsivePriority?: number
  /** Text alignment for read + edit. */
  align?: 'left' | 'center' | 'right'
  /** Action-column button config (B10). */
  actions?: {
    edit?: boolean
    delete?: boolean
    duplicate?: boolean
    view?: boolean
  }
}

/** Bound per-cell API handed to renderers so action / file cells can drive the grid. */
export interface BstCellApi<TData extends RowData = any> {
  /** Whether this cell is currently in edit mode. */
  isEditing: boolean
  /** Whether editing is blocked for this cell (access control / not editable). */
  isDisabled: boolean
  /** Whether this cell (or its row session) holds an unsaved draft. */
  isDirty: boolean
  /** Enter edit mode for this cell (no-op when not editable). */
  startEditing: () => void
  /** Abandon the active edit, restoring the source value. */
  cancelEditing: () => void
  /** Persist a value for this cell per the save policy. */
  commitCell: (value: unknown) => void
  /** Begin a deferred row-edit session for this row (C2 ≡ I2). */
  editRow: () => void
  /** Commit the row session for this row. */
  saveRow: () => void
  /** Delete this row (I1 / row lifecycle). */
  deleteRow: () => void
  /** Duplicate this row with a fresh temp id. */
  duplicateRow: () => void
  /** Current validation findings for this cell. */
  errors: FieldError[]
}

/** Props passed to `renderRead`. Cheap + scalar-friendly (hot path). */
export interface CellRenderProps<TData extends RowData = any, TValue = unknown> {
  value: TValue
  row: TData
  rowId: string
  columnId: string
  meta: BstColumnMeta<TData, TValue>
  /** True when a dirty draft is being shown (deferred / row-session edits). */
  isDirty: boolean
  api: BstCellApi<TData>
}

/** Props passed to `renderEdit`. Adds the draft + commit/cancel lifecycle. */
export interface CellEditProps<TData extends RowData = any, TValue = unknown>
  extends CellRenderProps<TData, TValue> {
  /** Current draft value (seeded from the source value or an existing draft). */
  draft: TValue
  /** Update the local draft — does NOT persist until `commit`. */
  setDraft: (v: TValue) => void
  /** Persist per the save policy (Enter / explicit / blur). */
  commit: (override?: TValue) => void
  /** Abandon the edit, restoring the source value. */
  cancel: () => void
  /** Whether the editor should grab focus on mount. */
  autoFocus: boolean
}

/** Context handed to validators (supports cross-column + async — C3). */
export interface CellValidateContext<TData extends RowData = any> {
  row: TData
  rowId: string
  columnId: string
  meta: BstColumnMeta<TData>
  /** Read a sibling cell's current (draft-aware) value for cross-column rules. */
  getSiblingValue: (columnId: string) => unknown
  /** Aborts when a newer edit supersedes this async validation. */
  signal?: AbortSignal
}

/** A registered cell type (Plan.md §2.3). */
export interface CellType<TValue = unknown, TMeta = unknown, TData extends RowData = any> {
  /** Registry key — matched against `columnDef.meta.type`. */
  id: string
  /** Hot-path read renderer — plain DOM, no component library. */
  renderRead: (p: CellRenderProps<TData, TValue>) => React.ReactNode
  /** Edit renderer — adapters provide the rich version (MUI / shadcn). */
  renderEdit?: (p: CellEditProps<TData, TValue>) => React.ReactNode
  /** Inline (in-cell) vs popup (dialog) editing. Default: `'inline'`. */
  editMode?: 'inline' | 'popup'
  /** Parse typed / pasted text into a value (clipboard + text I/O). */
  parse?: (raw: string, meta: BstColumnMeta<TData, TValue>) => TValue
  /** Format a value for display + copy. */
  format?: (v: TValue, meta: BstColumnMeta<TData, TValue>) => string
  /** Built-in validator, composed before the column-level validator (C3). */
  validate?: (
    v: TValue,
    ctx: CellValidateContext<TData>,
  ) => FieldError[] | Promise<FieldError[]>
  /** When true the editor consumes arrow keys (keyboard-nav yields to it). */
  capturesArrowKeys?: boolean
  /**
   * When true the editor opens its own portalled overlay (e.g. a MUI `Select`
   * menu, a date-picker popper) that renders OUTSIDE this cell in the DOM.
   * The host then skips its default commit-on-blur — opening the overlay moves
   * focus out of the cell, which would otherwise commit and tear the editor down
   * before the user can pick a value. Such editors MUST commit/cancel themselves
   * (e.g. `commit(v)` on change, `cancel()`/`commit()` on close). Escape still
   * cancels via the host key handler. Default: false.
   */
  overlayEditor?: boolean
  /** Emptiness test used by validation (`required`) + placeholders. */
  isEmpty?: (v: TValue) => boolean
  /** Defaults merged under `columnDef.meta.cellMeta`. */
  defaultMeta?: Partial<TMeta>
}
