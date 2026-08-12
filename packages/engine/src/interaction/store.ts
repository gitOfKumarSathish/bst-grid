import type { FieldError } from '../registry/types.js'

/** A cell address by stable ids (never indices — Plan.md §2.4/§2.5). */
export interface CellRef {
  rowId: string
  columnId: string
}

/**
 * The interaction store (Plan.md §2.5 rule 4). All high-frequency edit /
 * validation / selection state lives here — NOT in `table.setState` — so a
 * keystroke or an active-cell move never re-runs the whole row model. It is a
 * tiny, framework-agnostic external store consumed via `useSyncExternalStore`.
 *
 * Live keystrokes are held in the active editor's local React state and only
 * land here on commit, so store mutations are coarse (commit / cancel /
 * selection / validation) and never per-character.
 */
export interface InteractionState {
  /** The cell currently in inline edit mode, or `null`. */
  editingCell: { rowId: string; columnId: string } | null
  /** The row currently in a deferred row-edit session, or `null` (C2 ≡ I2). */
  rowSession: string | null
  /**
   * The focused ("active") cell — the moving end of a range + keyboard-nav
   * cursor (Phase 3). `null` when nothing is selected.
   */
  activeCell: CellRef | null
  /**
   * The fixed end ("anchor") of a range selection. Equal to `activeCell` when
   * the selection is a single cell; the rectangle between the two is
   * materialised lazily at paint (§2.4 — "rectangles materialized at paint").
   */
  anchorCell: CellRef | null
  /**
   * Marks the current selection as a *whole* column or row (Ctrl+Space /
   * Shift+Space, or a "copy column" action). Copy then grabs the ENTIRE column
   * across all pages (or the whole row), not just the on-screen rectangle
   * (H3 copy-column / H2 copy-row under pagination). Cleared by any cell-level
   * selection change.
   */
  wholeSelect: { type: 'column' | 'row'; id: string } | null
  /**
   * Runtime per-column editability override, keyed by columnId. A column absent
   * here uses its `meta.editable` default; `false` locks the whole column
   * (read-only) and `true` unlocks it — an end-user control surfaced in the
   * Columns menu. Consulted by `isCellEditable`; empty by default (no effect).
   */
  columnEdit: Record<string, boolean>
  /** Draft values keyed by `cellKey(rowId, columnId)`. */
  drafts: Record<string, unknown>
  /** Dirty cell keys — a committed/pending draft not yet persisted upstream. */
  dirtyCells: Record<string, true>
  /** Rows carrying at least one dirty cell. */
  dirtyRows: Record<string, true>
  /** Validation findings keyed by cell key. */
  cellErrors: Record<string, FieldError[]>
  /** Row-level validation findings keyed by rowId. */
  rowErrors: Record<string, FieldError[]>
  /** Cell keys with an async validation currently in flight. */
  pending: Record<string, true>
  /** Undo-stack depth (Phase 3) — drives `canUndo` reactively for chrome. */
  undoDepth: number
  /** Redo-stack depth (Phase 3) — drives `canRedo` reactively for chrome. */
  redoDepth: number
}

export const initialInteractionState: InteractionState = {
  editingCell: null,
  rowSession: null,
  activeCell: null,
  anchorCell: null,
  wholeSelect: null,
  columnEdit: {},
  drafts: {},
  dirtyCells: {},
  dirtyRows: {},
  cellErrors: {},
  rowErrors: {},
  pending: {},
  undoDepth: 0,
  redoDepth: 0,
}

/** Composite key for a cell (`rowId` first so a row's cells sort together). */
export function cellKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`
}

/** Split a composite key back into its `rowId` / `columnId` parts. */
export function splitCellKey(key: string): { rowId: string; columnId: string } {
  const idx = key.indexOf('::')
  return { rowId: key.slice(0, idx), columnId: key.slice(idx + 2) }
}

export interface Store<S> {
  getState: () => S
  setState: (updater: S | ((prev: S) => S)) => void
  subscribe: (listener: () => void) => () => void
}

/** A minimal immutable external store. Every `setState` produces a new object. */
export function createStore<S>(initial: S): Store<S> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    setState: (updater) => {
      const next =
        typeof updater === 'function' ? (updater as (p: S) => S)(state) : updater
      if (next === state) return
      state = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type InteractionStore = Store<InteractionState>

export function createInteractionStore(): InteractionStore {
  return createStore<InteractionState>(initialInteractionState)
}
