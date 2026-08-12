import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstGrid, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string; age: number }

const data: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'age', accessorKey: 'age', header: 'Age' },
]

function Harness({ copyCol, copyRow }: { copyCol?: boolean; copyRow?: boolean }) {
  const { table, runtime } = useBstGrid<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableClipboard: true,
    enableCellSelection: true,
    enableCopyColumn: copyCol,
    enableCopyRow: copyRow,
  })
  const [out, setOut] = React.useState('-')
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <button onClick={async () => setOut('col:' + JSON.stringify(await runtime.copyColumn('name')))}>
        copycol
      </button>
      <button onClick={async () => setOut('row:' + JSON.stringify(await runtime.copyRow('1')))}>
        copyrow
      </button>
      <span data-testid="out">{out}</span>
    </div>
  )
}

describe('copy-column / copy-row sub-toggles', () => {
  test('copyColumn is a no-op (returns "") when enableCopyColumn = false', async () => {
    render(<Harness copyCol={false} />)
    fireEvent.click(screen.getByText('copycol'))
    await screen.findByText('col:""')
    expect(screen.getByTestId('out').textContent).toBe('col:""')
  })

  test('copyRow is a no-op (returns "") when enableCopyRow = false', async () => {
    render(<Harness copyRow={false} />)
    fireEvent.click(screen.getByText('copyrow'))
    await screen.findByText('row:""')
    expect(screen.getByTestId('out').textContent).toBe('row:""')
  })
})
