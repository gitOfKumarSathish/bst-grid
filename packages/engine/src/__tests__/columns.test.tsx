import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, autoGenerateColumns, humanizeKey, inferCellType } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; qty: number; active: boolean; joined: string }
const seed: Row[] = [
  { id: '1', name: 'Bravo', qty: 10, active: true, joined: '2024-01-02' },
  { id: '2', name: 'Alpha', qty: 30, active: false, joined: '2024-03-04' },
  { id: '3', name: 'Charlie', qty: 20, active: true, joined: '2024-02-03' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const merged = { data: seed, columns, getRowId: (r: Row) => r.id, ...props }
  const table = useBstTable<Row>(merged as UseBstTableOptions<Row>)
  return <BstTable table={table} />
}

// ---------------------------------------------------------------- AG27
describe('AG27 — auto-generate columns from data', () => {
  test('humanizeKey turns camel/snake/kebab into Title Case', () => {
    expect(humanizeKey('unitPrice')).toBe('Unit Price')
    expect(humanizeKey('created_at')).toBe('Created At')
    expect(humanizeKey('gross-total')).toBe('Gross Total')
  })

  test('inferCellType guesses number / boolean / date, else undefined', () => {
    expect(inferCellType('qty', 12)).toBe('number')
    expect(inferCellType('active', true)).toBe('boolean')
    expect(inferCellType('joined', '2024-01-02')).toBe('date')
    expect(inferCellType('joined', new Date())).toBe('date')
    expect(inferCellType('name', 'Bravo')).toBeUndefined()
  })

  test('autoGenerateColumns builds one column per key (first-seen order) with a type', () => {
    const cols = autoGenerateColumns(seed)
    expect(cols.map((c) => (c as any).accessorKey)).toEqual([
      'id',
      'name',
      'qty',
      'active',
      'joined',
    ])
    const byId = Object.fromEntries(cols.map((c) => [(c as any).id, c])) as Record<string, any>
    expect(byId.qty.meta.type).toBe('number')
    expect(byId.active.meta.type).toBe('boolean')
    expect(byId.joined.meta.type).toBe('date')
    expect(byId.name.meta).toBeUndefined() // text → untyped
    expect(byId.name.header).toBe('Name')
  })

  test('include (order) + exclude are honoured', () => {
    const cols = autoGenerateColumns(seed, { include: ['qty', 'name'], exclude: ['name'] })
    expect(cols.map((c) => (c as any).id)).toEqual(['qty'])
  })

  test('engine uses generated columns only when none are supplied', () => {
    const { container } = render(<Grid columns={[]} enableAutoColumns />)
    const heads = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)
    expect(heads).toContain('Name')
    expect(heads).toContain('Qty')
    expect(heads).toContain('Active')
  })

  test('explicit columns win — auto-generation is ignored', () => {
    const { container } = render(<Grid enableAutoColumns />)
    const heads = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)
    expect(heads).toEqual(['Name', 'Qty']) // the two explicit columns, nothing inferred
  })
})

// ---------------------------------------------------------------- AG9
describe('AG9 — row-number column', () => {
  test('off by default: no # column', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('.bst-rownum-cell')).toBeNull()
  })

  test('renders a leading # header and 1-based numbers in view order', () => {
    const { container } = render(<Grid enableRowNumbers />)
    const heads = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)
    expect(heads[0]).toBe('#')
    const nums = Array.from(container.querySelectorAll('.bst-rownum-cell')).map((s) => s.textContent)
    expect(nums).toEqual(['1', '2', '3'])
  })

  test('custom header via rowNumberHeader', () => {
    const { container } = render(<Grid enableRowNumbers rowNumberHeader="No." />)
    expect(container.querySelector('thead th')?.textContent).toBe('No.')
  })

  test('numbers follow the sorted order (position, not data index)', () => {
    // sort by name asc → Alpha, Bravo, Charlie
    const { container } = render(
      <Grid enableRowNumbers initialState={{ sorting: [{ id: 'name', desc: false }] }} />,
    )
    const firstRow = container.querySelector('tbody tr.bst-table-tr') as HTMLElement
    expect(firstRow.querySelector('.bst-rownum-cell')?.textContent).toBe('1')
    // the first data cell of row 1 is "Alpha"
    expect(firstRow.textContent).toContain('Alpha')
  })

  test('pins to the start — stays leftmost even when another column is pinned', () => {
    const { container } = render(
      <Grid enableRowNumbers initialState={{ columnPinning: { start: ['name'], end: [] } }} />,
    )
    const heads = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)
    // Without the pin, pinned "Name" would render before the unpinned "#".
    expect(heads[0]).toBe('#')
    expect(heads[1]).toBe('Name')
  })

  test('numbers are continuous across pages (page 2 starts after page 1)', () => {
    const { container } = render(
      <Grid
        enableRowNumbers
        pagination={{ pageSize: 2 }}
        initialState={{ pagination: { pageIndex: 1, pageSize: 2 } }}
      />,
    )
    const nums = Array.from(container.querySelectorAll('.bst-rownum-cell')).map((s) => s.textContent)
    expect(nums).toEqual(['3']) // only the 3rd row on page 2
  })
})

// ---------------------------------------------------------------- AG23
describe('AG23 — loading / error overlays', () => {
  test('loading shows the loading overlay + spinner', () => {
    const { container } = render(<Grid loading />)
    const ov = container.querySelector('.bst-overlay')
    expect(ov).not.toBeNull()
    expect(ov).toHaveClass('bst-overlay-loading')
    expect(container.querySelector('.bst-overlay-spinner')).not.toBeNull()
    expect(ov?.textContent).toContain('Loading')
  })

  test('error shows the error overlay with the message; error wins over loading', () => {
    const { container } = render(<Grid loading error={new Error('Boom')} />)
    const ov = container.querySelector('.bst-overlay')
    expect(ov).toHaveClass('bst-overlay-error')
    expect(ov?.textContent).toContain('Boom')
    expect(container.querySelector('.bst-overlay-spinner')).toBeNull()
  })

  test('string error is rendered verbatim', () => {
    const { container } = render(<Grid error="Nope" />)
    expect(container.querySelector('.bst-overlay-error')?.textContent).toContain('Nope')
  })

  test('no overlay when idle', () => {
    const { container } = render(<Grid />)
    expect(container.querySelector('.bst-overlay')).toBeNull()
  })

  test('enableOverlays={false} suppresses overlays', () => {
    const { container } = render(<Grid loading enableOverlays={false} />)
    expect(container.querySelector('.bst-overlay')).toBeNull()
  })

  test('custom overlay renderers replace the defaults', () => {
    const { container } = render(
      <Grid
        loading
        renderLoadingOverlay={() => <span className="my-load">please wait</span>}
      />,
    )
    expect(container.querySelector('.my-load')?.textContent).toBe('please wait')
    expect(container.querySelector('.bst-overlay-spinner')).toBeNull()
  })
})
