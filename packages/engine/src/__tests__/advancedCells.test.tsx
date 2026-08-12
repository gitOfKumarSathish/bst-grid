import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { code128, _CODE128 } from '../cells/barcode'
import { sanitizeHtml, htmlToText, escapeHtml } from '../cells/richtext'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

/* --------------------------------------------------------------- barcode */

// Independent Code128 decoder (uses the shared table only to map patterns→codes).
function decode128(pattern: string): number[] {
  const rev = new Map(_CODE128.PATTERNS.map((p, i) => [p, i] as const))
  const body = pattern.slice(0, pattern.length - 7)
  const codes: number[] = []
  for (let i = 0; i < body.length; i += 6) codes.push(rev.get(body.slice(i, i + 6)) as number)
  codes.push(rev.get(pattern.slice(pattern.length - 7)) as number)
  return codes
}

describe('code128 (barcode)', () => {
  test('anchor patterns match the canonical Code 128 table', () => {
    expect(_CODE128.PATTERNS[0]).toBe('212222')
    expect(_CODE128.PATTERNS[104]).toBe('211214') // Start Code B
    expect(_CODE128.PATTERNS[106]).toBe('2331112') // Stop
  })

  test.each(['A', 'SKU-12345', 'Hello World 99', 'PJJ123C'])(
    'encode→decode round-trips %j with a valid checksum',
    (text) => {
      const { pattern } = code128(text)
      const codes = decode128(pattern)
      expect(codes[0]).toBe(104) // Start B
      expect(codes[codes.length - 1]).toBe(106) // Stop
      // Recompute the checksum and compare with the encoded one.
      const dataCodes = codes.slice(1, codes.length - 2)
      let sum = 104
      dataCodes.forEach((c, i) => (sum += c * (i + 1)))
      expect(codes[codes.length - 2]).toBe(sum % 103)
      // The data codes decode back to the original text.
      expect(dataCodes.map((c) => String.fromCharCode(c + 32)).join('')).toBe(text)
    },
  )

  test('rejects non-printable input', () => {
    expect(() => code128('a\tb')).toThrow(/printable ASCII/)
  })
})

/* ------------------------------------------------------------- rich text */

describe('rich text sanitizer', () => {
  test('drops script/style and all attributes but keeps formatting tags', () => {
    const out = sanitizeHtml('<p>hi <script>alert(1)</script><b onclick="x()">b</b></p><style>x{}</style>')
    expect(out).toBe('<p>hi <b>b</b></p>')
  })
  test('keeps a safe href, unwraps a javascript: link', () => {
    expect(sanitizeHtml('<a href="https://x.io">ok</a>')).toContain('href="https://x.io"')
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('x')
  })
  test('htmlToText strips tags to a single line; escapeHtml escapes', () => {
    expect(htmlToText('<p>a</p><ul><li>b</li><li>c</li></ul>')).toBe('a b c')
    expect(escapeHtml('<x> & "q"')).toBe('&lt;x&gt; &amp; &quot;q&quot;')
  })
})

/* --------------------------------------------------- render in the grid */

type Row = { id: string; url: string; sku: string; note: string }
const seed: Row[] = [{ id: '1', url: 'https://b.io/x', sku: 'SKU-9', note: '<b>bold</b> note' }]
const columns: BstTableColumn<Row>[] = [
  { id: 'url', accessorKey: 'url', header: 'QR', meta: { type: 'qr' } },
  { id: 'sku', accessorKey: 'sku', header: 'Barcode', meta: { type: 'barcode' } },
  { id: 'note', accessorKey: 'note', header: 'Note', meta: { type: 'richText' } },
]
function Grid() {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
  return <BstTable table={table} />
}

describe('qr / barcode / richText cells render', () => {
  test('qr + barcode render <svg>; richText renders a plain-text preview', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('.bst-cell-qr svg')).toBeTruthy()
    expect(container.querySelector('.bst-cell-barcode svg')).toBeTruthy()
    const rt = container.querySelector('.bst-cell-richtext')
    expect(rt?.textContent).toBe('bold note') // tags stripped in the preview
  })
})
