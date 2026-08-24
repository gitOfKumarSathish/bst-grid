import { describe, test, expect } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, getBstRuntime } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; qty: number }
const seed: Row[] = [
  { id: '1', name: 'Bravo', qty: 10 },
  { id: '2', name: 'Alpha', qty: 30 },
  { id: '3', name: 'Charlie', qty: 20 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
]

let captured: any
function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const merged = { data: seed, columns, getRowId: (r: Row) => r.id, enableFind: true, ...props }
  const table = useBstTable<Row>(merged as UseBstTableOptions<Row>)
  captured = table
  return <BstTable table={table} />
}
const find = () => getBstRuntime(captured).runtime

describe('X8 — Find (highlight + jump between matches; never hides rows)', () => {
  test('Ctrl+F opens the find bar; typing highlights matches without removing rows', () => {
    const { container, getByLabelText } = render(<Grid />)
    const rowsBefore = container.querySelectorAll('tbody tr').length
    expect(rowsBefore).toBe(3)

    // ⌘/Ctrl+F on the grid opens the bar (independent of cell selection).
    fireEvent.keyDown(container.querySelector('table')!, { key: 'f', ctrlKey: true })
    const input = getByLabelText('Find in table') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'a' } })

    // 'a' (case-insensitive) hits all three name cells → highlighted in place…
    expect(container.querySelectorAll('.bst-find-hit').length).toBe(3)
    expect(container.querySelectorAll('.bst-find-mark').length).toBeGreaterThan(0)
    // …and exactly ONE current match is styled.
    expect(container.querySelectorAll('.bst-find-current').length).toBe(1)
    // The whole point: NO rows removed (unlike the global filter).
    expect(container.querySelectorAll('tbody tr').length).toBe(rowsBefore)
  })

  test('setFindQuery collects matches in view order; next / prev cycle with wrap', () => {
    render(<Grid />)
    act(() => find().setFindQuery('a'))
    expect(find().store.getState().find.matches.length).toBe(3)
    expect(find().store.getState().find.current).toBe(0)

    act(() => find().findNext())
    expect(find().store.getState().find.current).toBe(1)
    act(() => find().findPrev())
    act(() => find().findPrev())
    // stepped back past the first → wraps to the last
    expect(find().store.getState().find.current).toBe(2)
    // the match set is unchanged — cycling never hides or drops rows
    expect(find().store.getState().find.matches.length).toBe(3)
  })

  test('numeric cells are findable via their formatted text', () => {
    render(<Grid />)
    act(() => find().setFindQuery('30'))
    const s = find().store.getState().find
    expect(s.matches.length).toBe(1)
    expect(s.matches[0]).toMatchObject({ rowId: '2', columnId: 'qty' })
  })

  test('caseSensitive narrows the matches', () => {
    render(<Grid enableFind={{ caseSensitive: true }} />)
    act(() => find().setFindQuery('A'))
    // only the capital "A" in "Alpha"
    expect(find().store.getState().find.matches.length).toBe(1)
    act(() => find().setFindQuery('a'))
    // lowercase a's across Bravo / Alpha / Charlie
    expect(find().store.getState().find.matches.length).toBe(3)
  })

  test('closeFind clears the query, matches and highlights', () => {
    const { container } = render(<Grid />)
    act(() => find().setFindQuery('a'))
    expect(find().store.getState().find.matches.length).toBe(3)
    act(() => find().closeFind())
    const s = find().store.getState().find
    expect(s.open).toBe(false)
    expect(s.query).toBe('')
    expect(s.matches.length).toBe(0)
    expect(container.querySelectorAll('.bst-find-hit').length).toBe(0)
  })
})
