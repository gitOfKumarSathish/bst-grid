/**
 * Sticky-header viewport (G3/G4) — the small render-layer companion that caps the
 * scroll box to a bounded height so the body scrolls **inside** the grid under a
 * header (and per-column filter row) that stays pinned, instead of the whole table
 * growing taller as the page size grows. Opt-in per §12 (`enableStickyHeader`), off
 * by default.
 *
 * Row virtualization already does exactly this (its `.bst-virtualized` rules cap the
 * body + stick the header); this is the same viewport **without** row windowing, for
 * the small / medium grids where windowing isn't warranted. So `BstTable` adds the
 * `.bst-sticky-header` class only when virtualization is off — see `BstTable.tsx`.
 *
 * This module holds only the **pure** resolve helper; the class + inline
 * `--bst-max-height` var are applied in `BstTable.tsx`.
 */

/** Tuning for the sticky-header viewport (passed as `enableStickyHeader={{ … }}`). */
export interface BstStickyHeaderOptions {
  /**
   * Max body height as a CSS pixel number (e.g. `440`) or any CSS length string
   * (e.g. `'60vh'`). Wins over `maxRows`. Default: 440px.
   */
  maxHeight?: number | string
  /**
   * Cap the viewport to roughly this many body rows. Converted to a pixel height
   * with a fixed row-height estimate (see {@link STICKY_ROW_PX}), so it is
   * **approximate** across densities — use `maxHeight` when you need an exact box.
   */
  maxRows?: number
}

/** The resolved, always-defined sticky-header config the renderer reads. */
export interface ResolvedStickyHeader {
  /** The viewport is bounded + the header is pinned. */
  enabled: boolean
  /** CSS `max-height` value for the scroll box (e.g. `'440px'`), when enabled. */
  maxHeight?: string
}

/** Default bounded height when neither `maxHeight` nor `maxRows` is given (matches virtualization). */
export const STICKY_DEFAULT_MAX_HEIGHT_PX = 440

/** Row-height estimate (px) used to turn `maxRows` into a pixel height. */
export const STICKY_ROW_PX = 40

/** Header (+ filter row) allowance (px) added on top of `maxRows × STICKY_ROW_PX`. */
export const STICKY_HEADER_PX = 44

/**
 * Fold `enableStickyHeader` (`boolean | BstStickyHeaderOptions`, §12 value shape —
 * an object implies enabled) into one resolved config. `maxHeight` wins over
 * `maxRows`; a number is treated as pixels, a string is passed through verbatim.
 * Pure — unit-tested.
 */
export function resolveStickyHeader(
  enable: boolean | BstStickyHeaderOptions | undefined,
): ResolvedStickyHeader {
  const enabled = enable === true || (typeof enable === 'object' && enable !== null)
  if (!enabled) return { enabled: false }
  const o = typeof enable === 'object' && enable !== null ? enable : {}
  let maxHeight: string
  if (o.maxHeight != null) {
    maxHeight = typeof o.maxHeight === 'number' ? `${o.maxHeight}px` : o.maxHeight
  } else if (o.maxRows != null && o.maxRows > 0) {
    maxHeight = `${STICKY_HEADER_PX + o.maxRows * STICKY_ROW_PX}px`
  } else {
    maxHeight = `${STICKY_DEFAULT_MAX_HEIGHT_PX}px`
  }
  return { enabled: true, maxHeight }
}
