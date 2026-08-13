import type { RowData } from '@tanstack/react-table'
import {
  cellKey,
  splitCellKey,
  createInteractionStore,
  initialInteractionState,
} from './interaction/store.js'
import type {
  CellRef,
  InteractionState,
  InteractionStore,
} from './interaction/store.js'
import type { CellTypeRegistry } from './registry/registry.js'
import type {
  BstCellApi,
  BstColumnMeta,
  CellValidateContext,
  FieldError,
} from './registry/types.js'
import { hasBlockingError, runValidators } from './validation/validate.js'

export type SaveTrigger = 'enter' | 'blur' | 'explicit'
export type CommitPolicy = 'blockCommitOnError' | 'commitButFlag'

export interface CellChange<TData> {
  rowId: string
  columnId: string
  value: unknown
  row: TData | undefined
}

/** One unsaved cell edit — previous → new value, plus display strings formatted
 *  via the column's cell type. What the review-changes sheet lists per cell. */
export interface BstCellEdit<TData> {
  rowId: string
  columnId: string
  /** The data field written (`cellMeta.field` ?? `accessorKey` ?? column id). */
  field: string
  /** The value currently upstream (before the save). */
  oldValue: unknown
  /** The pending draft value. */
  newValue: unknown
  /** `oldValue` formatted for display (cell-type `format`, else `String`). */
  oldText: string
  /** `newValue` formatted for display. */
  newText: string
  /** The row as it is upstream, when still present. */
  row: TData | undefined
}

/** A row's unsaved edits, grouped — `patch` is a ready-made PATCH body. */
export interface BstRowChange<TData> {
  rowId: string
  /** The row as it is upstream (before the save). */
  original: TData | undefined
  /** The row with every pending edit applied (what it becomes after the save). */
  updated: TData | undefined
  /** `field → new value` for just the changed fields. */
  patch: Record<string, unknown>
  changes: BstCellEdit<TData>[]
}

/**
 * The payload of ONE save action (I2/I4). Handed to `onSave` exactly once per
 * confirm — never per cell/row/column — so the backend call stays a single
 * batched request whichever granularity the API wants: `changes` (cell-wise),
 * `rows[].patch` (row-wise), or `next` (whole grid).
 */
export interface BstSaveEvent<TData> {
  /** Every pending cell edit, flat. */
  changes: BstCellEdit<TData>[]
  /** The same edits grouped per row. */
  rows: BstRowChange<TData>[]
  /** The full next data array (what `onDataChange` receives after the save). */
  next: TData[]
}

/** A visual (paint-order) coordinate for a cell — row + column index. */
export interface VisualIndex {
  r: number
  c: number
}

/** Options for `moveActive` — how the keyboard cursor should step. */
export interface MoveActiveOptions {
  /** Keep the anchor and only move the focus end (Shift+Arrow range grow). */
  extend?: boolean
  /** Wrap to the previous/next row when stepping off a row edge (Tab). */
  wrap?: boolean
  /** Jump to the first/last row/column in the step direction (Home/End). */
  toEdge?: boolean
}

/**
 * Everything the runtime needs from the current render, refreshed each render by
 * the hook. Keeping it behind a ref means the stable runtime methods always read
 * fresh data / options without the runtime object itself changing identity.
 */
export interface RuntimeCtx<TData extends RowData> {
  registry: CellTypeRegistry
  data: TData[]
  rowIndexById: Map<string, number>
  getRowId: (row: TData, index: number) => string
  metaByColumn: Map<string, BstColumnMeta<TData>>
  fieldByColumn: Map<string, string>
  columnIds: string[]
  /** Row ids in current visual (post sort/filter/pagination) order. */
  visibleRowIds: string[]
  /** Row ids after filter + sort but BEFORE pagination — the full column for
   *  copy-column (H3), which must span every page, not just the visible one. */
  allRowIds: string[]
  /** Visible leaf column ids in current left-to-right order. */
  visibleColumnIds: string[]
  /** `rowId → visual row index` for the current render. */
  rowVisualIndex: Map<string, number>
  /** `columnId → visual column index` for the current render. */
  colVisualIndex: Map<string, number>
  enableEditing: boolean
  enableValidation: boolean
  enableCellSelection: boolean
  enableClipboard: boolean
  /** Column-copy (H3) enabled. `false` disables `selectColumn`/`copyColumn`. Default: true. */
  enableCopyColumn?: boolean
  /** Row-copy (H2) enabled. `false` disables `selectRow`/`copyRow`. Default: true. */
  enableCopyRow?: boolean
  enableUndoRedo: boolean
  policy: CommitPolicy
  saveOn: SaveTrigger[]
  /** `mode: 'batch'` — every commit (and paste) defers to a draft; nothing
   *  persists until an explicit save (`commitAll` / the review sheet). */
  batchEditing: boolean
  gridDisabled: boolean
  rowDisabled?: (row: TData) => boolean
  cellDisabled?: (ctx: { row: TData; rowId: string; columnId: string }) => boolean
  onDataChange?: (next: TData[]) => void
  /** Batched save hook — ONE call per save action with the full change set.
   *  A rejection aborts the save and keeps every draft (nothing is lost). */
  onSave?: (event: BstSaveEvent<TData>) => void | Promise<void>
  createRow?: () => Partial<TData>
  tempIdPrefix: string
}

/** Resolved access for a cell (F1–F4 cascade). */
export interface CellAccess {
  /** Interaction is turned off (grid / row / column / cell disable). */
  disabled: boolean
  /** The cell can be edited (editing on, not disabled, `meta.editable` true). */
  editable: boolean
}

export interface BstRuntime<TData extends RowData> {
  store: InteractionStore
  updateCtx: (ctx: RuntimeCtx<TData>) => void
  reset: () => void

