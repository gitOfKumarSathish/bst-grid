import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, BstPdfThumbnailerProvider } from '../index'
import type { BstTableColumn, PdfThumbnailRenderer } from '../index'

/**
 * Files cell — click-to-preview + in-cell thumbnails (B5/I3). A file chip with a
 * `url` opens the preview overlay (images inline, PDFs in the native `<iframe>`
 * viewer). PDF *thumbnails* render via an injected pdf.js renderer to an `<img>`.
 * `cellMeta.preview: false` opts out of preview.
 */
type Doc = { name: string; url?: string; contentType?: string; thumbnailUrl?: string }
type Row = { id: string; docs: Doc[] }

const seed: Row[] = [
  {
    id: '1',
    docs: [
      { name: 'photo.png', url: 'https://x.test/photo.png' },
      { name: 'report.pdf', url: 'https://x.test/report.pdf' },
      { name: 'nolink.txt' }, // no url → not previewable
    ],
  },
]

function renderGrid(
  cellMeta?: Record<string, unknown>,
  rows: Row[] = seed,
  pdfRenderer?: PdfThumbnailRenderer | null,
) {
  const columns: BstTableColumn<Row>[] = [
    { id: 'docs', accessorKey: 'docs', header: 'Docs', meta: { type: 'files', cellMeta } },
  ]
  function G() {
    const t = useBstTable<Row>({ data: rows, columns, getRowId: (r) => r.id })
    return (
      <BstPdfThumbnailerProvider renderer={pdfRenderer ?? null}>
        <div className="bst-table-root">
          <BstTable table={t} />
        </div>
      </BstPdfThumbnailerProvider>
    )
  }
  return render(<G />)
}

const backdrop = () => document.querySelector('.bst-file-preview-backdrop')

