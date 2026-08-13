import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

/**
 * Files cell — click-to-preview (B5/I3). A file chip with a `url` opens the
 * dependency-free preview overlay: images inline (`<img>`), PDFs in the browser's
 * native viewer (`<iframe>`). `cellMeta.preview: false` opts out.
 */
type Doc = { name: string; url?: string; contentType?: string }
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

function renderGrid(cellMeta?: Record<string, unknown>) {
  const columns: BstTableColumn<Row>[] = [
    { id: 'docs', accessorKey: 'docs', header: 'Docs', meta: { type: 'files', cellMeta } },
  ]
  function G() {
    const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
    return (
      <div className="bst-table-root">
        <BstTable table={t} />
      </div>
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
