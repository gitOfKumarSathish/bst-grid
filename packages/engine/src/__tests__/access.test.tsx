import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, useBstGrid, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; score: number | null; status: string; locked: boolean }

const seed: Row[] = [
  { id: '1', name: 'Ada', score: 10, status: 'active', locked: false },
  { id: '2', name: 'Linus', score: 20, status: 'archived', locked: true },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  // editable: true AND disabled: true — disabled must win (F3, whole column).
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    meta: { type: 'number', editable: true, disabled: true },
  },
  // per-row disable (F4) — only the locked row's status cell is disabled.
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    meta: { type: 'text', editable: true, disabled: (r: Row) => r.locked },
  },
  { id: 'actions', header: '', meta: { type: 'action', actions: { edit: true, delete: true } } },
]

function Grid({
  onData,
  ...opts
}: { onData?: (d: Row[]) => void } & Partial<UseBstTableOptions<Row>>) {
  const [rows, setRows] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    enableEditing: true,
    enableRowActions: true,
    ...opts,
    data: rows,
    columns,
    getRowId: (r) => r.id,
    onDataChange: (next) => {
      setRows(next)
      onData?.(next)
    },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(rows)}</pre>
    </div>
  )
}

const dataRows = () => screen.getAllByRole('row').slice(1)
const cell = (r: number, c: number) => within(dataRows()[r]).getAllByRole('cell')[c]

describe('access control — disable cascade (F1–F4)', () => {
  test('F3: a disabled column greys its cells and blocks editing (over editable:true)', () => {
    render(<Grid />)
    expect(cell(0, 1)).toHaveClass('bst-disabled') // score, row 0
    fireEvent.doubleClick(cell(0, 1))
    expect(screen.queryByDisplayValue('10')).toBeNull() // no editor opened
  })

  test('F4: per-row predicate disables only the matching cells', () => {
    render(<Grid />)
    expect(cell(0, 2)).not.toHaveClass('bst-disabled') // Ada (unlocked) status editable
    expect(cell(1, 2)).toHaveClass('bst-disabled') // Linus (locked) status disabled
    fireEvent.doubleClick(cell(1, 2))
    expect(screen.queryByDisplayValue('archived')).toBeNull()
  })

  test('F4: grid-level cellDisabled predicate', () => {
    render(<Grid cellDisabled={({ columnId, row }) => columnId === 'name' && row.id === '1'} />)
    expect(cell(0, 0)).toHaveClass('bst-disabled') // Ada name disabled
    expect(cell(1, 0)).not.toHaveClass('bst-disabled') // Linus name still editable
  })

  test('F1: grid disable cascades to every cell', () => {
    render(<Grid disabled />)
    expect(cell(0, 0)).toHaveClass('bst-disabled')
    fireEvent.doubleClick(cell(0, 0))
    expect(screen.queryByDisplayValue('Ada')).toBeNull()
  })

  test('F2: row disable cascades to that row only', () => {
    render(<Grid rowDisabled={(r) => r.id === '2'} />)
    expect(cell(1, 0)).toHaveClass('bst-disabled') // Linus name disabled
    expect(cell(0, 0)).not.toHaveClass('bst-disabled') // Ada name editable
  })

  test('action buttons follow the cascade (disabled on a disabled row)', () => {
    render(<Grid rowDisabled={(r) => r.id === '2'} />)
    expect(within(dataRows()[1]).getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(within(dataRows()[1]).getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(within(dataRows()[0]).getByRole('button', { name: 'Edit' })).not.toBeDisabled()
  })

  test('a disabled cell is still selectable + copyable (disable blocks editing, not selection)', () => {
    render(<Grid enableCellSelection enableClipboard />)
    fireEvent.mouseDown(cell(0, 1)) // the disabled score cell
    expect(cell(0, 1)).toHaveClass('bst-active')
    const clipboardData = { setData: vi.fn(), getData: () => '' }
    fireEvent.copy(screen.getByRole('table'), { clipboardData })
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', '10')
  })
})

// Runtime per-column editability override — the Columns-menu lock/unlock. Distinct
// from static `meta.editable` / `meta.disabled`: an end-user toggles it at runtime.
describe('runtime per-column edit lock (setColumnEditable)', () => {
  function EditGrid({ runtimeRef }: { runtimeRef: { current: any } }) {
    const [rows, setRows] = React.useState<Row[]>(seed)
    const { table, runtime } = useBstGrid<Row>({
      data: rows,
      columns,
      getRowId: (r) => r.id,
      enableEditing: true,
      onDataChange: setRows,
    })
    runtimeRef.current = runtime
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  test('locking a column makes its cells non-editable (double-click opens no editor)', () => {
    const rt = { current: null as any }
    render(<EditGrid runtimeRef={rt} />)
    // Name is editable by default → double-click opens an input.
    fireEvent.doubleClick(cell(0, 0))
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByDisplayValue('Ada'), { key: 'Escape' })

    // Lock the whole Name column at runtime.
    act(() => rt.current.setColumnEditable('name', false))
    expect(rt.current.isCellEditable('1', 'name')).toBe(false)
    // Now a double-click no longer opens an editor.
    fireEvent.doubleClick(cell(0, 0))
    expect(screen.queryByDisplayValue('Ada')).toBeNull()

    // Unlock → editable again.
    act(() => rt.current.setColumnEditable('name', true))
    expect(rt.current.isCellEditable('1', 'name')).toBe(true)
    fireEvent.doubleClick(cell(0, 0))
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument()
  })

  test('getColumnEditable reflects the override, else meta.editable', () => {
    const rt = { current: null as any }
    render(<EditGrid runtimeRef={rt} />)
    expect(rt.current.getColumnEditable('name')).toBe(true) // meta.editable: true
    act(() => rt.current.setColumnEditable('name', false))
    expect(rt.current.getColumnEditable('name')).toBe(false)
  })
})
