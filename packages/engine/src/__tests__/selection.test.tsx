import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, useBstGrid, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; age: number | null; city: string }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36, city: 'London' },
  { id: '2', name: 'Linus', age: 54, city: 'Portland' },
  { id: '3', name: 'Grace', age: 79, city: 'NYC' },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } },
  // Read-only on purpose — paste must skip it.
  { id: 'city', accessorKey: 'city', header: 'City', meta: { type: 'text', editable: false } },
]

function Grid({
  onData,
  ...opts
}: { onData?: (d: Row[]) => void } & Partial<UseBstTableOptions<Row>>) {
  const [data, setData] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    ...opts,
    data,
    columns,
    getRowId: (r) => r.id,
    onDataChange: (next) => {
      setData(next)
      onData?.(next)
    },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

/** Cell at visual (row, col) — row 0 is the first data row (header skipped). */
const cellAt = (r: number, c: number) =>
  within(screen.getAllByRole('row')[r + 1]).getAllByRole('cell')[c]
const gridTable = () => screen.getByRole('table')
const data = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]

describe('cell selection (Phase 3)', () => {
  test('click sets the active cell', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveClass('bst-active')
  })

  test('shift-click selects the rectangle between anchor and focus', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.mouseDown(cellAt(1, 1), { shiftKey: true })
    expect(cellAt(1, 1)).toHaveClass('bst-active')
    // the other three corners of the 2×2 rectangle are in the range
    expect(cellAt(0, 0)).toHaveClass('bst-selected')
    expect(cellAt(0, 1)).toHaveClass('bst-selected')
    expect(cellAt(1, 0)).toHaveClass('bst-selected')
  })

  test('nothing is selectable when the toggle is off', () => {
    render(<Grid />)
    fireEvent.mouseDown(cellAt(0, 0))
    expect(cellAt(0, 0)).not.toHaveClass('bst-active')
  })
})

describe('keyboard navigation (Phase 3)', () => {
  test('Arrow keys move the active cell', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'ArrowDown' })
    expect(cellAt(1, 0)).toHaveClass('bst-active')
    expect(cellAt(0, 0)).not.toHaveClass('bst-active')
    fireEvent.keyDown(gridTable(), { key: 'ArrowRight' })
    expect(cellAt(1, 1)).toHaveClass('bst-active')
  })

  test('Shift+Arrow grows the range from the anchor', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'ArrowRight', shiftKey: true })
    expect(cellAt(0, 1)).toHaveClass('bst-active')
    expect(cellAt(0, 0)).toHaveClass('bst-selected')
  })

  test('Tab wraps to the first column of the next row', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 2)) // last column, first row
    fireEvent.keyDown(gridTable(), { key: 'Tab' })
    expect(cellAt(1, 0)).toHaveClass('bst-active')
  })

  test('Ctrl+A selects the whole grid; Escape clears it', () => {
    render(<Grid enableCellSelection />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'a', ctrlKey: true })
    expect(cellAt(2, 2)).toHaveClass('bst-active') // focus jumps to the far corner
    expect(cellAt(0, 0)).toHaveClass('bst-selected')
    fireEvent.keyDown(gridTable(), { key: 'Escape' })
    expect(document.querySelector('.bst-active')).toBeNull()
  })
})

describe('clipboard (Phase 3, H1–H4)', () => {
  test('copy emits TSV of the selected range', () => {
    render(<Grid enableCellSelection enableClipboard />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.mouseDown(cellAt(1, 1), { shiftKey: true })
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(gridTable(), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Ada\t36\nLinus\t54')
  })

  test('copy of a single active cell', () => {
    render(<Grid enableCellSelection enableClipboard />)
    fireEvent.mouseDown(cellAt(1, 0))
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(gridTable(), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Linus')
  })

  test('paste writes TSV from the active cell, across editable columns', () => {
    render(<Grid enableClipboard enableEditing />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.paste(gridTable(), { clipboardData: { getData: () => 'Zed\t99' } })
    expect(data()[0].name).toBe('Zed')
    expect(data()[0].age).toBe(99)
  })

  test('paste skips read-only columns', () => {
    render(<Grid enableClipboard enableEditing />)
    fireEvent.mouseDown(cellAt(0, 2)) // city — editable: false
    fireEvent.paste(gridTable(), { clipboardData: { getData: () => 'Tokyo' } })
    expect(data()[0].city).toBe('London')
  })
})

// H3 copy-column (and H2 copy-row) must span EVERY page, not just the on-screen
// one — the whole point of "copy column". A plain range copy stays page-local.
describe('copy column / row across pages (H3 / H2)', () => {
  function ColGrid({
    runtimeRef,
    ...opts
  }: { runtimeRef: { current: any } } & Partial<UseBstTableOptions<Row>>) {
    const [d, setD] = React.useState<Row[]>(seed)
    const { table, runtime } = useBstGrid<Row>({
      ...opts,
      data: d,
      columns,
      getRowId: (r) => r.id,
      onDataChange: setD,
    })
    runtimeRef.current = runtime
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  test('getColumnClipboardText spans ALL pages, not just the visible one', () => {
    const rt = { current: null as any }
    render(<ColGrid runtimeRef={rt} enableClipboard pagination={{ pageSize: 2 }} />)
    // page 1 shows only Ada + Linus…
    expect(screen.getAllByRole('row')).toHaveLength(1 + 2)
    // …but copy-column grabs Grace (page 2) too.
    expect(rt.current.getColumnClipboardText('name')).toBe('Ada\nLinus\nGrace')
  })

  test('Ctrl+Space selects the column so Ctrl+C copies every page', () => {
    const rt = { current: null as any }
    render(<ColGrid runtimeRef={rt} enableClipboard pagination={{ pageSize: 2 }} />)
    fireEvent.mouseDown(cellAt(0, 1)) // an Age cell
    fireEvent.keyDown(gridTable(), { key: ' ', ctrlKey: true })
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(gridTable(), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', '36\n54\n79')
  })

  test('Shift+Space selects the row → copy emits the whole row', () => {
    const rt = { current: null as any }
    render(<ColGrid runtimeRef={rt} enableClipboard />)
    fireEvent.mouseDown(cellAt(1, 0)) // Linus row
    fireEvent.keyDown(gridTable(), { key: ' ', shiftKey: true })
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(gridTable(), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Linus\t54\tPortland')
  })

  test('a plain range still copies only the visible selection (page-local)', () => {
    const rt = { current: null as any }
    render(<ColGrid runtimeRef={rt} enableClipboard pagination={{ pageSize: 2 }} />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.mouseDown(cellAt(1, 0), { shiftKey: true })
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(gridTable(), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Ada\nLinus')
  })
})
