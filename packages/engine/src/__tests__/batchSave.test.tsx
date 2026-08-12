import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import * as React from 'react'
import { useBstGrid, BstTable } from '../index'
import type { BstRuntime, BstSaveEvent, BstTableColumn } from '../index'

type Person = { id: string; name: string; age: number | null; active: boolean }

const seed: Person[] = [
  { id: '1', name: 'Charlie', age: 30, active: true },
  { id: '2', name: 'Alice', age: 25, active: false },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  {
    id: 'age',
    accessorKey: 'age',
    header: 'Age',
    meta: { type: 'number', editable: true, cellMeta: { required: true } },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean', editable: true } },
]

let rt: BstRuntime<Person>

function Grid(props: {
  onSave?: (e: BstSaveEvent<Person>) => void | Promise<void>
  enableValidation?: boolean
  enableClipboard?: boolean
  enableEditing?: boolean | { mode: 'cell' | 'row' | 'batch' }
  enableBatchEditing?: boolean
}) {
  const [data, setData] = React.useState<Person[]>(seed)
  const { table, runtime } = useBstGrid<Person>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: props.enableEditing ?? { mode: 'batch' },
    enableBatchEditing: props.enableBatchEditing,
    enableValidation: props.enableValidation ?? false,
    enableClipboard: props.enableClipboard ?? false,
    onDataChange: setData,
    onSave: props.onSave,
  })
  rt = runtime
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Person[]
const dataRows = () => screen.getAllByRole('row').slice(1)

function editCell(readText: string, next: string) {
  fireEvent.doubleClick(screen.getByText(readText))
  const input = screen.getByDisplayValue(readText) as HTMLInputElement
  fireEvent.change(input, { target: { value: next } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('batch editing mode — edits defer as unsaved drafts', () => {
  test('Enter keeps the edit as a draft: data untouched, cell shows the draft as dirty', () => {
    render(<Grid />)
    editCell('Charlie', 'Charlotte')
    expect(dataJson()[0].name).toBe('Charlie') // upstream untouched
    const cell = within(dataRows()[0]).getByText('Charlotte') // draft rendered
    expect(cell.closest('[data-dirty]')).not.toBeNull()
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(1)
  })

  test('getChangeSet reports old → new with formatted display strings', () => {
    render(<Grid />)
    editCell('Charlie', 'Charlotte')
    editCell('25', '26')
    const changes = rt.getChangeSet()
    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({
      rowId: '1',
      columnId: 'name',
      field: 'name',
      oldValue: 'Charlie',
      newValue: 'Charlotte',
      oldText: 'Charlie',
      newText: 'Charlotte',
    })
    expect(changes[1]).toMatchObject({ rowId: '2', columnId: 'age', newValue: 26 })
  })

  test('revertCell discards one draft; revertRow discards a row', () => {
    render(<Grid />)
    editCell('Charlie', 'Charlotte')
    editCell('30', '31')
    editCell('25', '26')
    act(() => rt.revertCell('1', 'name'))
    expect(within(dataRows()[0]).getByText('Charlie')).toBeInTheDocument()
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(2)
    act(() => rt.revertRow('1'))
    expect(Object.keys(rt.store.getState().dirtyCells)).toEqual(['2::age'])
  })

  test('paste lands as drafts, not as an immediate write', () => {
    render(<Grid enableClipboard />)
    act(() => rt.setActiveCell('1', 'name'))
    act(() => rt.pasteFromText('Zed'))
    expect(dataJson()[0].name).toBe('Charlie')
    expect(rt.store.getState().drafts['1::name']).toBe('Zed')
  })
})

describe('batched save — ONE onSave call per confirm', () => {
  test('commitAll fires onSave once with flat changes, per-row patches and next data', async () => {
    const onSave = vi.fn<(e: BstSaveEvent<Person>) => void>()
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte')
    editCell('30', '31')
    editCell('25', '26')

    let ok = false
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(true)
    expect(onSave).toHaveBeenCalledTimes(1) // one batch, never per cell/row/column

    const event = onSave.mock.calls[0][0]
    expect(event.changes).toHaveLength(3)
    expect(event.rows).toHaveLength(2)
    const row1 = event.rows.find((r) => r.rowId === '1')!
    expect(row1.patch).toEqual({ name: 'Charlotte', age: 31 })
    expect(row1.original?.name).toBe('Charlie')
    expect(row1.updated?.name).toBe('Charlotte')
    expect(event.next.find((r) => r.id === '2')?.age).toBe(26)

    // Persisted upstream + drafts cleared after the save resolved.
    expect(dataJson()[0].name).toBe('Charlotte')
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(0)
  })

  test('a rejected onSave aborts the save and keeps every draft', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('API down')))
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte')

    let ok = true
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(false)
    expect(dataJson()[0].name).toBe('Charlie') // nothing written
    expect(rt.store.getState().drafts['1::name']).toBe('Charlotte') // draft kept

    // Retry after the API recovers: same batch saves cleanly.
    onSave.mockResolvedValueOnce(undefined as never)
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(true)
    expect(dataJson()[0].name).toBe('Charlotte')
  })

  test('a blocking validation error stops the save before onSave is called', async () => {
    const onSave = vi.fn<(e: BstSaveEvent<Person>) => void>()
    render(<Grid onSave={onSave} enableValidation />)
    editCell('30', '') // Age is required

    let ok = true
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(false)
    expect(onSave).not.toHaveBeenCalled()
    expect(dataJson()[0].age).toBe(30)
  })

  test('without onSave, commitAll still persists the whole batch in one write', async () => {
    render(<Grid />)
    editCell('Charlie', 'Charlotte')
    editCell('25', '26')
    await act(async () => {
      await rt.commitAll()
    })
    expect(dataJson()[0].name).toBe('Charlotte')
    expect(dataJson()[1].age).toBe(26)
  })
})

describe('enableBatchEditing — the runtime mode switch (settings sheet)', () => {
  test('false forces a batch-configured grid back to immediate per-cell commits', () => {
    render(<Grid enableEditing={{ mode: 'batch' }} enableBatchEditing={false} />)
    editCell('Charlie', 'Charlotte')
    expect(dataJson()[0].name).toBe('Charlotte') // wrote straight through
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(0)
  })

  test('true forces a plain editing grid into batch mode (edits defer)', () => {
    render(<Grid enableEditing enableBatchEditing />)
    editCell('Charlie', 'Charlotte')
    expect(dataJson()[0].name).toBe('Charlie') // deferred as a draft
    expect(rt.store.getState().drafts['1::name']).toBe('Charlotte')
  })
})
