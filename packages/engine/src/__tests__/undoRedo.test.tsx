import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstGrid, BstTable, useStoreSelector } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string }

const seed: Row[] = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Linus' },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'actions', header: '', meta: { type: 'action', actions: { edit: true, delete: true } } },
]

function Grid(opts: Partial<UseBstTableOptions<Row>>) {
  const [data, setData] = React.useState<Row[]>(seed)
  const { table, runtime } = useBstGrid<Row>({
    ...opts,
    data,
    columns,
    getRowId: (r) => r.id,
    onDataChange: setData,
  })
  const canUndo = useStoreSelector(runtime.store, (s) => s.undoDepth > 0)
  const canRedo = useStoreSelector(runtime.store, (s) => s.redoDepth > 0)
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <button data-testid="undo" disabled={!canUndo} onClick={() => runtime.undo()}>
        undo
      </button>
      <button data-testid="redo" disabled={!canRedo} onClick={() => runtime.redo()}>
        redo
      </button>
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataRows = () => screen.getAllByRole('row').slice(1)
const data = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]

function editName(from: string, to: string) {
  fireEvent.doubleClick(within(dataRows()[0]).getByText(from))
  const input = screen.getByDisplayValue(from) as HTMLInputElement
  fireEvent.change(input, { target: { value: to } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('undo / redo (Phase 3, C5)', () => {
  test('undo reverts a committed cell edit; redo re-applies it', () => {
    render(<Grid enableEditing enableUndoRedo />)
    editName('Ada', 'Ada L')
    expect(data()[0].name).toBe('Ada L')
    fireEvent.click(screen.getByTestId('undo'))
    expect(data()[0].name).toBe('Ada')
    fireEvent.click(screen.getByTestId('redo'))
    expect(data()[0].name).toBe('Ada L')
  })

  test('undo reverts a row delete', () => {
    render(<Grid enableEditing enableRowActions enableUndoRedo />)
    fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Delete' }))
    expect(data().map((r) => r.id)).toEqual(['2'])
    fireEvent.click(screen.getByTestId('undo'))
    expect(data().map((r) => r.id)).toEqual(['1', '2'])
  })

  test('a fresh edit clears the redo stack', () => {
    render(<Grid enableEditing enableUndoRedo />)
    editName('Ada', 'X')
    fireEvent.click(screen.getByTestId('undo')) // back to Ada; redo now available
    expect(screen.getByTestId('redo')).not.toBeDisabled()
    editName('Ada', 'Y') // new branch → redo discarded
    expect(screen.getByTestId('redo')).toBeDisabled()
    expect(data()[0].name).toBe('Y')
  })

  test('Ctrl+Z from the grid undoes', () => {
    render(<Grid enableEditing enableUndoRedo />)
    editName('Ada', 'Z')
    expect(data()[0].name).toBe('Z')
    fireEvent.keyDown(screen.getByRole('table'), { key: 'z', ctrlKey: true })
    expect(data()[0].name).toBe('Ada')
  })

  test('no history is recorded when the toggle is off', () => {
    render(<Grid enableEditing />)
    editName('Ada', 'Nope')
    expect(data()[0].name).toBe('Nope')
    expect(screen.getByTestId('undo')).toBeDisabled()
  })
})
