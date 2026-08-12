import { describe, test, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; age: number }
const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]
function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('row resizing (G2)', () => {
  test('renders resize handles only when enableRowResize is on', () => {
    const off = render(<Grid />)
    expect(off.container.querySelectorAll('.bst-rowresize-handle').length).toBe(0)
    off.unmount()
    const on = render(<Grid enableRowResize />)
    // one handle per data cell (2 rows × 2 cols)
    expect(on.container.querySelectorAll('.bst-rowresize-handle').length).toBe(4)
  })

  test('dragging a handle sets the row height; double-click resets it', () => {
    const { container } = render(<Grid enableRowResize />)
    const firstRow = container.querySelector('.bst-table-tr') as HTMLElement
    const handle = firstRow.querySelector('.bst-rowresize-handle') as HTMLElement

    fireEvent.mouseDown(handle, { clientY: 100 })
    fireEvent.mouseMove(document, { clientY: 148 }) // +48px (jsdom start height = 0)
    fireEvent.mouseUp(document)

    expect(firstRow).toHaveClass('bst-row-resized')
    expect(firstRow.style.height).toBe('48px')

    fireEvent.doubleClick(handle)
    expect(firstRow).not.toHaveClass('bst-row-resized')
    expect(firstRow.style.height).toBe('')
  })

  test('drag is clamped to a 24px minimum', () => {
    const { container } = render(<Grid enableRowResize />)
    const firstRow = container.querySelector('.bst-table-tr') as HTMLElement
    const handle = firstRow.querySelector('.bst-rowresize-handle') as HTMLElement
    fireEvent.mouseDown(handle, { clientY: 100 })
    fireEvent.mouseMove(document, { clientY: 90 }) // -10 → below min
    fireEvent.mouseUp(document)
    expect(firstRow.style.height).toBe('24px')
  })
})
