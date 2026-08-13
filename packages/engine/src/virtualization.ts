/**
 * Virtualization (D1) — the render-layer companion that lets the grid paint only
 * the rows (and, optionally, columns) inside the scroll viewport, so a 10k / 1M
 * row dataset stays at 60fps with a bounded DOM. Built on `@tanstack/react-virtual`
 * (MIT). This module holds only the **pure** resolve + compatibility helpers; the
 * `useVirtualizer` wiring lives in `BstTable.tsx` (it needs the live table + refs).
 *
 * Opt-in per §12 (`enableVirtualization`), off by default: it retrofits into a
 * grid whose other features assume the whole row model is in the DOM, so a handful
 * of structurally-incompatible features (below) make it yield rather than corrupt
 * the layout — see {@link virtualizationBypassReason}.
 */

/** Tuning for the virtualizer (passed as `enableVirtualization={{ … }}`). */
export interface VirtualizationOptions {
  /** Rows/columns rendered beyond each edge of the viewport (smoother scroll, more DOM). Default 8. */
  overscan?: number
  /** Estimated row height in px before a row is measured. Keep close to the real height. Default 36. */
  estimateRowSize?: number
  /** Estimated column width in px for column virtualization (real widths are used once known). Default 150. */
  estimateColumnSize?: number
}

/** The resolved, always-defined virtualization config the renderer reads. */
export interface ResolvedVirtualization {
  /** Row virtualization requested. */
  enabled: boolean
  /** Column virtualization requested (only meaningful when `enabled`). */
  columns: boolean
  overscan: number
  estimateRowSize: number
  estimateColumnSize: number
}

const DEFAULTS = { overscan: 8, estimateRowSize: 36, estimateColumnSize: 150 } as const

/**
 * Fold `enableVirtualization` (`boolean | VirtualizationOptions`, §12 value shape —
 * an object implies enabled) plus the `enableColumnVirtualization` sub-toggle into
 * one resolved config. Pure — unit-tested.
 */
export function resolveVirtualization(
  enable: boolean | VirtualizationOptions | undefined,
  enableColumns: boolean | undefined,
): ResolvedVirtualization {
  const enabled = enable === true || (typeof enable === 'object' && enable !== null)
  const o = typeof enable === 'object' && enable !== null ? enable : {}
  return {
    enabled,
    columns: enabled && !!enableColumns,
    overscan: o.overscan ?? DEFAULTS.overscan,
    estimateRowSize: o.estimateRowSize ?? DEFAULTS.estimateRowSize,
    estimateColumnSize: o.estimateColumnSize ?? DEFAULTS.estimateColumnSize,
  }
}

/**
 * Features whose DOM shape a windowed body can't represent faithfully in v1 —
 * multi-`<tr>` items (master-detail, grouping) or spans/pins that must know rows
 * outside the window (cell spanning, row pinning). When any is active alongside
 * virtualization, the renderer falls back to the un-windowed path so the layout
 * stays correct (these target small, curated datasets — not the large flat data
 * virtualization is for). Keyed so callers can log *which* one caused the bypass.
 */
export interface VirtualizationCompat {
  enableExpanding?: boolean
  enableGrouping?: boolean
  enableCellSpanning?: boolean
  enableRowPinning?: boolean
}

const BYPASS_ORDER: Array<[keyof VirtualizationCompat, string]> = [
  ['enableExpanding', 'master-detail (enableExpanding)'],
  ['enableGrouping', 'grouping (enableGrouping)'],
  ['enableCellSpanning', 'cell spanning (enableCellSpanning)'],
  ['enableRowPinning', 'row pinning (enableRowPinning)'],
]

/**
 * The first active incompatible feature's label, or `null` when virtualization
 * can run. Pure — unit-tested; the renderer uses it to decide the windowed vs
 * un-windowed path and to emit a one-time dev-console warning.
 */
export function virtualizationBypassReason(compat: VirtualizationCompat): string | null {
  for (const [key, label] of BYPASS_ORDER) {
    if (compat[key]) return label
  }
  return null
}