describe('files cell — click-to-preview (B5)', () => {
  test('only files with a url are clickable chips', () => {
    renderGrid()
    expect(document.querySelectorAll('.bst-file-clickable').length).toBe(2) // png + pdf, not the txt
  })

  test('clicking an image previews it inline as <img>', () => {
    renderGrid()
    fireEvent.click(screen.getByTitle('Preview photo.png'))
    const img = document.querySelector('.bst-file-preview-img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('https://x.test/photo.png')
    // Escape closes
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(backdrop()).toBeNull()
  })

  test('clicking a PDF previews it in a native <iframe>', () => {
    renderGrid()
    fireEvent.click(screen.getByTitle('Preview report.pdf'))
    const frame = document.querySelector('.bst-file-preview-frame') as HTMLIFrameElement | null
    expect(frame?.tagName).toBe('IFRAME')
    expect(frame!.getAttribute('src')).toBe('https://x.test/report.pdf')
    // clicking the backdrop closes it
    fireEvent.click(backdrop() as Element)
    expect(backdrop()).toBeNull()
  })

  test('cellMeta.preview: false disables click-to-preview', () => {
    renderGrid({ preview: false })
    expect(document.querySelectorAll('.bst-file-clickable').length).toBe(0)
    expect(screen.getByText('report.pdf')).toBeInTheDocument() // name still renders
  })
})

describe('files cell — in-cell PDF thumbnail (B5, pdf.js renderer)', () => {
  // A stand-in for a pdf.js renderer: returns a fake rendered image URL.
  const stubRenderer: PdfThumbnailRenderer = async (url) =>
    'data:image/png;base64,' + btoa('img-of:' + url)

  test('default (no cellMeta): a PDF renders as icon + name, no thumbnail', () => {
    renderGrid(undefined, seed, stubRenderer)
    expect(document.querySelector('.bst-file-thumb-pdf')).toBeNull()
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
  })

  test('pdfThumbnail:true WITHOUT a renderer falls back to the icon (no broken frame)', () => {
    renderGrid({ pdfThumbnail: true }, seed, null)
    expect(document.querySelector('.bst-file-thumb-pdf')).toBeNull()
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
  })

  test('pdfThumbnail:true WITH a provider renders the pdf.js image', async () => {
    const spy = vi.fn(stubRenderer)
    renderGrid({ pdfThumbnail: true }, seed, spy)
    // the box mounts immediately with the icon, then swaps to the rendered <img>
    expect(document.querySelectorAll('.bst-file-thumb-pdf').length).toBe(1) // only report.pdf
    await waitFor(() => {
      const img = document.querySelector('.bst-file-thumb-pdf-img') as HTMLImageElement | null
      expect(img?.getAttribute('src')).toBe(
        'data:image/png;base64,' + btoa('img-of:https://x.test/report.pdf'),
      )
    })
    expect(spy).toHaveBeenCalledWith('https://x.test/report.pdf', { width: 44, height: 58 })
  })

  test('cellMeta.pdfThumbnail can be the renderer function itself (per-column)', async () => {
    const perColumn = vi.fn(stubRenderer)
    renderGrid({ pdfThumbnail: perColumn }, seed, null) // no provider; column brings its own
    await waitFor(() =>
      expect(document.querySelector('.bst-file-thumb-pdf-img')).not.toBeNull(),
    )
    expect(perColumn).toHaveBeenCalled()
  })

  test('the PDF thumbnail chip still opens the full preview on click', () => {
    renderGrid({ pdfThumbnail: true }, seed, stubRenderer)
    fireEvent.click(screen.getByTitle('Preview report.pdf'))
    const frame = document.querySelector('.bst-file-preview-frame') as HTMLIFrameElement | null
    expect(frame?.getAttribute('src')).toBe('https://x.test/report.pdf')
  })

  test('a server thumbnailUrl wins — the PDF renders as a raster <img>, no pdf.js call', () => {
    const spy = vi.fn(stubRenderer)
    renderGrid(
      { pdfThumbnail: true },
      [
        {
          id: '7',
          docs: [
            { name: 'scan.pdf', url: 'https://x.test/scan.pdf', thumbnailUrl: 'https://x.test/scan.png' },
          ],
        },
      ],
      spy,
    )
    const img = document.querySelector('img.bst-file-thumb') as HTMLImageElement | null
    expect(img?.getAttribute('src')).toBe('https://x.test/scan.png')
    expect(document.querySelector('.bst-file-thumb-pdf')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  test('images are unaffected by pdfThumbnail (still an <img> thumbnail)', () => {
    renderGrid({ pdfThumbnail: true }, seed, stubRenderer)
    const img = document.querySelector('img.bst-file-thumb') as HTMLImageElement | null
    expect(img?.getAttribute('src')).toBe('https://x.test/photo.png')
  })

  test('a renderer that returns null keeps the file-type icon', async () => {
    const nullRenderer: PdfThumbnailRenderer = async () => null
    renderGrid({ pdfThumbnail: true }, seed, nullRenderer)
    // the box is present but shows the icon (no <img>)
    await waitFor(() => {
      expect(document.querySelector('.bst-file-thumb-pdf-img')).toBeNull()
      expect(document.querySelector('.bst-file-thumb-pdf-icon')).not.toBeNull()
    })
  })
})

describe('files preview — data: PDF → blob: (Chrome blocks data: PDFs in <iframe>)', () => {
  test('clicking a data: URL PDF serves the preview iframe a blob: src', async () => {
    renderGrid({}, [
      {
        id: 'd',
        docs: [
          { name: 'inline.pdf', url: 'data:application/pdf;base64,JVBERi0xLjQK', contentType: 'application/pdf' },
        ],
      },
    ])
    fireEvent.click(screen.getByTitle('Preview inline.pdf'))
    await waitFor(() => {
      const frame = document.querySelector('.bst-file-preview-frame') as HTMLIFrameElement | null
      expect(frame?.getAttribute('src') ?? '').toMatch(/^blob:/)
    })
  })
})