  // ---- editing ----
  /** Resolved save triggers (`enter`/`blur`/`explicit`). The inline editor
   *  consults these before auto-committing on Enter or blur. */
  saveOn: SaveTrigger[]
  startEditing: (rowId: string, columnId: string) => void
  cancelEditing: () => void
  setDraft: (rowId: string, columnId: string, value: unknown) => void
  commitCell: (rowId: string, columnId: string, value: unknown) => void
  beginRowSession: (rowId: string) => void
  commitRowSession: (rowId: string) => Promise<boolean>
  cancelRowSession: () => void
  /** Persist every outstanding draft across all rows in one write (bulk save). */
  commitAll: () => Promise<boolean>
  /** Discard every outstanding draft across all rows. */
  cancelAll: () => void
  getDirtyChanges: () => Array<CellChange<TData>>
  /** Every unsaved edit as old → new (+ formatted display strings) — what the
   *  review-changes sheet lists. Ordered by first-edit time. */
  getChangeSet: () => Array<BstCellEdit<TData>>
  /** Discard ONE unsaved edit — the cell reverts to its upstream value. */
  revertCell: (rowId: string, columnId: string) => void
  /** Discard every unsaved edit in a row. */
  revertRow: (rowId: string) => void
  /** Format a value for display using the column's cell type (`format`). */
  formatValue: (columnId: string, value: unknown) => string

  // ---- undo / redo (C5) ----
  /** Revert the last committed data change (`onDataChange`). */
  undo: () => void
  /** Re-apply the last undone data change. */
  redo: () => void
  /** Whether an undo is available. */
  canUndo: () => boolean
  /** Whether a redo is available. */
  canRedo: () => boolean

  // ---- selection (cell / range) ----
  /** Set the active cell, collapsing any range to a single cell. */
  setActiveCell: (rowId: string, columnId: string) => void
  /** Move the focus end to a cell, keeping the anchor (Shift+click / drag). */
  extendSelectionTo: (rowId: string, columnId: string) => void
  /** Step the active cell by a delta with wrap / edge / extend options (keyboard). */
  moveActive: (dRow: number, dCol: number, opts?: MoveActiveOptions) => void
  /** Select the whole visible grid (Ctrl/Cmd+A). */
  selectAll: () => void
  /** Select an entire column (Ctrl+Space) — copy grabs ALL pages (H3). */
  selectColumn: (columnId: string) => void
  /** Select an entire row (Shift+Space) — all visible columns (H2). */
  selectRow: (rowId: string) => void
  /** Clear the active cell + range. */
  clearSelection: () => void
  /** Visual (paint-order) coordinate of a cell, or `null` when off-grid. */
  visualIndexOf: (rowId: string, columnId: string) => VisualIndex | null
  /** The row / column ids inside the current selection rectangle (visual order). */
  getSelectionMatrix: () => { rowIds: string[]; columnIds: string[] } | null

  // ---- clipboard (H1–H4) ----
  /** TSV of the current selection (values formatted per cell type), or `null`. */
  getSelectionClipboardText: () => string | null
  /** TSV of an entire column across ALL pages (filtered+sorted), or `null` (H3). */
  getColumnClipboardText: (columnId: string) => string | null
  /** TSV of an entire row — all visible columns (H2), or `null`. */
  getRowClipboardText: (rowId: string) => string | null
  /** Copy the selection to the system clipboard; resolves with the copied text. */
  copySelection: () => Promise<string>
  /** Select + copy an entire column (all pages) to the clipboard (H3). */
  copyColumn: (columnId: string) => Promise<string>
  /** Select + copy an entire row to the clipboard (H2). */
  copyRow: (rowId: string) => Promise<string>
  /** Parse TSV and write it from the selection's top-left, honouring editability. */
  pasteFromText: (text: string) => void

  // ---- resolution helpers (read by the renderer) ----
  isCellEditable: (rowId: string, columnId: string) => boolean
  isRowDisabled: (rowId: string) => boolean
  /** F3/F4 — whether interaction is disabled for a cell (grid→row→column→cell). */
  isCellDisabled: (rowId: string, columnId: string) => boolean
  /** Resolved `{ disabled, editable }` access for a cell (F1–F4 cascade). */
  getCellAccess: (rowId: string, columnId: string) => CellAccess
  /** Lock/unlock a whole column's editing at runtime (Columns-menu control). */
  setColumnEditable: (columnId: string, on: boolean) => void
  /** The column's current edit-allowed flag (override, else `meta.editable`). */
  getColumnEditable: (columnId: string) => boolean
  metaOf: (columnId: string) => BstColumnMeta<TData>
  sourceValue: (rowId: string, columnId: string) => unknown
  draftAwareValue: (rowId: string, columnId: string) => unknown

  // ---- validation ----
  validateCell: (rowId: string, columnId: string, value: unknown) => void
  validateRow: (rowId: string) => Promise<boolean>

  // ---- row lifecycle ----
  addRow: (init?: Partial<TData>) => string
  deleteRow: (rowId: string) => void
  duplicateRow: (rowId: string) => string

  // ---- render glue ----
  buildCellApi: (
    rowId: string,
    columnId: string,
    row: TData | undefined,
    snapshot: { isEditing: boolean; isDirty: boolean; errors: FieldError[] },
  ) => BstCellApi<TData>
}

