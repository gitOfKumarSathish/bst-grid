import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; name: string; age: number }

const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', headerClassName: 'col-name-h' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('custom CSS / className slots (K1/K2)', () => {
  test('static classNames land on their structural slots and compose with the built-ins', () => {
    const { container } = render(
      <Grid
        classNames={{
          root: 'my-root',
          table: 'my-table',
          header: 'my-head',
          headerRow: 'my-hr',
          headerCell: 'my-hc',
          body: 'my-body',
          row: 'my-row',
          cell: 'my-cell',
        }}
      />,
    )
    expect(container.querySelector('.bst-table-scroll')).toHaveClass('my-root')
    const tableEl = container.querySelector('table') as HTMLElement
    expect(tableEl).toHaveClass('my-table')
    expect(tableEl).toHaveClass('bst-table-table') // built-in preserved (compose, not replace)
    expect(container.querySelector('thead')).toHaveClass('my-head')
    expect(container.querySelector('thead tr')).toHaveClass('my-hr')
    container.querySelectorAll('th.bst-table-th').forEach((th) => expect(th).toHaveClass('my-hc'))
    expect(container.querySelector('tbody')).toHaveClass('my-body')
    const bodyRows = container.querySelectorAll('tbody tr')
    expect(bodyRows.length).toBe(2)
    bodyRows.forEach((tr) => expect(tr).toHaveClass('my-row', 'bst-table-tr'))
    container.querySelectorAll('td.bst-table-td').forEach((td) => expect(td).toHaveClass('my-cell'))
  })

  test('function slots receive row / cell / header context; meta.headerClassName composes', () => {
    render(
      <Grid
        classNames={{
          row: ({ row }) => (row.age >= 50 ? 'senior' : 'junior'),
          cell: ({ columnId }) => `col-${columnId}`,
          headerCell: ({ columnId }) => `h-${columnId}`,
        }}
      />,
    )
    expect(screen.getByText('Ada').closest('tr')).toHaveClass('junior')
    expect(screen.getByText('Linus').closest('tr')).toHaveClass('senior')
    expect(screen.getByText('Ada').closest('td')).toHaveClass('col-name')
    expect(screen.getByText('36').closest('td')).toHaveClass('col-age')

    // both the headerCell fn and the per-column meta.headerClassName land on <th>
    const nameTh = screen.getByText('Name').closest('th') as HTMLElement
    expect(nameTh).toHaveClass('h-name')
    expect(nameTh).toHaveClass('col-name-h')
  })

  test('styles slots apply inline styles / CSS variables', () => {
    const { container } = render(
      <Grid
        styles={{
          root: { outline: '2px solid red' },
          row: ({ index }) => ({ ['--row-i' as string]: String(index) }) as React.CSSProperties,
          cell: { color: 'rgb(1, 2, 3)' },
          headerCell: ({ columnId }) => (columnId === 'name' ? { fontWeight: 700 } : undefined),
        }}
      />,
    )
    expect((container.querySelector('.bst-table-scroll') as HTMLElement).style.outline).toBe(
      '2px solid red',
    )
    const firstBodyCell = container.querySelector('tbody td.bst-table-td') as HTMLElement
    expect(firstBodyCell.style.color).toBe('rgb(1, 2, 3)')
    const firstRow = container.querySelector('tbody tr') as HTMLElement
    expect(firstRow.style.getPropertyValue('--row-i')).toBe('0')
    const nameTh = screen.getByText('Name').closest('th') as HTMLElement
    expect(nameTh.style.fontWeight).toBe('700')
  })

  test('the empty-state cell takes the `empty` slot', () => {
    const { container } = render(<Grid data={[]} classNames={{ empty: 'my-empty' }} />)
    expect(container.querySelector('.bst-table-empty')).toHaveClass('my-empty')
  })

  test('per-column meta.cellStyle wins over the global styles.cell slot', () => {
    render(
      <Grid
        columns={[
          {
            id: 'name',
            accessorKey: 'name',
            header: 'Name',
            meta: { type: 'text', cellStyle: () => ({ color: 'rgb(9, 9, 9)' }) },
          },
          { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
        ]}
        styles={{ cell: { color: 'rgb(1, 2, 3)' } }}
      />,
    )
    // name column has a per-column cellStyle → it wins; age uses the global slot.
    expect((screen.getByText('Ada').closest('td') as HTMLElement).style.color).toBe('rgb(9, 9, 9)')
    expect((screen.getByText('36').closest('td') as HTMLElement).style.color).toBe('rgb(1, 2, 3)')
  })
})
