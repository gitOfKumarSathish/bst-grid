import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import * as React from 'react'
import { useBstGrid, BstTable } from '../index'
import type { BstRuntime, BstSaveEvent, BstSaveResult, BstTableColumn } from '../index'

type SaveReturn = void | BstSaveResult<Person> | Promise<void | BstSaveResult<Person>>

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
  onSave?: (e: BstSaveEvent<Person>) => SaveReturn
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

describe('I4 — reconciling the server response back into the grid', () => {
  test('onSave returning `applied` adopts the SERVER value, not what was typed', async () => {
    // The server normalises the name to upper-case AND stamps `age` the user never touched.
    const onSave = vi.fn(
      (): BstSaveResult<Person> => ({ applied: [{ rowId: '1', values: { name: 'CHARLOTTE', age: 99 } }] }),
    )
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte') // user typed "Charlotte"

    let ok = false
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(true)
    expect(dataJson()[0].name).toBe('CHARLOTTE') // server's value wins over the typed one
    expect(dataJson()[0].age).toBe(99) // a field the user never edited, applied from the server
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(0) // committed, drafts cleared
  })

  test('a `failed` cell keeps its draft + error; accepted cells commit; commitAll → false', async () => {
    const onSave = vi.fn(
      (): BstSaveResult<Person> => ({ failed: [{ rowId: '1', columnId: 'name', error: 'Name already taken' }] }),
    )
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte') // row 1 name — will be rejected
    editCell('25', '26') // row 2 age — will be accepted

    let ok = true
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(false) // not fully saved
    // rejected cell: draft kept, upstream untouched, error surfaced (validation-error UI)
    expect(dataJson()[0].name).toBe('Charlie')
    expect(rt.store.getState().drafts['1::name']).toBe('Charlotte')
    expect(rt.store.getState().cellErrors['1::name']?.[0]?.message).toBe('Name already taken')
    // accepted cell: committed, draft cleared
    expect(dataJson()[1].age).toBe(26)
    expect(rt.store.getState().drafts['2::age']).toBeUndefined()
  })

  test('a row-level `failed` (no columnId) keeps + flags every edited cell in that row', async () => {
    const onSave = (): BstSaveResult<Person> => ({ failed: [{ rowId: '1', error: 'Row rejected by server' }] })
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte') // row 1 name
    editCell('30', '31') // row 1 age

    let ok = true
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(false)
    expect(dataJson()[0].name).toBe('Charlie') // both kept
    expect(rt.store.getState().drafts['1::name']).toBe('Charlotte')
    expect(rt.store.getState().drafts['1::age']).toBe(31)
    expect(rt.store.getState().cellErrors['1::name']?.[0]?.message).toBe('Row rejected by server')
    expect(rt.store.getState().cellErrors['1::age']?.[0]?.message).toBe('Row rejected by server')
  })

  test('applied + failed together: server values land while failures stay as drafts', async () => {
    const onSave = (): BstSaveResult<Person> => ({
      applied: [{ rowId: '2', values: { age: 26 } }],
      failed: [{ rowId: '1', columnId: 'name', error: 'taken' }],
    })
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte') // fails
    editCell('25', '26') // applied

    let ok = true
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(false)
    expect(dataJson()[1].age).toBe(26) // applied from the server
    expect(rt.store.getState().drafts['1::name']).toBe('Charlotte') // failed → draft kept
    expect(rt.store.getState().drafts['2::age']).toBeUndefined() // applied → draft cleared
  })

  test('returning nothing is unchanged: every draft commits with the typed value', async () => {
    const onSave = vi.fn<() => void>() // resolves with undefined
    render(<Grid onSave={onSave} />)
    editCell('Charlie', 'Charlotte')

    let ok = false
    await act(async () => {
      ok = await rt.commitAll()
    })
    expect(ok).toBe(true)
    expect(dataJson()[0].name).toBe('Charlotte') // typed value committed (backward-compatible)
    expect(Object.keys(rt.store.getState().dirtyCells)).toHaveLength(0)
  })
})
