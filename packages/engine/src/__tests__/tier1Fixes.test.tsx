// Regression tests for the Tier-1 fixes from the adoption audit (AUDIT_FIXES.md):
//   #5           — the `text` sort fn is registered (null-containing string columns)
//   #19          — sortable headers toggle on Enter / Space (WCAG 2.1.1)
//   #12/#17/#18  — the grid key handler yields to its own column-filter inputs
//   #4           — `saveOn` actually gates the blur / Enter auto-commit
import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

// Data cell at visual (row, col). Selects body rows by class so it stays correct
// when a column-filter row is present in the header (which adds a <tr>).
const cellAt = (r: number, c: number) =>
  within(document.querySelectorAll('tr.bst-table-tr')[r] as HTMLElement).getAllByRole('cell')[c]

// ─────────────────────────────────────────────────────────────────────────────
// #5 — text sort fn registered
// ─────────────────────────────────────────────────────────────────────────────
describe('#5 the text sort fn is registered', () => {
  type Row = { id: string; name: string | null }
  const seed: Row[] = [
    { id: '1', name: 'Delta' },
    { id: '2', name: null },
    { id: '3', name: 'Alpha' },
    { id: '4', name: null },
    { id: '5', name: 'Charlie' },
    { id: '6', name: null },
  ]
  const cols: BstTableColumn<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  ]
  function SortGrid() {
    const table = useBstTable<Row>({ data: seed, columns: cols, getRowId: (r) => r.id })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }
  const nameColumn = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[0].textContent ?? '')

  test('sorting a string column with nulls orders the non-nulls and groups the nulls', () => {
    render(<SortGrid />)
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    const asc = nameColumn()
    // Non-null values are alphabetically ordered (the bug left them unsorted).
    expect(asc.filter(Boolean)).toEqual(['Alpha', 'Charlie', 'Delta'])
    // The empty (null) cells are contiguous, not scattered through the column.
    const emptyIdx = asc.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
    expect(emptyIdx.length).toBe(3)
    expect(Math.max(...emptyIdx) - Math.min(...emptyIdx)).toBe(emptyIdx.length - 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #19 — keyboard-operable sortable header
// ─────────────────────────────────────────────────────────────────────────────
describe('#19 sortable headers respond to Enter and Space', () => {
  type Row = { id: string; name: string }
  const seed: Row[] = [
    { id: '1', name: 'Bea' },
    { id: '2', name: 'Ada' },
  ]
  const cols: BstTableColumn<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  ]
  function HeaderGrid() {
    const table = useBstTable<Row>({ data: seed, columns: cols, getRowId: (r) => r.id })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  test('Enter then Space cycle the sort direction', () => {
    render(<HeaderGrid />)
    const th = screen.getAllByRole('columnheader')[0]
    const button = screen.getByRole('button', { name: 'Name' })
    expect(th).not.toHaveAttribute('aria-sort')
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(th).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.keyDown(button, { key: ' ' })
    expect(th).toHaveAttribute('aria-sort', 'descending')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #12 / #17 / #18 — the grid handler must not hijack keys from its filter inputs
// ─────────────────────────────────────────────────────────────────────────────
describe('#12/#17/#18 the grid key handler yields to its own filter inputs', () => {
  type Row = { id: string; name: string; age: number }
  const seed: Row[] = [
    { id: '1', name: 'Ada', age: 36 },
    { id: '2', name: 'Linus', age: 54 },
  ]
  const cols: BstTableColumn<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
    { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
  ]
  function TrapGrid() {
    const table = useBstTable<Row>({
      data: seed,
      columns: cols,
      getRowId: (r) => r.id,
      enableCellSelection: true,
      enableColumnFilters: true,
      enableColumnFilterRow: true,
    })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  test('Arrow keys typed in a column-filter input do not move the active cell', () => {
    render(<TrapGrid />)
    fireEvent.mouseDown(cellAt(0, 0))
    expect(cellAt(0, 0)).toHaveClass('bst-active')

    const filter = screen.getByLabelText('Filter Name')
    fireEvent.keyDown(filter, { key: 'ArrowRight' })
    fireEvent.keyDown(filter, { key: 'ArrowDown' })

    // Guard held: the active cell is exactly where it was, not moved by the grid.
    expect(cellAt(0, 0)).toHaveClass('bst-active')
    expect(cellAt(0, 1)).not.toHaveClass('bst-active')
    expect(cellAt(1, 0)).not.toHaveClass('bst-active')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #4 — saveOn gates the auto-commit
// ─────────────────────────────────────────────────────────────────────────────
describe('#4 saveOn gates the blur / Enter commit', () => {
  type Row = { id: string; name: string }
  const seed: Row[] = [
    { id: '1', name: 'Ada' },
    { id: '2', name: 'Bo' },
  ]
  const cols: BstTableColumn<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  ]
  function EditGrid({ saveOn }: { saveOn: Array<'enter' | 'blur'> }) {
    const [data, setData] = React.useState<Row[]>(seed)
    const table = useBstTable<Row>({
      data,
      columns: cols,
      getRowId: (r) => r.id,
      enableEditing: { saveOn },
      onDataChange: setData,
    })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
        <pre data-testid="data">{JSON.stringify(data)}</pre>
      </div>
    )
  }
  const nameOf = (id: string) =>
    (JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]).find((r) => r.id === id)
      ?.name
  const startEdit = (from: string, to: string) => {
    fireEvent.doubleClick(screen.getByText(from))
    const input = screen.getByDisplayValue(from) as HTMLInputElement
    fireEvent.change(input, { target: { value: to } })
    return input
  }

  test("saveOn:['enter'] — blurring the editor does NOT persist", () => {
    render(<EditGrid saveOn={['enter']} />)
    const input = startEdit('Ada', 'Ada!')
    fireEvent.blur(input)
    expect(nameOf('1')).toBe('Ada')
  })

  test("saveOn:['enter'] — Enter still persists", () => {
    render(<EditGrid saveOn={['enter']} />)
    const input = startEdit('Ada', 'AdaE')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(nameOf('1')).toBe('AdaE')
  })

  test("default saveOn (['enter','blur']) — blur persists", () => {
    render(<EditGrid saveOn={['enter', 'blur']} />)
    const input = startEdit('Ada', 'AdaB')
    fireEvent.blur(input)
    expect(nameOf('1')).toBe('AdaB')
  })
})
