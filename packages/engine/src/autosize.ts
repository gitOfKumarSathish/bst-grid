/**
 * Smart column auto-size (D3) — a dep-free content-measurement helper. Measures
 * text with an **offscreen `canvas.measureText`** (no layout thrash, no DOM
 * insertion) so a column can be sized to fit its widest sampled value. Sampling
 * (header + the current page's cells) and the trigger (double-click the resize
 * handle) live in the renderer; this module is the pure measurement core, also
 * exported so consumers can auto-size programmatically.
 */

let _canvas: HTMLCanvasElement | null = null

function measureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!_canvas) _canvas = document.createElement('canvas')
  return _canvas.getContext('2d')
}

/** Width (px) of `text` in `font` (a CSS `font` shorthand). 0 if unmeasurable. */
export function measureTextWidth(text: string, font: string): number {
  const c = measureCtx()
  if (!c) return 0
  c.font = font
  return c.measureText(text).width
}

/** Options for {@link computeAutoWidth}. */
export interface AutoSizeOptions {
  /** CSS `font` shorthand used for measurement. Default a 14px system UI stack. */
  font?: string
  /** Horizontal padding to add (cell padding + sort/resizer affordance). Default 28. */
  padding?: number
  /** Lower clamp. Default 56. */
  min?: number
  /** Upper clamp. Default 480. */
  max?: number
}

const DEFAULT_FONT = '14px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/**
 * The fitted width for a column: the widest of `texts` measured in the given
 * font, plus padding, clamped to `[min, max]`. Feed it the header label + the
 * current page's formatted cell values (sampling, not the whole dataset).
 */
export function computeAutoWidth(texts: ReadonlyArray<string>, opts: AutoSizeOptions = {}): number {
  const font = opts.font ?? DEFAULT_FONT
  const pad = opts.padding ?? 28
  let widest = 0
  for (const t of texts) {
    const w = measureTextWidth(t, font)
    if (w > widest) widest = w
  }
  const min = opts.min ?? 56
  const max = opts.max ?? 480
  return Math.max(min, Math.min(max, Math.ceil(widest + pad)))
}
