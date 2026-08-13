// Regression test for the Tier-4 editing fix (#10, AUDIT_FIXES.md):
// pasteFromText must clear any pre-existing draft on the target cell, exactly as
// commitCell does — otherwise a stale draft keeps shadowing the pasted value and
// the dirty counter sticks forever.
import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string; age: number | null }
const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Bo', age: 40 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  {
    id: 'age',
    accessorKey: 'age',
    header: 'Age',
    meta: { type: 'number', editable: true, cellMeta: { required: true } },
  },
]
function Grid({ onData }: { onData?: (d: Row[]) => void }) {
  const [data, setData] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: true,
    enableValidation: true,
    enableClipboard: true,
    enableCellSelection: true,
    onDataChange: (n) => {
      setData(n)
      onData?.(n)
    },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}
const cellAt = (r: number, c: number) =>
  within(screen.getAllByRole('row')[r + 1]).getAllByRole('cell')[c]
const gridTable = () => screen.getByRole('table')
const dataOf = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]

describe('#10 pasting over a dirty cell clears the stale draft', () => {
  test('a valid paste replaces a held invalid draft and resets dirty', () => {
    render(<Grid />)

    // Create a stale draft: clear the required age and commit → validation holds
    // it as a dirty draft (blockCommitOnError) instead of persisting.
    fireEvent.doubleClick(cellAt(0, 1))
    const input = screen.getByDisplayValue('36') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(document.querySelector('.bst-dirty')).not.toBeNull()

    // Paste a valid value over that same cell.
    fireEvent.mouseDown(cellAt(0, 1))
    fireEvent.paste(gridTable(), { clipboardData: { getData: () => '42' } })

    // Data took the pasted value…
    expect(dataOf()[0].age).toBe(42)
    // …and the stale draft is gone: the cell shows 42 and nothing is dirty.
    expect(within(cellAt(0, 1)).getByText('42')).toBeTruthy()
    expect(document.querySelector('.bst-dirty')).toBeNull()
  })
})
