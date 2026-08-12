import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; age: number }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
  { id: '3', name: 'Grace', age: 79 },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

function Grid(opts: Partial<UseBstTableOptions<Row>>) {
  const [rows] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({ ...opts, data: rows, columns, getRowId: (r) => r.id })
  const selected = table.getSelectedRowModel().rows.map((r) => r.id)
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="sel">{JSON.stringify(selected)}</pre>
    </div>
  )
}

const dataRows = () => screen.getAllByRole('row').slice(1)
const rowBoxes = () => screen.getAllByRole('checkbox', { name: 'Select row' })
const allBox = () => screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement
const selected = () => JSON.parse(screen.getByTestId('sel').textContent || '[]') as string[]

describe('row selection (Phase 3)', () => {
  test('renders a checkbox column only when enabled', () => {
    const { unmount } = render(<Grid />)
    expect(screen.queryByRole('checkbox', { name: 'Select all rows' })).toBeNull()
    expect(screen.queryAllByRole('checkbox', { name: 'Select row' })).toHaveLength(0)
    unmount()
    render(<Grid enableRowSelection />)
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument()
    expect(rowBoxes()).toHaveLength(3)
  })

  test('clicking a row checkbox selects that row (by rowId) and highlights it', () => {
    render(<Grid enableRowSelection />)
    fireEvent.click(rowBoxes()[1]) // Linus
    expect(selected()).toEqual(['2'])
    expect(dataRows()[1]).toHaveClass('bst-row-selected')
    expect(dataRows()[0]).not.toHaveClass('bst-row-selected')
  })

  test('header "select all" toggles every row', () => {
    render(<Grid enableRowSelection />)
    fireEvent.click(allBox())
    expect(selected().sort()).toEqual(['1', '2', '3'])
    dataRows().forEach((r) => expect(r).toHaveClass('bst-row-selected'))
    fireEvent.click(allBox()) // toggle off
    expect(selected()).toEqual([])
  })

  test('header checkbox is indeterminate on a partial selection', () => {
    render(<Grid enableRowSelection />)
    fireEvent.click(rowBoxes()[0])
    expect(allBox().indeterminate).toBe(true)
    expect(allBox().checked).toBe(false)
  })

  test('selection is independent of cell editing (no editable columns needed)', () => {
    render(<Grid enableRowSelection />)
    const cell = within(dataRows()[0]).getAllByRole('cell')
    // cell[0] is the checkbox cell; the data cells follow
    expect(cell.length).toBe(3) // checkbox + name + age
    fireEvent.click(rowBoxes()[0])
    expect(selected()).toEqual(['1'])
  })
})
