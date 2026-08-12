import { describe, test, expect, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
  renderHook,
  act,
} from '@testing-library/react'
import * as React from 'react'
import { useBstTable, useBstGrid, BstTable } from '../index'
import type { BstTableColumn, FieldError } from '../index'

/**
 * Regression tests for the async-validation bypass of `blockCommitOnError`
 * (the artifact's bug #1). Before the fix, `validateCell` returned `[]` while an
 * async validator was still in flight, so `commitCell` / `pasteFromText` saw no
 * error and persisted the invalid value through `onDataChange` before the promise
 * resolved. The fix awaits async validators on the commit paths (sync validators
 * still commit in the same tick, so nothing else regresses).
 */

type Row = { id: string; name: string }
const seed: Row[] = [
  { id: '1', name: 'Charlie' },
  { id: '2', name: 'Alice' },
]

// Async validator: rejects any value containing "!" one macrotask later. Being a
// Promise is what forces the commit-time await path (sync validators don't hit it).
const asyncName = (value: unknown): Promise<FieldError[]> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          String(value).includes('!')
            ? [{ level: 'error', message: 'No bang', code: 'bang' }]
            : [],
        ),
      0,
    ),
  )

const columns: BstTableColumn<Row>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    meta: { type: 'text', editable: true, validate: asyncName },
  },
]

function Grid(props: { onData?: (d: Row[]) => void }) {
  const [data, setData] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: true,
    enableValidation: true,
    onDataChange: (next) => {
      setData(next)
      props.onData?.(next)
    },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]
const dataRows = () => screen.getAllByRole('row').slice(1)

describe('async validation gates commitCell (blockCommitOnError) — bug #1', () => {
  test('invalid async result blocks the write; value is never persisted', async () => {
    const onData = vi.fn()
    render(<Grid onData={onData} />)
    fireEvent.doubleClick(within(dataRows()[0]).getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Bad!' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Not persisted synchronously — the async validator is still in flight.
    expect(dataJson()[0].name).toBe('Charlie')

    // Once it resolves: the error surfaces AND the value is still not written.
    await waitFor(() => expect(screen.getByText('No bang')).toBeInTheDocument())
    expect(dataJson()[0].name).toBe('Charlie')
    expect(onData).not.toHaveBeenCalled()
  })

  test('valid async result commits after it resolves, then returns to read mode', async () => {
    render(<Grid />)
    fireEvent.doubleClick(within(dataRows()[0]).getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(dataJson()[0].name).toBe('Charlotte'))
    await waitFor(() =>
      expect(within(dataRows()[0]).getByText('Charlotte')).toBeInTheDocument(),
    )
  })

  test('Escape during async validation aborts the commit', async () => {
    const onData = vi.fn()
    render(<Grid onData={onData} />)
    fireEvent.doubleClick(within(dataRows()[0]).getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } }) // would be valid
    fireEvent.keyDown(input, { key: 'Enter' }) // starts async commit; editor stays open
    fireEvent.keyDown(input, { key: 'Escape' }) // cancel before it resolves

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(dataJson()[0].name).toBe('Charlie') // Escape won the race
    expect(onData).not.toHaveBeenCalled()
  })
})

describe('async validation gates pasteFromText (blockCommitOnError) — bug #1', () => {
  function setup(onData: (d: Row[]) => void) {
    return renderHook(() =>
      useBstGrid<Row>({
        data: seed,
        columns,
        getRowId: (r) => r.id,
        enableEditing: true,
        enableValidation: true,
        enableClipboard: true,
        onDataChange: onData,
      }),
    )
  }

  test('pasting an invalid value does not persist it', async () => {
    const onData = vi.fn()
    const { result } = setup(onData)
    act(() => result.current.runtime.setActiveCell('1', 'name'))
    act(() => result.current.runtime.pasteFromText('Bad!'))

    // Nothing written synchronously (validator in flight)…
    expect(onData).not.toHaveBeenCalled()
    // …and still nothing after it resolves — the paste is blocked, not deferred-then-written.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(onData).not.toHaveBeenCalled()
  })

  test('pasting a valid value persists it after the async validator resolves', async () => {
    const onData = vi.fn()
    const { result } = setup(onData)
    act(() => result.current.runtime.setActiveCell('1', 'name'))
    act(() => result.current.runtime.pasteFromText('Good'))

    await waitFor(() => expect(onData).toHaveBeenCalled())
    const written = onData.mock.calls[0][0] as Row[]
    expect(written.find((r) => r.id === '1')?.name).toBe('Good')
  })
})
