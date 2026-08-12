import { describe, test, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; age: number }
const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Bo', age: 24 },
  { id: '3', name: 'Cy', age: 50 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

const bodyRows = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('tbody tr.bst-table-tr')) as HTMLElement[]
const pinBtn = (name: string) =>
  within(screen.getByText(name).closest('tr') as HTMLElement).getByRole('button')

describe('row pinning (G1)', () => {
  test('renders a pin column with one toggle per row', () => {
    render(<Grid enableRowPinning />)
    expect(screen.getAllByRole('button', { name: /pin row/i })).toHaveLength(3)
  })

  test('clicking pins a row to the top; it moves up and gets the class', () => {
    const { container } = render(<Grid enableRowPinning />)
    fireEvent.click(pinBtn('Bo'))
    const rows = bodyRows(container)
    expect(rows[0]).toHaveClass('bst-row-pinned-top')
    expect(rows[0].textContent).toContain('Bo')
  })

  test('the toggle cycles top → bottom → unpinned', () => {
    const { container } = render(<Grid enableRowPinning />)
    fireEvent.click(pinBtn('Bo')) // → top
    fireEvent.click(pinBtn('Bo')) // → bottom
    let rows = bodyRows(container)
    expect(rows[rows.length - 1]).toHaveClass('bst-row-pinned-bottom')
    expect(rows[rows.length - 1].textContent).toContain('Bo')

    fireEvent.click(pinBtn('Bo')) // → unpinned
    rows = bodyRows(container)
    expect(rows.some((r) => /bst-row-pinned/.test(r.className))).toBe(false)
  })

  test('a pinned row stays on top across sorting', () => {
    const { container } = render(<Grid enableRowPinning enableSorting />)
    fireEvent.click(pinBtn('Cy')) // pin Cy to top
    fireEvent.click(screen.getByText('Name')) // sort by name (Ada, Bo in center)
    fireEvent.click(screen.getByText('Name')) // reverse sort
    // whatever the center order, Cy is pinned and first
    expect(bodyRows(container)[0].textContent).toContain('Cy')
  })

  test('off by default — no pin column', () => {
    render(<Grid />)
    expect(screen.queryByRole('button', { name: /pin row/i })).toBeNull()
  })
})
