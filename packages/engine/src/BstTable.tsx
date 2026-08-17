import * as React from 'react'
import { flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { virtualizationBypassReason } from './virtualization.js'
import { BstSetFilter } from './BstSetFilter.js'
import { getBstRuntime } from './useBstTable.js'
import type { BstRuntimeHandle } from './useBstTable.js'
import { cellKey } from './interaction/store.js'
import type { InteractionState } from './interaction/store.js'
import { useStoreSelector } from './interaction/useStoreSelector.js'
import type { BstRuntime } from './runtime.js'
import type { BstColumnMeta, CellType } from './registry/types.js'
import type { CellEditProps, CellRenderProps, FieldError } from './registry/types.js'
import { computeCellSpans } from './spanning.js'
import { evalCellFormat, evalRowFormat } from './formatting.js'
import type { FormatResult } from './formatting.js'
import { computeAutoWidth } from './autosize.js'
import type { SpanPlan } from './spanning.js'
import { resolveBstIcons, BstIconsContext, useBstIcons } from './icons.js'
import type { BstIconOverrides } from './icons.js'

const NO_ERRORS: FieldError[] = []

/** Join truthy class fragments into a className string. */
const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')

/** Resolve a slot value that may be static or a function of some context. */
function slot<C, V>(s: V | ((c: C) => V | undefined) | undefined, ctx: C): V | undefined {
  return typeof s === 'function' ? (s as (c: C) => V | undefined)(ctx) : s
}

/**
 * Fit-to-viewport (G3) width distribution: split `avail` px across columns in
 * proportion to their own `sizes`, each clamped to `min`, with the flooring
 * remainder handed to the largest fractional parts so the result sums to exactly
 * `avail` (→ table === viewport → no horizontal scroll). Pure — exported for tests.
 */
export function distributeFitWidths(avail: number, sizes: number[], min = 48): number[] {
  const totalSize = sizes.reduce((a, b) => a + b, 0) || 1
  const raw = sizes.map((s) => (avail * s) / totalSize)
  const w = raw.map((r) => Math.max(min, Math.floor(r)))
  let remainder = avail - w.reduce((a, b) => a + b, 0)
  if (remainder > 0) {
    const order = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
    for (let k = 0; remainder > 0 && order.length; k++, remainder--) {
      w[order[k % order.length].i] += 1
    }
  }
  return w
}

/** Width of the row-selection checkbox column (matches `.bst-select-*` CSS). */
const SELECT_COL_WIDTH = 40

/** Width of the master-detail expander column (matches `.bst-expander-*` CSS). */
const EXPANDER_COL_WIDTH = 40

/** Width of the row-pinning column (matches `.bst-pin-*` CSS). */
const PIN_COL_WIDTH = 36

/**
 * Neutral, theme-agnostic table body renderer (Plan.md §2.6). Uses only semantic
 * HTML + CSS classes driven by CSS custom properties. In Phase 2 each cell is a
 * memoized `GridCell` that consults the cell-type registry (read path), the
 * interaction store (edit/dirty/error state) and the runtime (edit lifecycle).
 * MUI / shadcn skins theme it purely via `--bst-table-*` vars.
 */
export function BstTable({
  table,
  className,
  icons,
}: {
  table: any
  className?: string
  /** Body-icon overrides (sort / expander / pin / boolean / file). Adapters
   * forward their own icon set; unspecified slots use the built-in SVGs. */
  icons?: BstIconOverrides
}) {
  const handle = getBstRuntime(table) as BstRuntimeHandle<any>
  const { runtime, registry, classNames, styles } = handle
  const I = React.useMemo(() => resolveBstIcons(icons), [icons])
  const visibleCount = table.getVisibleLeafColumns().length

  // Row resizing (G2) — per-row heights in local UI state. The drag reads the
  // row's current height from the DOM, so the handlers need no per-render closure
  // (stable → GridCell memoization is preserved). Double-click a handle to reset.
  const [rowHeights, setRowHeights] = React.useState<Record<string, number>>({})
  const onRowResizeStart = React.useCallback((rowId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const tr = (e.currentTarget as HTMLElement).closest('tr') as HTMLElement | null
    const startH = tr ? tr.getBoundingClientRect().height : 32
    const startY = e.clientY
    const onMove = (ev: MouseEvent) => {
      const h = Math.max(24, Math.round(startH + (ev.clientY - startY)))
      setRowHeights((prev) => (prev[rowId] === h ? prev : { ...prev, [rowId]: h }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])
  const onRowResizeReset = React.useCallback((rowId: string) => {
    setRowHeights((prev) => {
      if (!(rowId in prev)) return prev
      const cp = { ...prev }
      delete cp[rowId]
      return cp
    })
  }, [])

  // One grid-wide subscription (not per-cell): drives the roving tabindex on the
  // <table> so keyboard users can Tab in and Arrow to the first cell.
  const hasActive = useStoreSelector(runtime.store, (s) => s.activeCell != null)
  // The table takes keyboard focus for cell nav OR undo/redo shortcuts.
  const focusable = handle.enableCellSelection || handle.enableUndoRedo

  // Fit-to-viewport (G3) — a pure render overlay. When `fitColumns` is on we
  // measure the scroll box and hand each data column a width so the table fills
  // it exactly (no horizontal scroll); utility columns keep their fixed widths.
  // It never mutates the column-sizing model, so toggling it off restores the
  // authored widths. `widthOf` returns the fitted width or the column's own.
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [fitWidths, setFitWidths] = React.useState<Map<string, number> | null>(null)
  const utilityWidth =
    (handle.enableExpanding ? EXPANDER_COL_WIDTH : 0) +
    (handle.enableRowSelection ? SELECT_COL_WIDTH : 0) +
    (handle.enableRowPinning ? PIN_COL_WIDTH : 0)
  const fit = handle.fitColumns ? fitWidths : null
  const widthOf = (colId: string, fallback: number | undefined): number | undefined =>
    fit?.get(colId) ?? fallback
  const fittedTableWidth =
    fit && fit.size > 0 ? utilityWidth + [...fit.values()].reduce((a, b) => a + b, 0) : null

  // Column pinning (v9 pins to 'start'/'end'). Precompute each start-pinned
  // column's sticky left offset = cumulative width of the pinned columns before
  // it (after the selection column, if any). v9 renders pinned columns first.
  const startPinned = (table.getStartVisibleLeafColumns?.() ?? []) as any[]
  const pinLeftById = new Map<string, number>()
  {
    let acc = handle.enableColumnPinning ? utilityWidth : 0
    for (const c of startPinned) {
      pinLeftById.set(c.id as string, acc)
      acc += widthOf(c.id as string, (c.getSize?.() as number) ?? 0) ?? 0
    }
  }

  // Explicit total width — required for `table-layout: fixed`, which is what
  // makes column resizing actually change the rendered width (auto layout
  // ignores it and sizes to content).
  const totalWidth =
    (table.getTotalSize?.() ?? 0) +
    (handle.enableRowSelection ? SELECT_COL_WIDTH : 0) +
    (handle.enableExpanding ? EXPANDER_COL_WIDTH : 0) +
    (handle.enableRowPinning ? PIN_COL_WIDTH : 0)

  // Left offset for the pin column when column-pinning is on (it sits after the
  // expander + selection columns).
  const pinColLeft =
    (handle.enableExpanding ? EXPANDER_COL_WIDTH : 0) +
    (handle.enableRowSelection ? SELECT_COL_WIDTH : 0)

  // Row pinning (G1) — render top-pinned rows, then the center (paginated) rows,
  // then bottom-pinned rows. Pinned rows stay across sort/filter/pagination.
  const bodyRows: any[] = handle.enableRowPinning
    ? [
        ...((table.getTopRows?.() ?? []) as any[]),
        ...((table.getCenterRows?.() ?? []) as any[]),
        ...((table.getBottomRows?.() ?? []) as any[]),
      ]
    : (table.getRowModel().rows as any[])

  // Smart column auto-size (D3) — double-click a column's resize handle to fit
  // its content: measure the header + the current page's formatted cells with an
  // offscreen canvas, clamp to the column's min/max, and set the sizing state.
  const autoSizeColumn = (colId: string) => {
    const col = table.getColumn?.(colId)
    if (!col) return
    const meta = runtime.metaOf(colId)
    const ct = registry.get(meta.type)
    const header = col.columnDef?.header
    const texts: string[] = [typeof header === 'string' ? header : '']
    // Sample at most ~250 rows — with virtualization (and no pagination) bodyRows
    // can be the whole 1M-row dataset; measuring every one on a double-click would
    // freeze the tab. D3 was always a sampled strategy (Plan.md §2.7b).
    const sample = bodyRows.length > 250 ? bodyRows.slice(0, 250) : bodyRows
    for (const row of sample) {
      const v = row.getValue(colId)
      texts.push(ct.format ? ct.format(v, meta) : v == null ? '' : String(v))
    }
    const width = computeAutoWidth(texts, {
      min: col.columnDef?.minSize as number | undefined,
      max: col.columnDef?.maxSize as number | undefined,
    })
    table.setColumnSizing((old: Record<string, number>) => ({ ...(old ?? {}), [colId]: width }))
  }

  // Cell spanning (A5) — precompute the col/row span plan for the current page
  // (origins + covered cells). Render-only; O(rows×cols) over the visible page.
  const spanPlan: SpanPlan | null = handle.enableCellSpanning
    ? computeCellSpans(
        bodyRows.map((r) => ({
          id: r.id as string,
          original: r.original,
          getValue: (c: string) => r.getValue(c),
        })),
        (table.getVisibleLeafColumns() as any[]).map((c) => ({
          id: c.id as string,
          meta: (c.columnDef.meta ?? {}) as BstColumnMeta,
        })),
        handle.getCellSpan,
      )
    : null

  // Column drag-to-reorder (native HTML5 DnD → v9 setColumnOrder).
  const dragColRef = React.useRef<string | null>(null)
  const reorderColumn = (draggedId: string | null, targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    const leafIds = table.getAllLeafColumns().map((c: any) => c.id as string)
    const explicit = (table.state.columnOrder ?? []) as string[]
    const order = explicit.length ? explicit.filter((id) => leafIds.includes(id)) : leafIds.slice()
    for (const id of leafIds) if (!order.includes(id)) order.push(id)
    const from = order.indexOf(draggedId)
    const to = order.indexOf(targetId)
    if (from < 0 || to < 0) return
    order.splice(from, 1)
    order.splice(to, 0, draggedId)
    table.setColumnOrder(order)
  }

  // A keyboard/clipboard event that originates inside one of the grid's own form
  // controls (a column-filter input, an open cell editor, a <select>) belongs to
  // that control and must reach it natively; the table-level handlers only own
  // events from the cell-navigation surface (a focusable <td>, or the table
  // itself). Without this guard the filter row is a hard keyboard trap and Enter
  // is swallowed for every focusable control in the grid (#12/#17/#18).
  const isFromGridFormControl = (e: React.SyntheticEvent) => {
    const t = e.target as HTMLElement | null
    if (!t || t === e.currentTarget) return false
    const tag = t.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
  }

  // Phase 3 — keyboard navigation. Attached at the table so the active cell's
  // key events bubble up to one handler (§2.4). No-ops unless cell selection is
  // on, and yields entirely to an active editor.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isFromGridFormControl(e)) return
    const st = runtime.store.getState()
    const shift = e.shiftKey
    const mod = e.ctrlKey || e.metaKey
    // Undo/redo — independent of cell selection; the editor owns keys while editing.
    if (handle.enableUndoRedo && !st.editingCell && mod) {
      const k = e.key.toLowerCase()
      if (k === 'z') {
        e.preventDefault()
        if (shift) runtime.redo()
        else runtime.undo()
        return
      }
      if (k === 'y') {
        e.preventDefault()
        runtime.redo()
        return
      }
    }
    if (!handle.enableCellSelection) return
    if (st.editingCell) return // an inline editor owns the keys
    const active = st.activeCell
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        runtime.moveActive(-1, 0, { extend: shift, toEdge: mod })
        break
      case 'ArrowDown':
        e.preventDefault()
        runtime.moveActive(1, 0, { extend: shift, toEdge: mod })
        break
      case 'ArrowLeft':
        e.preventDefault()
        runtime.moveActive(0, -1, { extend: shift, toEdge: mod })
        break
      case 'ArrowRight':
        e.preventDefault()
        runtime.moveActive(0, 1, { extend: shift, toEdge: mod })
        break
      case 'Tab':
        e.preventDefault()
        runtime.moveActive(0, shift ? -1 : 1, { wrap: true })
        break
      case 'Home':
        e.preventDefault()
        runtime.moveActive(mod ? -1 : 0, -1, { toEdge: true, extend: shift })
        break
      case 'End':
        e.preventDefault()
        runtime.moveActive(mod ? 1 : 0, 1, { toEdge: true, extend: shift })
        break
      case 'Enter':
        e.preventDefault()
        if (
          active &&
          runtime.isCellEditable(active.rowId, active.columnId) &&
          registry.get(runtime.metaOf(active.columnId).type).renderEdit
        ) {
          runtime.startEditing(active.rowId, active.columnId)
        } else {
          runtime.moveActive(1, 0)
        }
        break
      case 'F2':
        if (active) {
          e.preventDefault()
          runtime.startEditing(active.rowId, active.columnId)
        }
        break
      case 'Escape':
        runtime.clearSelection()
        break
      case 'a':
      case 'A':
        if (mod) {
          e.preventDefault()
          runtime.selectAll()
        }
        break
      case ' ':
        // Ctrl/Cmd+Space → select the active cell's whole column; Shift+Space →
        // its whole row (Excel). A subsequent Ctrl/Cmd+C copies the ENTIRE
        // column across all pages / the whole row (H3 / H2).
        if (active && (mod || shift)) {
          e.preventDefault()
          if (mod) runtime.selectColumn(active.columnId)
          else runtime.selectRow(active.rowId)
        }
        break
      default:
        break
    }
  }

  // Phase 3 — clipboard. Uses the native copy/paste DOM events (so Ctrl/Cmd+C/V
  // work with zero key-combo guessing) targeting the focused active cell.
  const onCopy = (e: React.ClipboardEvent) => {
    if (!handle.enableClipboard) return
    if (isFromGridFormControl(e)) return
    const text = runtime.getSelectionClipboardText()
    if (text == null) return
    e.clipboardData?.setData('text/plain', text)
    e.preventDefault()
  }
  const onPaste = (e: React.ClipboardEvent) => {
    if (!handle.enableClipboard) return
    if (isFromGridFormControl(e)) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    runtime.pasteFromText(text)
    e.preventDefault()
  }

  // Fit-to-viewport measurement. Watches the scroll box; on any width change it
  // splits the available width (box − utility columns) across the visible leaf
  // columns in proportion to their own sizes, clamped to a readable minimum, and
  // stores the result so the render below sizes each column to fill exactly.
  const tState = table.getState?.() ?? {}
  const columnOrderKey = (tState.columnOrder ?? []).join(',')
  const columnVisibilityKey = JSON.stringify(tState.columnVisibility ?? {})
  React.useLayoutEffect(() => {
    if (!handle.fitColumns) {
      setFitWidths(null)
      return
    }
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const box = el.clientWidth
      if (box <= 0) return
      const leaf = table.getVisibleLeafColumns() as any[]
      const avail = Math.max(0, box - utilityWidth)
      const sizes = leaf.map((c) => (c.getSize?.() as number) ?? 0)
      const w = distributeFitWidths(avail, sizes)
      const next = new Map<string, number>()
      leaf.forEach((c, i) => next.set(c.id as string, w[i]))
      setFitWidths((prev) =>
        prev && prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v)
          ? prev // unchanged — don't re-render (and don't retrigger the observer)
          : next,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle.fitColumns, utilityWidth, visibleCount, columnOrderKey, columnVisibilityKey])

  // Responsive (G4) — hide the lowest-priority data columns when the scroll box
  // is too narrow to fit them (via v9 `columnVisibility`). Only columns WE hid
  // are restored when space returns, so it never fights a user's manual hide.
  // No-op under `fitColumns` (which already prevents horizontal scroll).
  const responsiveHidden = React.useRef<Set<string>>(new Set())
  React.useLayoutEffect(() => {
    const restoreAll = () => {
      const hid = responsiveHidden.current
      if (!hid.size) return
      table.setColumnVisibility((old: Record<string, boolean>) => {
        const next = { ...old }
        hid.forEach((id) => delete next[id])
        return next
      })
      responsiveHidden.current = new Set()
    }
    if (!handle.enableResponsive || handle.fitColumns) {
      restoreAll()
      return
    }
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const box = el.clientWidth
      if (box <= 0) return
      const avail = Math.max(0, box - utilityWidth)
      const ref = responsiveHidden.current
      const cur = (table.getState?.().columnVisibility ?? {}) as Record<string, boolean>
      // Candidates = data columns the USER hasn't hidden (visible, or hidden by us).
      const cand = (table.getAllLeafColumns() as any[])
        .map((c, i) => ({
          id: c.id as string,
          size: (c.getSize?.() as number) ?? 0,
          prio: Number((c.columnDef?.meta as any)?.responsivePriority ?? 0),
          i,
        }))
        .filter((c) => cur[c.id] !== false || ref.has(c.id))
      // Keep highest-priority first (ties left-to-right); hide the overflow — but
      // always keep at least one column.
      const keepOrder = [...cand].sort((a, b) => b.prio - a.prio || a.i - b.i)
      let used = 0
      const keep = new Set<string>()
      for (const c of keepOrder) {
        if (keep.size === 0 || used + c.size <= avail) {
          keep.add(c.id)
          used += c.size
        }
      }
      let changed = false
      const next = { ...cur }
      for (const c of cand) {
        if (!keep.has(c.id)) {
          if (next[c.id] !== false) {
            next[c.id] = false
            changed = true
          }
          ref.add(c.id)
        } else if (ref.has(c.id)) {
          delete next[c.id]
          ref.delete(c.id)
          changed = true
        }
      }
      if (changed) table.setColumnVisibility(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle.enableResponsive, handle.fitColumns, utilityWidth, columnOrderKey])

  // ── Virtualization (D1) ────────────────────────────────────────────────────
  // Render only the rows (and, with column virtualization, columns) inside the
  // scroll viewport. Opt-in; a few features whose DOM shape a windowed body can't
  // represent make it yield (render un-windowed) rather than corrupt the layout.
  const virt = handle.virtualization
  const bypassReason = virt.enabled ? virtualizationBypassReason(handle) : null
  const rowVirtActive = virt.enabled && !bypassReason
  React.useEffect(() => {
    if (virt.enabled && bypassReason && typeof console !== 'undefined') {
      console.warn(
        `[bst-table] Virtualization is off because ${bypassReason} is active — that feature needs the full row model in the DOM. Turn it off to virtualize.`,
      )
    }
  }, [virt.enabled, bypassReason])

  const visibleLeaf = table.getVisibleLeafColumns() as any[]
  // Column virtualization only where header ↔ body ↔ filter columns stay aligned:
  // a single (flat) header group, no pinning/fit (which reorder or fix widths).
  const colVirtActive =
    rowVirtActive &&
    virt.columns &&
    (table.getHeaderGroups() as any[]).length === 1 &&
    !handle.fitColumns &&
    !handle.enableColumnPinning

  // Hooks run every render (never conditional); `count: 0` makes them inert for a
  // non-virtualized grid — virtual-core no-ops without a scroll element / RO.
  const rowVirtualizer = useVirtualizer({
    count: rowVirtActive ? bodyRows.length : 0,
    // Null when inactive → virtual-core observes nothing, so a non-virtualized
    // grid creates no ResizeObserver (and can't perturb other RO consumers).
    getScrollElement: () => (rowVirtActive ? scrollRef.current : null),
    estimateSize: () => virt.estimateRowSize,
    overscan: virt.overscan,
    getItemKey: (i) => (bodyRows[i]?.id as string) ?? i,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => (el as HTMLElement).getBoundingClientRect().height
        : undefined,
  })
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: colVirtActive ? visibleLeaf.length : 0,
    getScrollElement: () => (colVirtActive ? scrollRef.current : null),
    estimateSize: (i) =>
      widthOf(visibleLeaf[i]?.id, visibleLeaf[i]?.getSize?.() as number) ?? virt.estimateColumnSize,
    overscan: virt.overscan,
    getItemKey: (i) => (visibleLeaf[i]?.id as string) ?? i,
  })

  const rowItems = rowVirtActive ? rowVirtualizer.getVirtualItems() : []
  const rowsToRender: Array<{ row: any; rowIndex: number; vIndex?: number }> = rowVirtActive
    ? rowItems.map((vi) => ({ row: bodyRows[vi.index], rowIndex: vi.index, vIndex: vi.index }))
    : bodyRows.map((row, rowIndex) => ({ row, rowIndex }))
  const rowPadTop = rowVirtActive && rowItems.length ? rowItems[0].start : 0
  const rowPadBottom =
    rowVirtActive && rowItems.length
      ? rowVirtualizer.getTotalSize() - rowItems[rowItems.length - 1].end
      : 0

  const colItems = colVirtActive ? colVirtualizer.getVirtualItems() : []
  const colWindow =
    colVirtActive && colItems.length
      ? {
          indices: colItems.map((c) => c.index),
          leftPad: colItems[0].start,
          rightPad: colVirtualizer.getTotalSize() - colItems[colItems.length - 1].end,
        }
      : null

  // Wrap a header/filter/body column row: render all columns, or (column virt)
  // a real spacer <th>/<td> + the windowed columns + a trailing spacer, so a
  // fixed-layout table keeps header ↔ body alignment.
  const windowCols = <T,>(
    items: T[],
    render: (item: T, idx: number) => React.ReactNode,
    tag: 'th' | 'td',
  ): React.ReactNode => {
    if (!colWindow) return items.map(render)
    const spacer = (key: string, w: number) => {
      if (w <= 0) return null
      const p: any = { key, className: 'bst-virtual-colspacer', style: { width: w }, 'aria-hidden': true }
      return tag === 'th' ? <th {...p} /> : <td {...p} />
    }
    return (
      <>
        {spacer('__lpad', colWindow.leftPad)}
        {colWindow.indices.map((i) => render(items[i], i))}
        {spacer('__rpad', colWindow.rightPad)}
      </>
    )
  }

  // A2 infinite scroll — fire once when the last rendered row is within
  // `endReachedThreshold` of the end; re-arm after the user scrolls back up.
  const endThreshold = handle.endReachedThreshold ?? 8
  const lastFiredRef = React.useRef(-1)
  const lastVisibleIndex = rowItems.length ? rowItems[rowItems.length - 1].index : -1
  React.useEffect(() => {
    if (!rowVirtActive || !handle.onReachEnd || bodyRows.length === 0) return
    if (lastVisibleIndex >= bodyRows.length - endThreshold) {
      if (lastFiredRef.current !== bodyRows.length) {
        lastFiredRef.current = bodyRows.length
        handle.onReachEnd()
      }
    } else if (lastVisibleIndex >= 0 && lastVisibleIndex < bodyRows.length - endThreshold - 1) {
      lastFiredRef.current = -1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowVirtActive, lastVisibleIndex, bodyRows.length, endThreshold])

  // Keep keyboard-nav's active cell rendered: scroll its row into the window.
  const activeRowId = useStoreSelector(runtime.store, (s) => s.activeCell?.rowId ?? null)
  React.useEffect(() => {
    if (!rowVirtActive || !activeRowId) return
    const idx = bodyRows.findIndex((r) => (r.id as string) === activeRowId)
    if (idx >= 0) rowVirtualizer.scrollToIndex(idx, { align: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowVirtActive, activeRowId])

  // AG23 — loading / error overlays over the grid body. Error wins over loading.
  // Rendered inside a position:relative viewport wrapper so they cover the scroll
  // area without scrolling with the rows. Props reach the engine through the
  // adapters' `...rest` spread, so both skins get overlays for free.
  const overlayError = handle.error
  const showOverlayError = overlayError != null && overlayError !== false && overlayError !== ''
  const showOverlayLoading = handle.loading && !showOverlayError
  const overlayNode =
    showOverlayError || showOverlayLoading ? (
      <div
        className={cx(
          'bst-overlay',
          showOverlayError ? 'bst-overlay-error' : 'bst-overlay-loading',
          classNames?.overlay,
        )}
        style={styles?.overlay}
        role={showOverlayError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {showOverlayError
          ? handle.renderError
            ? handle.renderError(overlayError)
            : <DefaultErrorOverlay error={overlayError} />
          : handle.renderLoading
            ? handle.renderLoading()
            : <DefaultLoadingOverlay />}
      </div>
    ) : null

  return (
    <BstIconsContext.Provider value={I}>
    <div className="bst-table-viewport">
    <div
      ref={scrollRef}
      className={cx('bst-table-scroll', rowVirtActive && 'bst-virtualized', className, classNames?.root)}
      style={{ ...(handle.fitColumns ? { overflowX: 'hidden' as const } : null), ...styles?.root }}
    >
      <table
        className={cx('bst-table-table', classNames?.table)}
        style={{
          ...(fittedTableWidth ?? totalWidth ? { width: fittedTableWidth ?? totalWidth } : {}),
          ...styles?.table,
        }}
        tabIndex={focusable ? (hasActive ? -1 : 0) : undefined}
        onKeyDown={focusable ? onKeyDown : undefined}
        onCopy={handle.enableClipboard ? onCopy : undefined}
        onPaste={handle.enableClipboard ? onPaste : undefined}
      >
        <thead className={classNames?.header} style={styles?.header}>
          {table.getHeaderGroups().map((hg: any, hgIndex: number) => (
            <tr key={hg.id} className={classNames?.headerRow} style={styles?.headerRow}>
              {handle.enableExpanding && hgIndex === 0 ? (
                <th
                  className={
                    'bst-expander-th' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  rowSpan={table.getHeaderGroups().length}
                  style={handle.enableColumnPinning ? { left: 0 } : undefined}
                  aria-label="Expand"
                />
              ) : null}
              {handle.enableRowSelection && hgIndex === 0 ? (
                <th
                  className={
                    'bst-select-th' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  rowSpan={table.getHeaderGroups().length}
                  style={
                    handle.enableColumnPinning
                      ? { left: handle.enableExpanding ? EXPANDER_COL_WIDTH : 0 }
                      : undefined
                  }
                  aria-label="Select"
                >
                  <SelectAllCheckbox table={table} />
                </th>
              ) : null}
              {handle.enableRowPinning && hgIndex === 0 ? (
                <th
                  className={'bst-pin-th' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')}
                  rowSpan={table.getHeaderGroups().length}
                  style={handle.enableColumnPinning ? { left: pinColLeft } : undefined}
                  aria-label="Pin"
                />
              ) : null}
              {windowCols(hg.headers, (header: any) => {
                const col = header.column
                const canSort = col.getCanSort?.()
                const sorted = col.getIsSorted?.()
                const pinnedLeft = col.getIsPinned?.() === 'start'
                const pinLeft = pinnedLeft ? (pinLeftById.get(col.id) ?? 0) : 0
                const canReorder = handle.enableColumnOrdering
                const colMeta = (col.columnDef.meta ?? {}) as BstColumnMeta
                return (
                  <th
                    key={header.id}
                    className={cx(
                      'bst-table-th',
                      pinnedLeft && 'bst-pinned-left',
                      slot(classNames?.headerCell, { columnId: col.id }),
                      colMeta.headerClassName,
                    )}
                    style={{
                      width: widthOf(col.id, header.getSize?.()),
                      ...(pinnedLeft ? { left: pinLeft } : {}),
                      ...slot(styles?.headerCell, { columnId: col.id }),
                      ...colMeta.headerStyle,
                    }}
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                    onDragOver={canReorder ? (e) => e.preventDefault() : undefined}
                    onDrop={
                      canReorder
                        ? (e) => {
                            e.preventDefault()
                            const src =
                              dragColRef.current || e.dataTransfer.getData('text/bst-col')
                            reorderColumn(src, col.id)
                            dragColRef.current = null
                          }
                        : undefined
                    }
                  >
                    <div
                      className={
                        'bst-table-th-content' + (canSort ? ' bst-table-sortable' : '')
                      }
                      onClick={canSort ? col.getToggleSortingHandler?.() : undefined}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              // A role="button" control must also toggle on
                              // Enter/Space, not just click (WCAG 2.1.1 — #19).
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                col.getToggleSortingHandler?.()?.(e)
                              }
                            }
                          : undefined
                      }
                      role={canSort ? 'button' : undefined}
                      tabIndex={canSort ? 0 : undefined}
                      draggable={canReorder || undefined}
                      onDragStart={
                        canReorder
                          ? (e) => {
                              dragColRef.current = col.id
                              e.dataTransfer.effectAllowed = 'move'
                              try {
                                e.dataTransfer.setData('text/bst-col', col.id)
                              } catch {
                                /* some browsers restrict custom types */
                              }
                            }
                          : undefined
                      }
                      onDragEnd={canReorder ? () => (dragColRef.current = null) : undefined}
                    >
                      <span className="bst-table-th-label">
                        {header.isPlaceholder
                          ? null
                          : flexRender(col.columnDef.header, header.getContext())}
                      </span>
                      {canSort && (
                        <span className="bst-table-sort-ind" aria-hidden="true">
                          {sorted === 'asc' ? (
                            <I.sortAsc size={14} />
                          ) : sorted === 'desc' ? (
                            <I.sortDesc size={14} />
                          ) : (
                            <I.sortNone size={14} />
                          )}
                        </span>
                      )}
                    </div>
                    {col.getCanResize?.() && !handle.fitColumns && (
                      <span
                        onMouseDown={header.getResizeHandler?.()}
                        onTouchStart={header.getResizeHandler?.()}
                        onDoubleClick={() => autoSizeColumn(col.id)}
                        title="Drag to resize · double-click to auto-fit"
                        className={
                          'bst-table-resizer' +
                          (col.getIsResizing?.() ? ' bst-table-resizing' : '')
                        }
                        aria-hidden="true"
                      />
                    )}
                  </th>
                )
              }, 'th')}
            </tr>
          ))}
          {handle.enableColumnFilterRow && (
            <tr className={cx('bst-colfilter-tr', classNames?.filterRow)} style={styles?.filterRow}>
              {handle.enableExpanding ? (
                <th
                  className={
                    'bst-expander-th bst-colfilter-th' +
                    (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  style={handle.enableColumnPinning ? { left: 0 } : undefined}
                />
              ) : null}
              {handle.enableRowSelection ? (
                <th
                  className={
                    'bst-select-th bst-colfilter-th' +
                    (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  style={
                    handle.enableColumnPinning
                      ? { left: handle.enableExpanding ? EXPANDER_COL_WIDTH : 0 }
                      : undefined
                  }
                />
              ) : null}
              {handle.enableRowPinning ? (
                <th
                  className={
                    'bst-pin-th bst-colfilter-th' +
                    (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  style={handle.enableColumnPinning ? { left: pinColLeft } : undefined}
                />
              ) : null}
              {windowCols(
                table.getVisibleLeafColumns() as any[],
                (col: any) => {
                  const pinnedLeft = col.getIsPinned?.() === 'start'
                  const pinLeft = pinnedLeft ? (pinLeftById.get(col.id) ?? 0) : 0
                  return (
                    <th
                      key={col.id}
                      className={'bst-colfilter-th' + (pinnedLeft ? ' bst-pinned-left' : '')}
                      style={{ width: widthOf(col.id, col.getSize?.()), ...(pinnedLeft ? { left: pinLeft } : {}) }}
                    >
                      <ColumnFilterCell column={col} table={table} handle={handle} />
                    </th>
                  )
                },
                'th',
              )}
            </tr>
          )}
        </thead>
        <tbody className={classNames?.body} style={styles?.body}>
          {rowVirtActive && rowPadTop > 0 && (
            <tr className="bst-virtual-spacer" aria-hidden="true">
              <td
                colSpan={
                  visibleCount +
                  (handle.enableRowSelection ? 1 : 0) +
                  (handle.enableExpanding ? 1 : 0) +
                  (handle.enableRowPinning ? 1 : 0)
                }
                style={{ height: rowPadTop, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {rowsToRender.map(({ row, rowIndex, vIndex }: { row: any; rowIndex: number; vIndex?: number }) => {
            // Grouping (E4) — a grouped row renders a collapsible header with
            // aggregates instead of the normal leaf-cell layout.
            if (handle.enableGrouping && row.getIsGrouped?.()) {
              return <GroupRow key={row.id} row={row} handle={handle} />
            }
            const rowCtx = { row: row.original, rowId: row.id as string, index: rowIndex }
            const rowPin: 'top' | 'bottom' | false = handle.enableRowPinning
              ? row.getIsPinned?.() ?? false
              : false
            // Conditional formatting (K3) — row-scope rules colour the whole row
            // (applied to every cell so it reads over the td backgrounds).
            const rowFmt: FormatResult | null = handle.conditionalFormats
              ? evalRowFormat(
                  handle.conditionalFormats,
                  row.original,
                  row.id as string,
                  (c: string) => row.getValue(c),
                )
              : null
            const detailRow =
              handle.enableExpanding && row.getIsExpanded?.() && handle.renderDetail ? (
                <tr className="bst-detail-tr">
                  <td
                    className="bst-detail-td"
                    colSpan={
                      visibleCount +
                      (handle.enableRowSelection ? 1 : 0) +
                      (handle.enableExpanding ? 1 : 0) +
                      (handle.enableRowPinning ? 1 : 0)
                    }
                  >
                    {handle.renderDetail(row.original)}
                  </td>
                </tr>
              ) : null
            return (
              <React.Fragment key={row.id}>
                <tr
                  ref={vIndex != null ? rowVirtualizer.measureElement : undefined}
                  data-index={vIndex}
                  className={cx(
                    'bst-table-tr',
                    handle.enableRowSelection && row.getIsSelected() && 'bst-row-selected',
                    handle.enableExpanding && row.getIsExpanded?.() && 'bst-row-expanded',
                    rowPin === 'top' && 'bst-row-pinned-top',
                    rowPin === 'bottom' && 'bst-row-pinned-bottom',
                    rowHeights[row.id] != null && 'bst-row-resized',
                    rowFmt?.className,
                    slot(classNames?.row, rowCtx),
                  )}
                  style={{
                    ...(rowHeights[row.id] != null ? { height: rowHeights[row.id] } : {}),
                    ...slot(styles?.row, rowCtx),
                    ...rowFmt?.style,
                  }}
                >
              {handle.enableExpanding ? (
                <td
                  className={
                    'bst-expander-td' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  style={handle.enableColumnPinning ? { left: 0 } : undefined}
                >
                  {row.getCanExpand?.() ? (
                    <button
                      type="button"
                      className="bst-expander-btn"
                      aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
                      aria-expanded={row.getIsExpanded()}
                      onClick={() => row.toggleExpanded()}
                    >
                      <span aria-hidden="true">
                        {row.getIsExpanded() ? (
                          <I.expandExpanded size={16} />
                        ) : (
                          <I.expandCollapsed size={16} />
                        )}
                      </span>
                    </button>
                  ) : null}
                </td>
              ) : null}
              {handle.enableRowSelection ? (
                <td
                  className={
                    'bst-select-td' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')
                  }
                  style={
                    handle.enableColumnPinning
                      ? { left: handle.enableExpanding ? EXPANDER_COL_WIDTH : 0 }
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    className="bst-checkbox"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                    aria-label="Select row"
                  />
                </td>
              ) : null}
              {handle.enableRowPinning ? (
                <td
                  className={'bst-pin-td' + (handle.enableColumnPinning ? ' bst-pinned-left' : '')}
                  style={handle.enableColumnPinning ? { left: pinColLeft } : undefined}
                >
                  {row.getCanPin?.() ? (
                    <button
                      type="button"
                      className={'bst-pin-btn' + (rowPin ? ' is-pinned' : '')}
                      aria-label={rowPin ? 'Unpin row' : 'Pin row'}
                      aria-pressed={!!rowPin}
                      title={
                        rowPin === 'top'
                          ? 'Pinned top — click to pin bottom'
                          : rowPin === 'bottom'
                            ? 'Pinned bottom — click to unpin'
                            : 'Pin row to top'
                      }
                      onClick={() =>
                        row.pin(rowPin === false ? 'top' : rowPin === 'top' ? 'bottom' : false)
                      }
                    >
                      <span aria-hidden="true">
                        <I.pin size={15} />
                      </span>
                    </button>
                  ) : null}
                </td>
              ) : null}
              {(() => {
                const cells = row.getVisibleCells() as any[]
                return windowCols(
                  cells,
                  (cell: any, cellIdx: number) => {
                  const col = cell.column
                  // Cell spanning — a covered cell renders nothing; an origin cell
                  // carries its colSpan/rowSpan and (for colSpan) the summed width.
                  const spanKey = cellKey(row.id, col.id)
                  if (spanPlan?.covered.has(spanKey)) return null
                  const span = spanPlan?.origin.get(spanKey)
                  let spanWidth: number | undefined
                  if (span && span.colSpan > 1) {
                    spanWidth = 0
                    for (let d = 0; d < span.colSpan && cellIdx + d < cells.length; d++) {
                      const sc = cells[cellIdx + d].column
                      spanWidth += widthOf(sc.id, (sc.getSize?.() as number) ?? 0) ?? 0
                    }
                  }
                  const pinnedLeft = col.getIsPinned?.() === 'start'
                  const pinLeft = pinnedLeft ? (pinLeftById.get(col.id) ?? 0) : 0
                  return (
                    <GridCell
                      key={cell.id}
                      table={table}
                      handle={handle}
                      cell={cell}
                      pinnedLeft={pinnedLeft}
                      pinLeft={pinLeft}
                      fitWidth={fit ? fit.get(col.id) : undefined}
                      colSpan={span?.colSpan}
                      rowSpan={span?.rowSpan}
                      spanWidth={spanWidth}
                      rowFmtClass={rowFmt?.className}
                      rowFmtStyle={rowFmt?.style}
                      onRowResizeStart={handle.enableRowResize ? onRowResizeStart : undefined}
                      onRowResizeReset={handle.enableRowResize ? onRowResizeReset : undefined}
                    />
                  )
                  },
                  'td',
                )
              })()}
                </tr>
                {detailRow}
              </React.Fragment>
            )
          })}
          {rowVirtActive && rowPadBottom > 0 && (
            <tr className="bst-virtual-spacer" aria-hidden="true">
              <td
                colSpan={
                  visibleCount +
                  (handle.enableRowSelection ? 1 : 0) +
                  (handle.enableExpanding ? 1 : 0) +
                  (handle.enableRowPinning ? 1 : 0)
                }
                style={{ height: rowPadBottom, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {bodyRows.length === 0 && (
            <tr>
              <td
                className={cx('bst-table-empty', classNames?.empty)}
                style={styles?.empty}
                colSpan={
                  visibleCount +
                  (handle.enableRowSelection ? 1 : 0) +
                  (handle.enableExpanding ? 1 : 0) +
                  (handle.enableRowPinning ? 1 : 0)
                }
              >
                No rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {overlayNode}
    </div>
    </BstIconsContext.Provider>
  )
}

/** AG23 default loading overlay — a dep-free CSS spinner + label. */
function DefaultLoadingOverlay() {
  return (
    <div className="bst-overlay-box">
      <span className="bst-spinner" aria-hidden="true" />
      <div className="bst-overlay-msg">Loading…</div>
    </div>
  )
}

/** AG23 default error overlay — an inline-SVG warning glyph + the error node. */
function DefaultErrorOverlay({ error }: { error: React.ReactNode }) {
  return (
    <div className="bst-overlay-box">
      <svg className="bst-overlay-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M12 2 22 20H2L12 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17.5" r="1.15" fill="currentColor" />
      </svg>
      <div className="bst-overlay-msg">{error}</div>
    </div>
  )
}

/**
 * Header "select all" checkbox (Phase 3). Reflects v9 row-selection state and
 * shows an indeterminate dash when only some rows are selected.
 */
function SelectAllCheckbox({ table }: { table: any }) {
  const ref = React.useRef<HTMLInputElement>(null)
  const all: boolean = table.getIsAllRowsSelected?.() ?? false
  const some: boolean = table.getIsSomeRowsSelected?.() ?? false
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all
  }, [some, all])
  return (
    <input
      ref={ref}
      type="checkbox"
      className="bst-checkbox"
      checked={all}
      onChange={table.getToggleAllRowsSelectedHandler()}
      aria-label="Select all rows"
    />
  )
}

/**
 * Per-column filter control (Phase 3, "dual filter"). Reads/writes the column's
 * own `columnFilters` entry via `setFilterValue({ op, value })` using the
 * operator-aware `bstCondition` filterFn — so it and the filter-builder panel
 * are two views of the same state. The control shape follows `meta.type`.
 */
function ColumnFilterCell({
  column,
  table,
  handle,
}: {
  column: any
  table?: any
  handle?: BstRuntimeHandle<any>
}) {
  const meta = (column.columnDef.meta ?? {}) as any
  const type = (meta.type ?? 'text') as string
  if (column.getCanFilter?.() === false || type === 'action') return null
  const raw = column.getFilterValue?.() as { op?: string; value?: unknown } | undefined
  const label =
    typeof column.columnDef.header === 'string' && column.columnDef.header
      ? column.columnDef.header
      : column.id

  // Set Filter (AG4): a distinct-values checklist for categorical / opted-in
  // columns (needs `enableSetFilter`). `meta.filter: 'condition'` opts back out.
  const setEligible =
    !!handle?.enableSetFilter &&
    meta.filter !== 'condition' &&
    (meta.filter === 'set' ||
      type === 'singleSelect' ||
      type === 'multiSelect' ||
      type === 'radio' ||
      type === 'boolean')
  if (setEligible && table) {
    return <BstSetFilter column={column} table={table} label={label} />
  }

  const clearOr = (v: unknown, op: string) =>
    v == null || v === '' ? column.setFilterValue(undefined) : column.setFilterValue({ op, value: v })

  if (type === 'singleSelect' || type === 'multiSelect' || type === 'radio') {
    return (
      <select
        className="bst-input bst-colfilter"
        aria-label={`Filter ${label}`}
        value={String(raw?.value ?? '')}
        onChange={(e) => clearOr(e.target.value, 'equals')}
      >
        <option value="">All</option>
        {(meta.options ?? []).map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    )
  }
  if (type === 'boolean') {
    const cur = raw?.op === 'isTrue' ? 'true' : raw?.op === 'isFalse' ? 'false' : ''
    return (
      <select
        className="bst-input bst-colfilter"
        aria-label={`Filter ${label}`}
        value={cur}
        onChange={(e) => {
          const v = e.target.value
          column.setFilterValue(v ? { op: v === 'true' ? 'isTrue' : 'isFalse' } : undefined)
        }}
      >
        <option value="">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }
  const inputType = type === 'number' ? 'number' : type === 'dateTime' ? 'date' : 'text'
  return (
    <input
      className="bst-input bst-colfilter"
      type={inputType}
      aria-label={`Filter ${label}`}
      placeholder="Filter…"
      value={String(raw?.value ?? '')}
      onChange={(e) => clearOr(e.target.value, 'contains')}
    />
  )
}

/**
 * A grouped row (E4) — a collapsible header spanning the group. The grouping
 * column's cell shows a caret + value + count; columns with an `aggregationFn`
 * show their aggregate (formatted by the cell type); the rest are blank
 * placeholders. Leading columns (expander/selection/pin) render empty cells to
 * keep alignment.
 */
function GroupRow({ row, handle }: { row: any; handle: BstRuntimeHandle<any> }) {
  const { registry } = handle
  const I = useBstIcons()
  const depth = (row.depth ?? 0) as number
  const expanded = !!row.getIsExpanded?.()
  return (
    <tr className="bst-group-tr">
      {handle.enableExpanding ? <td className="bst-group-lead" /> : null}
      {handle.enableRowSelection ? <td className="bst-group-lead" /> : null}
      {handle.enableRowPinning ? <td className="bst-group-lead" /> : null}
      {(row.getVisibleCells() as any[]).map((cell: any) => {
        const col = cell.column
        const width = col.getSize?.() as number | undefined
        if (cell.getIsGrouped?.()) {
          const raw = cell.getValue()
          const value = raw == null || raw === '' ? '(blank)' : String(raw)
          const count = (row.subRows?.length ?? 0) as number
          return (
            <td key={cell.id} className="bst-group-cell" style={{ width }}>
              <button
                type="button"
                className="bst-group-toggle"
                onClick={() => row.toggleExpanded()}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse group' : 'Expand group'}
                style={{ paddingLeft: 4 + depth * 14 }}
              >
                <span className="bst-group-caret" aria-hidden="true">
                  {expanded ? <I.expandExpanded size={16} /> : <I.expandCollapsed size={16} />}
                </span>
                <span className="bst-group-value">{value}</span>
                <span className="bst-group-count">{count}</span>
              </button>
            </td>
          )
        }
        if (cell.getIsAggregated?.()) {
          const meta = (col.columnDef.meta ?? {}) as BstColumnMeta
          const ct = registry.get(meta.type)
          const val = cell.getValue()
          const text = ct.format ? ct.format(val, meta) : val == null ? '' : String(val)
          return (
            <td key={cell.id} className="bst-group-agg" style={{ width }}>
              {text}
            </td>
          )
        }
        return <td key={cell.id} className="bst-group-placeholder" style={{ width }} />
      })}
    </tr>
  )
}

interface CellSlice {
  isEditing: boolean
  hasDraft: boolean
  isDirty: boolean
  errors: FieldError[]
  inRowSession: boolean
  pending: boolean
  isActive: boolean
  isSelected: boolean
  /** Runtime per-column edit override — so a cell re-renders when its column is
   *  locked/unlocked in the Columns menu (undefined = use meta.editable). */
  editOverride: boolean | undefined
}

function sliceEqual(a: CellSlice, b: CellSlice): boolean {
  return (
    a.isEditing === b.isEditing &&
    a.hasDraft === b.hasDraft &&
    a.isDirty === b.isDirty &&
    a.errors === b.errors &&
    a.inRowSession === b.inRowSession &&
    a.pending === b.pending &&
    a.isActive === b.isActive &&
    a.isSelected === b.isSelected &&
    a.editOverride === b.editOverride
  )
}

const GridCell = React.memo(function GridCell({
  table,
  handle,
  cell,
  pinnedLeft = false,
  pinLeft = 0,
  fitWidth,
  colSpan = 1,
  rowSpan = 1,
  spanWidth,
  rowFmtClass,
  rowFmtStyle,
  onRowResizeStart,
  onRowResizeReset,
}: {
  table: any
  handle: BstRuntimeHandle<any>
  cell: any
  pinnedLeft?: boolean
  pinLeft?: number
  fitWidth?: number
  colSpan?: number
  rowSpan?: number
  spanWidth?: number
  rowFmtClass?: string
  rowFmtStyle?: React.CSSProperties
  onRowResizeStart?: (rowId: string, e: React.MouseEvent) => void
  onRowResizeReset?: (rowId: string) => void
}) {
  const { runtime, registry } = handle
  const rowId: string = cell.row.id
  const columnId: string = cell.column.id
  const key = cellKey(rowId, columnId)

  const selector = React.useCallback(
    (s: InteractionState): CellSlice => {
      const active = s.activeCell
      const anchor = s.anchorCell
      const isActive = active?.rowId === rowId && active?.columnId === columnId
      // Range membership is materialised here, at paint (§2.4), from the
      // anchor/active ids + the current visual-order maps — no stored cell set.
      let isSelected = false
      if (active && anchor && !isActive) {
        const me = runtime.visualIndexOf(rowId, columnId)
        const a = runtime.visualIndexOf(anchor.rowId, anchor.columnId)
        const b = runtime.visualIndexOf(active.rowId, active.columnId)
        if (me && a && b) {
          const r0 = Math.min(a.r, b.r)
          const r1 = Math.max(a.r, b.r)
          const c0 = Math.min(a.c, b.c)
          const c1 = Math.max(a.c, b.c)
          isSelected = me.r >= r0 && me.r <= r1 && me.c >= c0 && me.c <= c1
        }
      }
      return {
        isEditing:
          s.editingCell?.rowId === rowId && s.editingCell?.columnId === columnId,
        hasDraft: key in s.drafts,
        isDirty: !!s.dirtyCells[key],
        errors: s.cellErrors[key] ?? NO_ERRORS,
        inRowSession: s.rowSession === rowId,
        pending: !!s.pending[key],
        isActive,
        isSelected,
        editOverride: s.columnEdit[columnId],
      }
    },
    [rowId, columnId, key, runtime],
  )
  const slice = useStoreSelector(runtime.store, selector, sliceEqual)

  // Roving-tabindex focus: when this cell becomes the active one (and isn't
  // being edited), pull DOM focus to it so keyboard nav + copy/paste land here.
  const tdRef = React.useRef<HTMLTableCellElement>(null)
  React.useEffect(() => {
    if (!handle.enableCellSelection) return
    if (slice.isActive && !slice.isEditing && !slice.inRowSession) {
      const el = tdRef.current
      if (el && document.activeElement !== el && !el.contains(document.activeElement)) {
        el.focus()
      }
    }
  }, [handle.enableCellSelection, slice.isActive, slice.isEditing, slice.inRowSession])

  const row = cell.row.original
  const meta = runtime.metaOf(columnId)
  const cellType: CellType<any, any, any> = registry.get(meta.type)
  const value = slice.hasDraft
    ? runtime.draftAwareValue(rowId, columnId)
    : cell.getValue()

  const api = runtime.buildCellApi(rowId, columnId, row, {
    // For the action column, "editing" means the row is in a session; for a
    // normal cell it means inline edit. Cover both.
    isEditing: slice.isEditing || slice.inRowSession,
    isDirty: slice.isDirty,
    errors: slice.errors,
  })

  const renderProps: CellRenderProps = {
    value,
    row,
    rowId,
    columnId,
    meta,
    isDirty: slice.isDirty,
    api,
  }

  const editable = runtime.isCellEditable(rowId, columnId)
  const disabled = runtime.isCellDisabled(rowId, columnId)
  const showEditor =
    editable && !!cellType.renderEdit && (slice.isEditing || slice.inRowSession)

  const level = slice.errors.some((e) => e.level === 'error')
    ? 'error'
    : slice.errors.some((e) => e.level === 'warning')
      ? 'warning'
      : undefined

  // Conditional formatting (per-column `meta.cellClassName`/`cellStyle`) + the
  // global `classNames.cell`/`styles.cell` slot. Per-column meta wins on style
  // (more specific); classes just compose.
  const extraClass = meta.cellClassName?.(renderProps)
  const extraStyle = meta.cellStyle?.(renderProps)
  const slotClass = slot(handle.classNames?.cell, renderProps)
  const slotStyle = slot(handle.styles?.cell, renderProps)
  // Conditional formatting (K3) — cell-scope rules for this cell.
  const cellFmt: FormatResult | null = handle.conditionalFormats
    ? evalCellFormat(
        handle.conditionalFormats,
        { value, row, rowId, columnId },
        (c: string) => cell.row.getValue(c),
      )
    : null

  const className =
    'bst-table-td' +
    (editable ? ' bst-editable' : '') +
    (disabled ? ' bst-disabled' : '') +
    (slice.isDirty ? ' bst-dirty' : '') +
    (slice.pending ? ' bst-pending' : '') +
    (slice.isActive ? ' bst-active' : '') +
    (slice.isSelected ? ' bst-selected' : '') +
    (pinnedLeft ? ' bst-pinned-left' : '') +
    (level ? ' bst-' + level : '') +
    (meta.align ? ' bst-align-' + meta.align : '') +
    (colSpan > 1 || rowSpan > 1 ? ' bst-spanned' : '') +
    (slotClass ? ' ' + slotClass : '') +
    (extraClass ? ' ' + extraClass : '') +
    (rowFmtClass ? ' ' + rowFmtClass : '') +
    (cellFmt?.className ? ' ' + cellFmt.className : '')

  // Precedence: active editor → user-authored `cell` → cell-type registry read
  // renderer. (v9 always sets a *default* `cell`, so we can't just null-check it.)
  const content = showEditor ? (
    <CellEditorHost
      runtime={runtime}
      cellType={cellType}
      renderProps={renderProps}
      isRowSession={slice.inRowSession && !slice.isEditing}
    />
  ) : handle.userCellColumns.has(columnId) ? (
    flexRender(cell.column.columnDef.cell, cell.getContext())
  ) : (
    cellType.renderRead(renderProps)
  )

  return (
    <td
      ref={tdRef}
      className={className}
      colSpan={colSpan > 1 ? colSpan : undefined}
      rowSpan={rowSpan > 1 ? rowSpan : undefined}
      style={{
        width: spanWidth ?? fitWidth ?? cell.column.getSize?.(),
        ...(pinnedLeft ? { left: pinLeft } : {}),
        ...slotStyle,
        ...extraStyle,
        ...rowFmtStyle,
        ...cellFmt?.style,
      }}
      title={undefined}
      tabIndex={handle.enableCellSelection ? (slice.isActive ? 0 : -1) : undefined}
      onMouseDown={
        handle.enableCellSelection && !showEditor
          ? (e) => {
              if (e.shiftKey) runtime.extendSelectionTo(rowId, columnId)
              else runtime.setActiveCell(rowId, columnId)
            }
          : undefined
      }
      onDoubleClick={
        editable && !showEditor && cellType.renderEdit
          ? () => runtime.startEditing(rowId, columnId)
          : undefined
      }
      data-dirty={slice.isDirty ? '' : undefined}
      data-active={slice.isActive ? '' : undefined}
      data-error={level === 'error' ? '' : undefined}
    >
      {cellFmt?.hideContent ? null : content}
      {level && slice.errors[0] ? (
        <span className="bst-cell-error-msg" role="alert">
          {slice.errors[0].message}
        </span>
      ) : null}
      {onRowResizeStart ? (
        <span
          className="bst-rowresize-handle"
          aria-hidden="true"
          title="Drag to resize row · double-click to reset"
          onMouseDown={(e) => {
            e.stopPropagation()
            onRowResizeStart(rowId, e)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onRowResizeReset?.(rowId)
          }}
        />
      ) : null}
    </td>
  )
})

/**
 * Hosts an active editor. The live draft lives in LOCAL state so keystrokes
 * never touch the store (Plan.md §2.5 rule 4 & 9). It lands in the store only on
 * commit (cell mode → persist; row-session → defer). Enter / Escape / blur drive
 * the save policy.
 */
function CellEditorHost({
  runtime,
  cellType,
  renderProps,
  isRowSession,
}: {
  runtime: BstRuntime<any>
  cellType: CellType<any, any, any>
  renderProps: CellRenderProps
  isRowSession: boolean
}) {
  const { rowId, columnId } = renderProps
  const [draft, setDraft] = React.useState<unknown>(renderProps.value)
  const doneRef = React.useRef(false)

  const doCommit = (override?: unknown) => {
    const v = override !== undefined ? override : draft
    if (isRowSession) {
      runtime.setDraft(rowId, columnId, v)
    } else {
      if (doneRef.current) return
      doneRef.current = true
      runtime.commitCell(rowId, columnId, v)
    }
  }

  const doCancel = () => {
    if (isRowSession) {
      setDraft(renderProps.value)
    } else {
      doneRef.current = true
      runtime.cancelEditing()
    }
  }

  const editProps: CellEditProps = {
    ...renderProps,
    draft,
    setDraft,
    autoFocus: !isRowSession,
    commit: doCommit,
    cancel: doCancel,
  }

  // A row/batch session always stores the in-progress draft on Enter/blur (the
  // real persist is deferred to Save/commitAll); a plain cell edit auto-persists
  // only on the triggers the consumer opted into via `saveOn`. Previously both
  // triggers were hardcoded, so `saveOn: 'explicit'` could not suppress the blur
  // commit (#4).
  const commitsOn = (trigger: 'enter' | 'blur') =>
    isRowSession || runtime.saveOn.includes(trigger)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !cellType.capturesArrowKeys) {
      if (!commitsOn('enter')) return
      e.preventDefault()
      doCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      doCancel()
    }
  }

  const onBlur = (e: React.FocusEvent) => {
    // Commit only when focus actually leaves this editor wrapper.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    if (!commitsOn('blur')) return
    doCommit()
  }

  // Popup editors (dialogs, portalled outside this cell) manage their own
  // commit/cancel via buttons — wrapping them in blur/Enter-commit would fire a
  // premature commit the moment the dialog takes focus. Render the read preview
  // behind, plus the editor (dialog) unwrapped.
  const isPopup = (renderProps.meta.editMode ?? cellType.editMode) === 'popup'
  if (isPopup) {
    return (
      <>
        {cellType.renderRead(renderProps)}
        {cellType.renderEdit?.(editProps)}
      </>
    )
  }

  // Overlay editors (MUI Select, date pickers) open a portalled menu OUTSIDE
  // this cell. Opening it blurs the trigger — with the default blur-commit that
  // would tear the editor down before the user picks a value. Such editors
  // self-commit (see CellType.overlayEditor), so skip the blur handler; Escape
  // still cancels via onKeyDown.
  const isOverlay = !!cellType.overlayEditor
  return (
    <div
      className="bst-cell-editor"
      onKeyDown={onKeyDown}
      onBlur={isOverlay ? undefined : onBlur}
    >
      {cellType.renderEdit?.(editProps)}
    </div>
  )
}
