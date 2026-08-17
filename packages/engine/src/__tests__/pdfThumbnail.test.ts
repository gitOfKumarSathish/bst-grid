import { describe, test, expect, vi } from 'vitest'
import { createPdfjsThumbnailer } from '../pdfThumbnail'

/**
 * `createPdfjsThumbnailer` renders page 1 of a PDF to a canvas via an injected
 * pdf.js. jsdom has no canvas backend, so we stub the canvas + mock pdf.js and
 * assert the call flow (getDocument → getPage(1) → render → toDataURL), the data:
 * decode path, caching, lazy loading, and graceful failure.
 */
function stubCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: () => ({}), // a truthy 2d context
    toDataURL: () => 'data:image/png;base64,STUB',
  } as unknown as HTMLCanvasElement
}

function mockPdfjs() {
  const render = vi.fn(() => ({ promise: Promise.resolve() }))
  const getViewport = vi.fn(({ scale }: { scale: number }) => ({
    width: 100 * scale,
    height: 140 * scale,
  }))
  const page = { getViewport, render }
  const doc = { getPage: vi.fn(async () => page) }
  const getDocument = vi.fn(() => ({ promise: Promise.resolve(doc) }))
  return { lib: { getDocument }, getDocument, doc, page }
}

describe('createPdfjsThumbnailer', () => {
  test('renders page 1 to a data URL via the injected pdf.js + canvas', async () => {
    const { lib, getDocument, doc, page } = mockPdfjs()
    const thumb = createPdfjsThumbnailer(lib as never, { createCanvas: stubCanvas })
    const out = await thumb('https://x.test/a.pdf', { width: 44, height: 58 })
    expect(out).toBe('data:image/png;base64,STUB')
    expect(getDocument).toHaveBeenCalledWith({ url: 'https://x.test/a.pdf' })
    expect(doc.getPage).toHaveBeenCalledWith(1)
    expect(page.render).toHaveBeenCalled()
  })

  test('a data: URL is decoded to bytes (pdf.js reads them directly, no fetch)', async () => {
    const { lib, getDocument } = mockPdfjs()
    const thumb = createPdfjsThumbnailer(lib as never, { createCanvas: stubCanvas })
    await thumb('data:application/pdf;base64,JVBERi0=', { width: 44, height: 58 })
    const arg = getDocument.mock.calls[0][0] as { data?: unknown; url?: unknown }
    expect(arg.data).toBeInstanceOf(Uint8Array)
    expect(arg.url).toBeUndefined()
  })

  test('caches by url — one getDocument per url', async () => {
    const { lib, getDocument } = mockPdfjs()
    const thumb = createPdfjsThumbnailer(lib as never, { createCanvas: stubCanvas })
    await thumb('u', { width: 10, height: 10 })
    await thumb('u', { width: 10, height: 10 })
    expect(getDocument).toHaveBeenCalledTimes(1)
  })

  test('accepts a lazy loader () => import("pdfjs-dist")', async () => {
    const { lib, getDocument } = mockPdfjs()
    const loader = vi.fn(async () => ({ default: lib }))
    const thumb = createPdfjsThumbnailer(loader as never, { createCanvas: stubCanvas })
    const out = await thumb('u', { width: 10, height: 10 })
    expect(out).toBe('data:image/png;base64,STUB')
    expect(loader).toHaveBeenCalled()
    expect(getDocument).toHaveBeenCalled()
  })

  test('a render failure resolves to null (the cell keeps its icon)', async () => {
    const bad = { getDocument: () => ({ promise: Promise.reject(new Error('boom')) }) }
    const thumb = createPdfjsThumbnailer(bad as never, { createCanvas: stubCanvas })
    expect(await thumb('u', { width: 10, height: 10 })).toBeNull()
  })
})
