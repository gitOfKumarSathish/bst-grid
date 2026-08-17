import * as React from 'react'

/**
 * In-cell PDF thumbnails (B5) via **pdf.js**. Rendering a PDF's first page as a
 * small raster can't be done reliably with the browser's native viewer (Chrome
 * won't paint a PDF in a tiny `<iframe>`), so the crisp path is pdf.js — the tool
 * `CLAUDE.md` §6 always named for this.
 *
 * The engine stays **dependency-free**: it never imports `pdfjs-dist`. Instead the
 * consumer creates a renderer with {@link createPdfjsThumbnailer} (passing their
 * own pdf.js, so *they* own the worker setup their bundler needs) and supplies it
 * through {@link BstPdfThumbnailerProvider} — or per column via
 * `cellMeta.pdfThumbnail`. The `files` cell then renders page 1 to an `<img>`.
 */

/**
 * Turns a PDF `url` into an image URL (a `data:`/`blob:` PNG) sized to fit `size`,
 * or `null` when it can't render (so the cell falls back to the file-type icon).
 */
export type PdfThumbnailRenderer = (
  url: string,
  size: { width: number; height: number },
) => Promise<string | null>

const PdfThumbnailerContext = React.createContext<PdfThumbnailRenderer | null>(null)

/**
 * Provide a grid-wide PDF thumbnail renderer. Wrap your tables (any adapter) in it;
 * columns with `cellMeta.pdfThumbnail: true` then render page-1 thumbnails.
 */
export function BstPdfThumbnailerProvider({
  renderer,
  children,
}: {
  renderer: PdfThumbnailRenderer | null
  children: React.ReactNode
}) {
  return React.createElement(PdfThumbnailerContext.Provider, { value: renderer }, children)
}

/** The renderer from the nearest {@link BstPdfThumbnailerProvider}, or null. */
export function useBstPdfThumbnailer(): PdfThumbnailRenderer | null {
  return React.useContext(PdfThumbnailerContext)
}

/** Decode a `data:` URL to bytes (pdf.js reads bytes directly — no fetch). */
function dataUrlToBytes(url: string): Uint8Array | null {
  try {
    const comma = url.indexOf(',')
    const meta = url.slice(0, comma)
    const payload = url.slice(comma + 1)
    return /;base64/i.test(meta)
      ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(payload))
  } catch {
    return null
  }
}

export interface PdfThumbnailerOptions {
  /** Extra rendering scale on top of fit + devicePixelRatio (crispness). Default 1.5. */
  scale?: number
  /** Cache rendered thumbnails by URL. Default true. */
  cache?: boolean
  /** Canvas factory (test seam). Default `document.createElement('canvas')`. */
  createCanvas?: () => HTMLCanvasElement
}

/** Minimal shape we use from a pdf.js module — loose so any version + the real
 *  `typeof import('pdfjs-dist')` structurally fit (no variance clash). */
type PdfjsLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDocument: (...args: any[]) => { promise: Promise<any> }
}

/**
 * Build a {@link PdfThumbnailRenderer} backed by pdf.js. Pass your imported
 * `pdfjs-dist` **module** (worker already configured) or a **loader**
 * `() => import('pdfjs-dist')` for lazy loading — pdf.js is fetched only when the
 * first thumbnail renders, so it stays out of your initial bundle.
 *
 * ```ts
 * import * as pdfjs from 'pdfjs-dist'
 * import Worker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker' // Vite
 * pdfjs.GlobalWorkerOptions.workerPort = new Worker()
 * const thumbs = createPdfjsThumbnailer(pdfjs)
 * // <BstPdfThumbnailerProvider renderer={thumbs}> … </BstPdfThumbnailerProvider>
 * ```
 */
export function createPdfjsThumbnailer(
  pdfjs: PdfjsLike | (() => Promise<PdfjsLike | { default: PdfjsLike }>),
  opts: PdfThumbnailerOptions = {},
): PdfThumbnailRenderer {
  const cache = new Map<string, Promise<string | null>>()
  const load = async (): Promise<PdfjsLike> => {
    if (typeof pdfjs !== 'function') return pdfjs
    const m = await pdfjs()
    return (m as { default?: PdfjsLike }).default ?? (m as PdfjsLike)
  }
  const makeCanvas = opts.createCanvas ?? (() => document.createElement('canvas'))
  const extra = opts.scale ?? 1.5

  return (url, size) => {
    if (opts.cache !== false) {
      const hit = cache.get(url)
      if (hit) return hit
    }
    const task = (async (): Promise<string | null> => {
      try {
        const lib = await load()
        const src = url.startsWith('data:')
          ? { data: dataUrlToBytes(url) }
          : { url }
        if ((src as { data?: unknown }).data === null) return null
        const doc = await lib.getDocument(src).promise
        const page = await doc.getPage(1)
        const base = page.getViewport({ scale: 1 })
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
        const fit = Math.min(size.width / base.width, size.height / base.height) || 1
        const viewport = page.getViewport({ scale: fit * dpr * extra })
        const canvas = makeCanvas()
        canvas.width = Math.max(1, Math.ceil(viewport.width))
        canvas.height = Math.max(1, Math.ceil(viewport.height))
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        await page.render({ canvasContext: ctx, viewport }).promise
        const out = canvas.toDataURL('image/png')
        return typeof out === 'string' && out.startsWith('data:') ? out : null
      } catch {
        return null // any failure → the cell keeps its file-type icon
      }
    })()
    if (opts.cache !== false) cache.set(url, task)
    return task
  }
}
