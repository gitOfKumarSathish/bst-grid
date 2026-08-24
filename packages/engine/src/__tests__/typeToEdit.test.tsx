import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

// Type-to-edit (spreadsheet-style entry): on a selected cell, a printable
// keystroke opens the editor seeded with that character (overwriting the value),
// and Enter/Tab commit-and-move. Opt-in via `enableTypeToEdit`; needs editing +
// cell selection. Mirrors the input-side handler in BstTable.tsx.

type Row = { id: string; name: string; age: number | null }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
  { id: '3', name: 'Grace', age: 79 },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } },
]

function Grid(opts: Partial<UseBstTableOptions<Row>>) {
  const [data, setData] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    ...opts,
    data,
    columns,
    getRowId: (r) => r.id,
    onDataChange: setData,
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

/** Type-to-edit needs the opt-in flag AND both prerequisites. */
const ON = { enableCellSelection: true, enableEditing: true, enableTypeToEdit: true } as const

describe('type-to-edit — seeding', () => {
  test('a printable keystroke opens the editor seeded with it, overwriting the value', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 0)) // active = "Ada"
    fireEvent.keyDown(gridTable(), { key: 'H' })
    // Editor opened with the typed char; the old value is gone (overwrite, not append).
    expect(screen.getByDisplayValue('H')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ada')).toBeNull()
  })

  test('a number cell seeds via the cell type parse (digit → number)', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 1)) // active = age 36
    fireEvent.keyDown(gridTable(), { key: '5' })
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
  })

  test('a letter typed into a number cell is declined (NaN), no editor opens', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 1))
    fireEvent.keyDown(gridTable(), { key: 'x' })
    // parse('x') → NaN, so type-to-edit backs off rather than seeding garbage.
    expect(screen.queryByDisplayValue('x')).toBeNull()
    expect(cellAt(0, 1)).not.toHaveClass('bst-editing')
  })
})

describe('type-to-edit — commit-and-move', () => {
  test('Enter commits the typed value and moves the active cell down', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'H' })
    fireEvent.keyDown(screen.getByDisplayValue('H'), { key: 'Enter' })
    expect(data()[0].name).toBe('H') // committed
    expect(cellAt(1, 0)).toHaveClass('bst-active') // moved down
  })

  test('Shift+Enter moves up after commit', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(1, 0)) // second row
    fireEvent.keyDown(gridTable(), { key: 'Q' })
    fireEvent.keyDown(screen.getByDisplayValue('Q'), { key: 'Enter', shiftKey: true })
    expect(data()[1].name).toBe('Q')
    expect(cellAt(0, 0)).toHaveClass('bst-active') // moved up
  })

  test('Tab commits and moves the active cell right', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'Z' })
    fireEvent.keyDown(screen.getByDisplayValue('Z'), { key: 'Tab' })
    expect(data()[0].name).toBe('Z')
    expect(cellAt(0, 1)).toHaveClass('bst-active') // moved right
  })
})

describe('type-to-edit — gating', () => {
  test('no-op when the flag is off (double-click stays the only way in)', () => {
    render(<Grid enableCellSelection enableEditing />) // no enableTypeToEdit
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'H' })
    expect(screen.queryByDisplayValue('H')).toBeNull()
    expect(data()[0].name).toBe('Ada') // unchanged
  })

  test('no-op without editing — there is no editor to open into', () => {
    render(<Grid enableCellSelection enableTypeToEdit />) // no enableEditing
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'H' })
    expect(screen.queryByDisplayValue('H')).toBeNull()
  })

  test('modifier chords are not type-to-edit (Ctrl+A still selects all)', () => {
    render(<Grid {...ON} />)
    fireEvent.mouseDown(cellAt(0, 0))
    fireEvent.keyDown(gridTable(), { key: 'a', ctrlKey: true })
    // Ctrl+A ran select-all instead of seeding an "a"; the far corner is active.
    expect(screen.queryByDisplayValue('a')).toBeNull()
    expect(cellAt(2, 1)).toHaveClass('bst-active')
  })
})