export function createRuntime<TData extends RowData>(
  initialCtx: RuntimeCtx<TData>,
): BstRuntime<TData> {
  const store = createInteractionStore()
  let ctx = initialCtx
  let tempCounter = 0
  const abortByCell = new Map<string, AbortController>()
  const genByCell = new Map<string, number>()
  // Undo/redo (C5): snapshots of the whole `data` array, captured before each
  // committed mutation. Snapshot-based (not command-based) because data is
  // controlled — undo just replays a previous array through `onDataChange`.
  const undoStack: TData[][] = []
  const redoStack: TData[][] = []

  const set = (fn: (s: InteractionState) => InteractionState) => store.setState(fn)

  /* ------------------------------------------------------------- resolution */

  const metaOf = (columnId: string): BstColumnMeta<TData> =>
    ctx.metaByColumn.get(columnId) ?? {}

  const fieldOf = (columnId: string): string =>
    ctx.fieldByColumn.get(columnId) ?? columnId

  const rowOf = (rowId: string): TData | undefined => {
    const idx = ctx.rowIndexById.get(rowId)
    return idx == null ? undefined : ctx.data[idx]
  }

  const getField = (row: TData | undefined, columnId: string): unknown =>
    row == null ? undefined : (row as Record<string, unknown>)[fieldOf(columnId)]

  const sourceValue = (rowId: string, columnId: string): unknown =>
    getField(rowOf(rowId), columnId)

  const draftAwareValue = (rowId: string, columnId: string): unknown => {
    const s = store.getState()
    const key = cellKey(rowId, columnId)
    return key in s.drafts ? s.drafts[key] : sourceValue(rowId, columnId)
  }

  const formatValue = (columnId: string, v: unknown): string => {
    const meta = metaOf(columnId)
    const cellType = ctx.registry.get(meta.type)
    if (cellType.format) return cellType.format(v, meta)
    return v == null ? '' : String(v)
  }

  const isRowDisabled = (rowId: string): boolean => {
    if (ctx.gridDisabled) return true
    const row = rowOf(rowId)
    return row != null && !!ctx.rowDisabled?.(row)
  }

  const isColumnDisabledForRow = (columnId: string, row: TData | undefined): boolean => {
    const d = metaOf(columnId).disabled
    if (d == null) return false
    if (typeof d === 'function') return row != null && !!d(row)
    return !!d
  }

  /** F1–F4 disable cascade: grid → row → column → cell. */
  const isCellDisabled = (rowId: string, columnId: string): boolean => {
    if (isRowDisabled(rowId)) return true // grid (F1) + row (F2)
    const row = rowOf(rowId)
    if (isColumnDisabledForRow(columnId, row)) return true // column (F3) + per-row cell (F4)
    if (ctx.cellDisabled && row != null && !!ctx.cellDisabled({ row, rowId, columnId })) {
      return true // grid-level cell predicate (F4)
    }
    return false
  }

  const isCellEditable = (rowId: string, columnId: string): boolean => {
    if (!ctx.enableEditing) return false
    const meta = metaOf(columnId)
    if (meta.type === 'action') return false
    if (isCellDisabled(rowId, columnId)) return false
    // Runtime per-column override (Columns-menu lock/unlock) wins over meta.editable.
    const override = store.getState().columnEdit[columnId]
    if (override !== undefined) return override
    const editable = meta.editable ?? false
    if (typeof editable === 'function') {
      const row = rowOf(rowId)
      return row != null && !!editable(row)
    }
    return !!editable
  }

  /** Lock/unlock editing for a whole column at runtime (Columns-menu control).
   *  `on=false` makes the column read-only; `on=true` allows editing (subject to
   *  `enableEditing` + not disabled). Overrides `meta.editable`. */
  const setColumnEditable = (columnId: string, on: boolean) => {
    set((s) => ({ ...s, columnEdit: { ...s.columnEdit, [columnId]: on } }))
  }

  /** The resolved per-column edit-allowed flag as shown in the menu (the runtime
   *  override if set, else the column's static `meta.editable`, coerced to bool). */
  const getColumnEditable = (columnId: string): boolean => {
    const override = store.getState().columnEdit[columnId]
    if (override !== undefined) return override
    const editable = metaOf(columnId).editable
    return typeof editable === 'function' ? true : !!editable
  }

  const getCellAccess = (rowId: string, columnId: string): CellAccess => ({
    disabled: isCellDisabled(rowId, columnId),
    editable: isCellEditable(rowId, columnId),
  })

  /* ------------------------------------------------------------- validation */

  const makeCtx = (rowId: string, columnId: string): CellValidateContext<TData> => {
    const controller = new AbortController()
    const key = cellKey(rowId, columnId)
    abortByCell.get(key)?.abort()
    abortByCell.set(key, controller)
    return {
      row: rowOf(rowId) as TData,
      rowId,
      columnId,
      meta: metaOf(columnId),
      getSiblingValue: (sibId) => draftAwareValue(rowId, sibId),
      signal: controller.signal,
    }
  }

  const applyErrors = (rowId: string, columnId: string, errors: FieldError[]) => {
    const key = cellKey(rowId, columnId)
    set((s) => {
      const cellErrors = { ...s.cellErrors }
      if (errors.length) cellErrors[key] = errors
      else delete cellErrors[key]
      const pending = { ...s.pending }
      delete pending[key]
      return { ...s, cellErrors, pending }
    })
  }

  /**
   * Run a cell's validators and apply the findings with last-write-wins (a newer
   * run for the same cell supersedes an older one's result). Returns the findings
   * synchronously when every validator is sync, otherwise a Promise that resolves
   * once they settle. Shared by live validation and the commit paths.
   */
  const runCellValidation = (
    rowId: string,
    columnId: string,
    value: unknown,
  ): FieldError[] | Promise<FieldError[]> => {
    const cellType = ctx.registry.get(metaOf(columnId).type)
    const key = cellKey(rowId, columnId)
    const gen = (genByCell.get(key) ?? 0) + 1
    genByCell.set(key, gen)
    const result = runValidators<TData>(value, cellType, makeCtx(rowId, columnId))
    if (Array.isArray(result)) {
      applyErrors(rowId, columnId, result)
      return result
    }
    set((s) => ({ ...s, pending: { ...s.pending, [key]: true } }))
    return result.then(
      (errors) => {
        if (genByCell.get(key) === gen) applyErrors(rowId, columnId, errors)
        return errors
      },
      () => {
        if (genByCell.get(key) === gen) applyErrors(rowId, columnId, [])
        return [] as FieldError[]
      },
    )
  }

  /**
   * Live validation (as the user types): surfaces errors and returns the sync
   * findings immediately — `[]` while an async validator is still in flight (it is
   * applied when it settles). Does NOT gate commits; use `validateCellForCommit`.
   */
  const validateCell = (rowId: string, columnId: string, value: unknown): FieldError[] => {
    if (!ctx.enableValidation) return []
    const result = runCellValidation(rowId, columnId, value)
    return Array.isArray(result) ? result : []
  }

  /**
   * Validate a cell for a COMMIT. Surfaces errors like `validateCell`, but its
   * result actually gates the write, so an async validator can no longer be
   * bypassed — the earlier bug was that `validateCell` returned `[]` while the
   * promise was in flight, so `commitCell` / `pasteFromText` persisted the invalid
   * value before it resolved. Returns whether the commit is blocked: synchronously
   * when validators are sync (preserving the synchronous commit path), otherwise a
   * Promise. Only `blockCommitOnError` blocks; `commitButFlag` flags but commits.
   */
  const validateCellForCommit = (
    rowId: string,
    columnId: string,
    value: unknown,
  ): boolean | Promise<boolean> => {
    if (!ctx.enableValidation) return false
    if (ctx.policy !== 'blockCommitOnError') {
      // Surface errors (non-blocking); the commit proceeds regardless.
      validateCell(rowId, columnId, value)
      return false
    }
    const result = runCellValidation(rowId, columnId, value)
    return Array.isArray(result)
      ? hasBlockingError(result)
      : result.then((errors) => hasBlockingError(errors))
  }

  const validateRow = async (rowId: string): Promise<boolean> => {
    if (!ctx.enableValidation) return true
    const results = await Promise.all(
      ctx.columnIds.map(async (columnId) => {
        const cellType = ctx.registry.get(metaOf(columnId).type)
        const value = draftAwareValue(rowId, columnId)
        const errors = await Promise.resolve(
          runValidators<TData>(value, cellType, makeCtx(rowId, columnId)),
        )
        applyErrors(rowId, columnId, errors)
        return errors
      }),
    )
    return !results.some((errs) => hasBlockingError(errs))
  }

  /* ---------------------------------------------------------------- editing */

  const startEditing = (rowId: string, columnId: string) => {
    if (!isCellEditable(rowId, columnId)) return
    set((s) => ({ ...s, editingCell: { rowId, columnId } }))
  }

  const cancelEditing = () => {
    // Invalidate any in-flight async commit for the cell being edited: bumping its
    // generation makes the pending validation's result a no-op, so an async rule
    // that resolves after Escape can't quietly commit the abandoned value.
    const cell = store.getState().editingCell
    if (cell) {
      const key = cellKey(cell.rowId, cell.columnId)
      genByCell.set(key, (genByCell.get(key) ?? 0) + 1)
    }
    set((s) => ({ ...s, editingCell: null }))
  }

  const setDraft = (rowId: string, columnId: string, value: unknown) => {
    const key = cellKey(rowId, columnId)
    set((s) => ({
      ...s,
      drafts: { ...s.drafts, [key]: value },
      dirtyCells: { ...s.dirtyCells, [key]: true },
      dirtyRows: { ...s.dirtyRows, [rowId]: true },
    }))
  }

  const clearCellDraft = (s: InteractionState, rowId: string, columnId: string): InteractionState => {
    const key = cellKey(rowId, columnId)
    const drafts = { ...s.drafts }
    delete drafts[key]
    const dirtyCells = { ...s.dirtyCells }
    delete dirtyCells[key]
    const stillDirty = Object.keys(dirtyCells).some((k) => k.startsWith(rowId + '::'))
    const dirtyRows = { ...s.dirtyRows }
    if (!stillDirty) delete dirtyRows[rowId]
    return { ...s, drafts, dirtyCells, dirtyRows }
  }

  /* ---------------------------------------------------------- undo / redo */

  const updateDepths = () => {
    set((s) =>
      s.undoDepth === undoStack.length && s.redoDepth === redoStack.length
        ? s
        : { ...s, undoDepth: undoStack.length, redoDepth: redoStack.length },
    )
  }

  /** Route every committed data mutation here: snapshots the prior data for undo. */
  const commitData = (next: TData[]) => {
    if (!ctx.onDataChange) return
    if (ctx.enableUndoRedo) {
      undoStack.push(ctx.data)
      redoStack.length = 0
      updateDepths()
    }
    ctx.onDataChange(next)
  }

  const undo = () => {
    if (!ctx.enableUndoRedo || !ctx.onDataChange || undoStack.length === 0) return
    const prev = undoStack.pop() as TData[]
    redoStack.push(ctx.data)
    updateDepths()
    ctx.onDataChange(prev)
  }

  const redo = () => {
    if (!ctx.enableUndoRedo || !ctx.onDataChange || redoStack.length === 0) return
    const next = redoStack.pop() as TData[]
    undoStack.push(ctx.data)
    updateDepths()
    ctx.onDataChange(next)
  }

  const canUndo = () => undoStack.length > 0
  const canRedo = () => redoStack.length > 0

  /** The next data array with a batch of cell changes applied (by rowId, never index). */
  const applyChanges = (
    changes: Array<{ rowId: string; columnId: string; value: unknown }>,
  ): TData[] => {
    let next = ctx.data
    for (const ch of changes) {
      next = next.map((row, i) => {
        if (ctx.getRowId(row, i) !== ch.rowId) return row
        return { ...(row as object), [fieldOf(ch.columnId)]: ch.value } as unknown as TData
      })
    }
    return next
  }

  const persist = (changes: Array<{ rowId: string; columnId: string; value: unknown }>) => {
    if (!changes.length || !ctx.onDataChange) return
    commitData(applyChanges(changes))
  }

  /** The `onSave` payload for a batch of changes: flat edits (old → new with
   *  display strings), per-row groups with a `patch` body, and the next data. */
  const buildSaveEvent = (
    changes: Array<{ rowId: string; columnId: string; value: unknown }>,
  ): BstSaveEvent<TData> => {
    const next = applyChanges(changes)
    const nextById = new Map<string, TData>()
    next.forEach((row, i) => nextById.set(ctx.getRowId(row, i), row))
    const edits: BstCellEdit<TData>[] = changes.map((ch) => {
      const oldValue = sourceValue(ch.rowId, ch.columnId)
      return {
        rowId: ch.rowId,
        columnId: ch.columnId,
        field: fieldOf(ch.columnId),
        oldValue,
        newValue: ch.value,
        oldText: formatValue(ch.columnId, oldValue),
        newText: formatValue(ch.columnId, ch.value),
        row: rowOf(ch.rowId),
      }
    })
    const rowsById = new Map<string, BstRowChange<TData>>()
    for (const e of edits) {
      let rc = rowsById.get(e.rowId)
      if (!rc) {
        rc = {
          rowId: e.rowId,
          original: rowOf(e.rowId),
          updated: nextById.get(e.rowId),
          patch: {},
          changes: [],
        }
        rowsById.set(e.rowId, rc)
      }
      rc.patch[e.field] = e.newValue
      rc.changes.push(e)
    }
    return { changes: edits, rows: Array.from(rowsById.values()), next }
  }

  /**
   * Flush a batch of drafts upstream as ONE write. With `onSave` set, the whole
   * batch is announced through it FIRST (a single call — the one backend request;
   * never per cell/row/column) and awaited: a rejection aborts the save and keeps
   * every draft, so a failed API call loses nothing. Only after it resolves is the
   * data committed (`onDataChange`) and the drafts cleared.
   */
  const saveChanges = async (
    changes: Array<{ rowId: string; columnId: string; value: unknown }>,
  ): Promise<boolean> => {
    if (changes.length) {
      if (ctx.onSave) {
        try {
          await ctx.onSave(buildSaveEvent(changes))
        } catch {
          return false
        }
        // Recompute from the CURRENT data — an external update (I5) may have
        // landed while the save call was in flight.
        if (ctx.onDataChange) commitData(applyChanges(changes))
      } else {
        persist(changes)
      }
    }
    set((s) => {
      let next: InteractionState = s
      for (const ch of changes) next = clearCellDraft(next, ch.rowId, ch.columnId)
      return { ...next, editingCell: null, rowSession: null }
    })
    return true
  }

  const commitCell = (rowId: string, columnId: string, value: unknown) => {
    if (!isCellEditable(rowId, columnId)) {
      cancelEditing()
      return
    }

    // Deferred commits — batch mode (everything defers until an explicit save)
    // or a row session: keep the draft, never persist mid-session. Validation
    // still runs (non-blocking) so errors surface on the draft; the real gate is
    // validateRow() at commitRowSession / commitAll.
    if (ctx.batchEditing || store.getState().rowSession === rowId) {
      if (ctx.enableValidation) validateCell(rowId, columnId, value)
      setDraft(rowId, columnId, value)
      cancelEditing()
      return
    }

    const finish = (blocked: boolean) => {
      if (blocked) {
        // Hold the invalid value as a dirty draft + surface the error; don't write upstream.
        setDraft(rowId, columnId, value)
        cancelEditing()
        return
      }
      persist([{ rowId, columnId, value }])
      set((s) => {
        const cleared = clearCellDraft(s, rowId, columnId)
        return { ...cleared, editingCell: null }
      })
    }

    const gate = validateCellForCommit(rowId, columnId, value)
    if (typeof gate === 'boolean') {
      // Sync validators (or none): commit in the same tick — unchanged behaviour.
      finish(gate)
    } else {
      // Async validator: hold the editor open until it settles, THEN decide, so the
      // write is gated on the real result. Drop the commit if a newer edit or a
      // cancel (Escape) has superseded it (generation guard).
      const key = cellKey(rowId, columnId)
      const gen = genByCell.get(key)
      void gate.then((blocked) => {
        if (genByCell.get(key) === gen) finish(blocked)
      })
    }
  }

  const beginRowSession = (rowId: string) => {
    if (ctx.gridDisabled || isRowDisabled(rowId)) return
    set((s) => ({ ...s, rowSession: rowId }))
  }

  const commitRowSession = async (rowId: string): Promise<boolean> => {
    const s0 = store.getState()
    const changes = Object.keys(s0.drafts)
      .filter((k) => k.startsWith(rowId + '::'))
      .map((k) => ({
        rowId,
        columnId: k.slice(rowId.length + 2),
        value: s0.drafts[k],
      }))

    if (ctx.enableValidation) {
      const ok = await validateRow(rowId)
      if (!ok && ctx.policy === 'blockCommitOnError') return false
    }

    return saveChanges(changes)
  }

  const cancelRowSession = () => {
    const rowId = store.getState().rowSession
    set((s) => {
      if (!rowId) return { ...s, editingCell: null }
      const drafts: Record<string, unknown> = {}
      for (const k of Object.keys(s.drafts)) if (!k.startsWith(rowId + '::')) drafts[k] = s.drafts[k]
      const dirtyCells: Record<string, true> = {}
      for (const k of Object.keys(s.dirtyCells))
        if (!k.startsWith(rowId + '::')) dirtyCells[k] = true
      const dirtyRows = { ...s.dirtyRows }
      delete dirtyRows[rowId]
      const cellErrors: Record<string, FieldError[]> = {}
      for (const k of Object.keys(s.cellErrors))
        if (!k.startsWith(rowId + '::')) cellErrors[k] = s.cellErrors[k]
      return { ...s, drafts, dirtyCells, dirtyRows, cellErrors, rowSession: null, editingCell: null }
    })
  }

  const commitAll = async (): Promise<boolean> => {
    const s0 = store.getState()
    const keys = Object.keys(s0.drafts)
    if (!keys.length) return true
    const changes = keys.map((k) => {
      const idx = k.indexOf('::')
      return { rowId: k.slice(0, idx), columnId: k.slice(idx + 2), value: s0.drafts[k] }
    })
    if (ctx.enableValidation) {
      const rows = Array.from(new Set(changes.map((c) => c.rowId)))
      const oks = await Promise.all(rows.map((r) => validateRow(r)))
      if (oks.some((ok) => !ok) && ctx.policy === 'blockCommitOnError') return false
    }
    return saveChanges(changes)
  }

  const cancelAll = () => {
    // Discard drafts only — keep selection + undo history intact.
    set((s) => ({
      ...s,
      drafts: {},
      dirtyCells: {},
      dirtyRows: {},
      cellErrors: {},
      rowErrors: {},
      pending: {},
      editingCell: null,
      rowSession: null,
    }))
  }

  const getDirtyChanges = (): Array<CellChange<TData>> => {
    const s = store.getState()
    return Object.keys(s.dirtyCells).map((key) => {
      const idx = key.indexOf('::')
      const rowId = key.slice(0, idx)
      const columnId = key.slice(idx + 2)
      return { rowId, columnId, value: s.drafts[key], row: rowOf(rowId) }
    })
  }

  /** Every unsaved edit as old → new — what the review-changes sheet renders.
   *  Key order (= first-edit order) is preserved so the list is stable. */
  const getChangeSet = (): Array<BstCellEdit<TData>> => {
    const s = store.getState()
    return Object.keys(s.dirtyCells).map((key) => {
      const { rowId, columnId } = splitCellKey(key)
      const oldValue = sourceValue(rowId, columnId)
      const newValue = s.drafts[key]
      return {
        rowId,
        columnId,
        field: fieldOf(columnId),
        oldValue,
        newValue,
        oldText: formatValue(columnId, oldValue),
        newText: formatValue(columnId, newValue),
        row: rowOf(rowId),
      }
    })
  }

  /** Discard one unsaved edit: drop its draft, dirty flag, errors and any
   *  in-flight async validation — the cell reverts to the upstream value. */
  const revertCell = (rowId: string, columnId: string) => {
    const key = cellKey(rowId, columnId)
    genByCell.set(key, (genByCell.get(key) ?? 0) + 1)
    set((s) => {
      const cleared = clearCellDraft(s, rowId, columnId)
      const cellErrors = { ...cleared.cellErrors }
      delete cellErrors[key]
      const pending = { ...cleared.pending }
      delete pending[key]
      const editingCell =
        s.editingCell?.rowId === rowId && s.editingCell.columnId === columnId
          ? null
          : s.editingCell
      return { ...cleared, cellErrors, pending, editingCell }
    })
  }

  /** Discard every unsaved edit in a row. */
  const revertRow = (rowId: string) => {
    set((s) => cancelDraftsFor(s, rowId))
  }

  /* ----------------------------------------------------------- row lifecycle */

  const nextTempId = (): string => `${ctx.tempIdPrefix}${++tempCounter}`

  const addRow = (init?: Partial<TData>): string => {
    const base = { ...(ctx.createRow?.() ?? {}), ...(init ?? {}) } as Record<string, unknown>
    const id = nextTempId()
    if (base.id == null) base.id = id
    const row = base as unknown as TData
    commitData([...ctx.data, row])
    return id
  }

  const deleteRow = (rowId: string) => {
    const next = ctx.data.filter((row, i) => ctx.getRowId(row, i) !== rowId)
    commitData(next)
    set((s) => cancelDraftsFor(s, rowId))
  }

  const duplicateRow = (rowId: string): string => {
    const idx = ctx.rowIndexById.get(rowId)
    if (idx == null) return ''
    const original = ctx.data[idx] as Record<string, unknown>
    const id = nextTempId()
    const copy = { ...original, id } as unknown as TData
    const next = [...ctx.data]
    next.splice(idx + 1, 0, copy)
    commitData(next)
    return id
  }

  const cancelDraftsFor = (s: InteractionState, rowId: string): InteractionState => {
    const prune = <V,>(obj: Record<string, V>): Record<string, V> => {
      const out: Record<string, V> = {}
      for (const k of Object.keys(obj)) if (!k.startsWith(rowId + '::')) out[k] = obj[k]
      return out
    }
    const dirtyRows = { ...s.dirtyRows }
    delete dirtyRows[rowId]
    const rowErrors = { ...s.rowErrors }
    delete rowErrors[rowId]
    return {
      ...s,
      drafts: prune(s.drafts),
      dirtyCells: prune(s.dirtyCells),
      cellErrors: prune(s.cellErrors),
      pending: prune(s.pending),
      dirtyRows,
      rowErrors,
      editingCell:
        s.editingCell?.rowId === rowId ? null : s.editingCell,
      rowSession: s.rowSession === rowId ? null : s.rowSession,
    }
  }

  /* ------------------------------------------------------------- selection */

  const clamp = (n: number, lo: number, hi: number): number =>
    n < lo ? lo : n > hi ? hi : n

  const visualIndexOf = (rowId: string, columnId: string): VisualIndex | null => {
    const r = ctx.rowVisualIndex.get(rowId)
    const c = ctx.colVisualIndex.get(columnId)
    return r == null || c == null ? null : { r, c }
  }

  const setActiveCell = (rowId: string, columnId: string) => {
    if (!ctx.enableCellSelection) return
    set((s) => ({
      ...s,
      activeCell: { rowId, columnId },
      anchorCell: { rowId, columnId },
      wholeSelect: null,
    }))
  }

  const extendSelectionTo = (rowId: string, columnId: string) => {
    if (!ctx.enableCellSelection) return
    set((s) => ({
      ...s,
      activeCell: { rowId, columnId },
      anchorCell: s.anchorCell ?? s.activeCell ?? { rowId, columnId },
      wholeSelect: null,
    }))
  }

  const clearSelection = () => {
    set((s) =>
      s.activeCell == null && s.anchorCell == null && s.wholeSelect == null
        ? s
        : { ...s, activeCell: null, anchorCell: null, wholeSelect: null },
    )
  }

  /** Select an entire column — the visible rows highlight; copy grabs ALL rows
   *  (all pages) via the `wholeSelect` marker. (H3 copy-column.) */
  const selectColumn = (columnId: string) => {
    if (!ctx.enableCellSelection || ctx.enableCopyColumn === false) return
    const rows = ctx.visibleRowIds
    if (rows.length === 0 || !ctx.visibleColumnIds.includes(columnId)) return
    set((s) => ({
      ...s,
      anchorCell: { rowId: rows[0], columnId },
      activeCell: { rowId: rows[rows.length - 1], columnId },
      wholeSelect: { type: 'column', id: columnId },
    }))
  }

  /** Select an entire row (all visible columns). (H2 copy-row.) */
  const selectRow = (rowId: string) => {
    if (!ctx.enableCellSelection || ctx.enableCopyRow === false) return
    const cols = ctx.visibleColumnIds
    if (cols.length === 0 || !ctx.visibleRowIds.includes(rowId)) return
    set((s) => ({
      ...s,
      anchorCell: { rowId, columnId: cols[0] },
      activeCell: { rowId, columnId: cols[cols.length - 1] },
      wholeSelect: { type: 'row', id: rowId },
    }))
  }

  const selectAll = () => {
    if (!ctx.enableCellSelection) return
    const rows = ctx.visibleRowIds
    const cols = ctx.visibleColumnIds
    if (rows.length === 0 || cols.length === 0) return
    set((s) => ({
      ...s,
      anchorCell: { rowId: rows[0], columnId: cols[0] },
      activeCell: { rowId: rows[rows.length - 1], columnId: cols[cols.length - 1] },
      wholeSelect: null,
    }))
  }

  const moveActive = (dRow: number, dCol: number, opts: MoveActiveOptions = {}) => {
    if (!ctx.enableCellSelection) return
    const rows = ctx.visibleRowIds
    const cols = ctx.visibleColumnIds
    if (rows.length === 0 || cols.length === 0) return
    const cur = store.getState().activeCell
    let r: number
    let c: number
    if (!cur) {
      r = 0
      c = 0
    } else {
      r = ctx.rowVisualIndex.get(cur.rowId) ?? 0
      c = ctx.colVisualIndex.get(cur.columnId) ?? 0
      if (opts.toEdge) {
        if (dRow < 0) r = 0
        else if (dRow > 0) r = rows.length - 1
        if (dCol < 0) c = 0
        else if (dCol > 0) c = cols.length - 1
      } else if (opts.wrap) {
        let nc = c + dCol
        let nr = r + dRow
        if (nc >= cols.length) {
          nc = 0
          nr += 1
        } else if (nc < 0) {
          nc = cols.length - 1
          nr -= 1
        }
        if (nr < 0 || nr >= rows.length) return
        r = nr
        c = nc
      } else {
        r = clamp(r + dRow, 0, rows.length - 1)
        c = clamp(c + dCol, 0, cols.length - 1)
      }
    }
    const rowId = rows[r]
    const columnId = cols[c]
    if (opts.extend) extendSelectionTo(rowId, columnId)
    else setActiveCell(rowId, columnId)
  }

  const getSelectionMatrix = (): { rowIds: string[]; columnIds: string[] } | null => {
    const s = store.getState()
    const b = s.activeCell
    if (!b) return null
    const bi = visualIndexOf(b.rowId, b.columnId)
    if (!bi) return null
    const ai = (s.anchorCell && visualIndexOf(s.anchorCell.rowId, s.anchorCell.columnId)) || bi
    const r0 = Math.min(ai.r, bi.r)
    const r1 = Math.max(ai.r, bi.r)
    const c0 = Math.min(ai.c, bi.c)
    const c1 = Math.max(ai.c, bi.c)
    return {
      rowIds: ctx.visibleRowIds.slice(r0, r1 + 1),
      columnIds: ctx.visibleColumnIds.slice(c0, c1 + 1),
    }
  }

  /* ------------------------------------------------------------- clipboard */

  const cellClipboardText = (rowId: string, columnId: string): string =>
    formatValue(columnId, draftAwareValue(rowId, columnId))

  /** TSV of an entire column across ALL pages (filtered + sorted order). */
  const getColumnClipboardText = (columnId: string): string | null => {
    if (!ctx.visibleColumnIds.includes(columnId)) return null
    const rowIds = ctx.allRowIds.length ? ctx.allRowIds : ctx.visibleRowIds
    if (rowIds.length === 0) return null
    return rowIds.map((rid) => cellClipboardText(rid, columnId)).join('\n')
  }

  /** TSV of an entire row (all visible columns). */
  const getRowClipboardText = (rowId: string): string | null => {
    if (!ctx.visibleRowIds.includes(rowId)) return null
    return ctx.visibleColumnIds.map((cid) => cellClipboardText(rowId, cid)).join('\t')
  }

  const getSelectionClipboardText = (): string | null => {
    // A whole-column / whole-row selection copies EVERYTHING (all pages), not
    // just the on-screen rectangle. Falls through to the range otherwise.
    const whole = store.getState().wholeSelect
    if (whole?.type === 'column') return getColumnClipboardText(whole.id)
    if (whole?.type === 'row') return getRowClipboardText(whole.id)
    const m = getSelectionMatrix()
    if (!m) return null
    return m.rowIds
      .map((rid) => m.columnIds.map((cid) => cellClipboardText(rid, cid)).join('\t'))
      .join('\n')
  }

  const writeClipboard = async (text: string): Promise<string> => {
    try {
      await (
        globalThis.navigator as {
          clipboard?: { writeText?: (t: string) => Promise<void> }
        }
      )?.clipboard?.writeText?.(text)
    } catch {
      /* clipboard unavailable (insecure context / jsdom) — value still returned */
    }
    return text
  }

  const copySelection = async (): Promise<string> => {
    const text = getSelectionClipboardText()
    return text == null ? '' : writeClipboard(text)
  }

  /** Select the whole column (visible rows highlight) and copy ALL its values
   *  across every page to the clipboard (H3). Returns the copied TSV. */
  const copyColumn = async (columnId: string): Promise<string> => {
    if (ctx.enableCopyColumn === false) return ''
    selectColumn(columnId)
    const text = getColumnClipboardText(columnId)
    return text == null ? '' : writeClipboard(text)
  }

  /** Select the whole row and copy all its cells to the clipboard (H2). */
  const copyRow = async (rowId: string): Promise<string> => {
    if (ctx.enableCopyRow === false) return ''
    selectRow(rowId)
    const text = getRowClipboardText(rowId)
    return text == null ? '' : writeClipboard(text)
  }

  const parseClipboard = (text: string): string[][] =>
    text
      .replace(/\r\n/g, '\n')
      .replace(/\n+$/, '')
      .split('\n')
      .map((line) => line.split('\t'))

  const pasteFromText = (text: string) => {
    if (!ctx.enableClipboard || !ctx.enableEditing) return
    const m = getSelectionMatrix()
    const originRef = m
      ? { rowId: m.rowIds[0], columnId: m.columnIds[0] }
      : store.getState().activeCell
    if (!originRef) return
    const origin = visualIndexOf(originRef.rowId, originRef.columnId)
    if (!origin) return
    const grid = parseClipboard(text)

    // Gather the target cells + parsed values first (sync), then gate each on its
    // validators. Async validators are awaited before the write, so a paste can't
    // bypass blockCommitOnError either (the same hole as commitCell).
    type PasteCell = { rowId: string; columnId: string; value: unknown }
    const cells: PasteCell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const rowId = ctx.visibleRowIds[origin.r + i]
        const columnId = ctx.visibleColumnIds[origin.c + j]
        if (rowId == null || columnId == null) continue
        if (!isCellEditable(rowId, columnId)) continue
        const meta = metaOf(columnId)
        const cellType = ctx.registry.get(meta.type)
        const value = cellType.parse ? cellType.parse(grid[i][j], meta) : grid[i][j]
        cells.push({ rowId, columnId, value })
      }
    }
    if (!cells.length) return

    // Batch mode: pasted values become drafts like any other edit — they show in
    // the review sheet and persist only on the explicit save. Validation runs
    // non-blocking to surface errors; the real gate is commitAll's validateRow.
    if (ctx.batchEditing) {
      for (const c of cells) validateCell(c.rowId, c.columnId, c.value)
      set((s) => {
        const drafts = { ...s.drafts }
        const dirtyCells = { ...s.dirtyCells }
        const dirtyRows = { ...s.dirtyRows }
        for (const c of cells) {
          const key = cellKey(c.rowId, c.columnId)
          drafts[key] = c.value
          dirtyCells[key] = true
          dirtyRows[c.rowId] = true
        }
        return { ...s, drafts, dirtyCells, dirtyRows }
      })
      return
    }

    const settle = (blockedFlags: boolean[]) => {
      const changes: PasteCell[] = []
      const invalid: PasteCell[] = []
      blockedFlags.forEach((blocked, k) => (blocked ? invalid : changes).push(cells[k]))
      // Invalid pasted cells are held as dirty drafts so their errors surface.
      if (invalid.length) {
        set((s) => {
          const drafts = { ...s.drafts }
          const dirtyCells = { ...s.dirtyCells }
          const dirtyRows = { ...s.dirtyRows }
          for (const iv of invalid) {
            const key = cellKey(iv.rowId, iv.columnId)
            drafts[key] = iv.value
            dirtyCells[key] = true
            dirtyRows[iv.rowId] = true
          }
          return { ...s, drafts, dirtyCells, dirtyRows }
        })
      }
      if (changes.length) {
        persist(changes)
        // Clear any pre-existing draft on the pasted cells — otherwise a stale
        // draft (e.g. from an earlier validation-blocked edit) keeps shadowing the
        // freshly-pasted value via draftAwareValue and the dirty counter sticks
        // forever (#10). commitCell already pairs persist with clearCellDraft.
        set((s) => {
          let next: InteractionState = s
          for (const ch of changes) next = clearCellDraft(next, ch.rowId, ch.columnId)
          return next
        })
      }
    }

    const gates = cells.map((c) => validateCellForCommit(c.rowId, c.columnId, c.value))
    if (gates.every((g): g is boolean => typeof g === 'boolean')) {
      // All sync (or validation off): apply synchronously — unchanged behaviour.
      settle(gates)
    } else {
      void Promise.all(gates.map((g) => Promise.resolve(g))).then(settle)
    }
  }

  /* -------------------------------------------------------------- render glue */

  const buildCellApi = (
    rowId: string,
    columnId: string,
    row: TData | undefined,
    snapshot: { isEditing: boolean; isDirty: boolean; errors: FieldError[] },
  ): BstCellApi<TData> => ({
    isEditing: snapshot.isEditing,
    isDisabled: isCellDisabled(rowId, columnId),
    isDirty: snapshot.isDirty,
    startEditing: () => startEditing(rowId, columnId),
    cancelEditing: () => {
      // From a row-action cell, "Cancel" must discard the row-edit session's
      // drafts, not merely close the open editor — otherwise the drafts survive
      // and the next Save persists the value the user cancelled (#2). Fall back to
      // a plain editor-close for a lone cell edit (no session on this row).
      if (store.getState().rowSession === rowId) cancelRowSession()
      else cancelEditing()
    },
    commitCell: (value) => commitCell(rowId, columnId, value),
    editRow: () => beginRowSession(rowId),
    saveRow: () => void commitRowSession(rowId),
    deleteRow: () => deleteRow(rowId),
    duplicateRow: () => void duplicateRow(rowId),
    errors: snapshot.errors,
  })

  return {
    store,
    updateCtx: (next) => {
      ctx = next
    },
    reset: () => store.setState(initialInteractionState),
    startEditing,
    cancelEditing,
    setDraft,
    commitCell,
    beginRowSession,
    commitRowSession,
    cancelRowSession,
    commitAll,
    cancelAll,
    getDirtyChanges,
    getChangeSet,
    revertCell,
    revertRow,
    formatValue,
    undo,
    redo,
    canUndo,
    canRedo,
    setActiveCell,
    extendSelectionTo,
    moveActive,
    selectAll,
    selectColumn,
    selectRow,
    clearSelection,
    visualIndexOf,
    getSelectionMatrix,
    getSelectionClipboardText,
    getColumnClipboardText,
    getRowClipboardText,
    copySelection,
    copyColumn,
    copyRow,
    pasteFromText,
    isCellEditable,
    isRowDisabled,
    isCellDisabled,
    getCellAccess,
    setColumnEditable,
    getColumnEditable,
    metaOf,
    sourceValue,
    draftAwareValue,
    validateCell: (rowId, columnId, value) => void validateCell(rowId, columnId, value),
    validateRow,
    addRow,
    deleteRow,
    duplicateRow,
    buildCellApi,
    saveOn: ctx.saveOn,
  }
}
