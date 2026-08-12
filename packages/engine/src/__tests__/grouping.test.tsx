import { describe, test, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

type Row = { id: string; dept: string; name: string; salary: number }
const seed: Row[] = [
  { id: '1', dept: 'Eng', name: 'Ada', salary: 100 },
  { id: '2', dept: 'Eng', name: 'Bo', salary: 200 },
  { id: '3', dept: 'Sales', name: 'Cy', salary: 50 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'dept', accessorKey: 'dept', header: 'Dept', meta: { type: 'text' } },
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'salary', accessorKey: 'salary', header: 'Salary', aggregationFn: 'sum', meta: { type: 'number' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    enableGrouping: true,
    initialState: { grouping: ['dept'] },
    ...props,
  })
  return <BstTable table={table} />
}

describe('multi-column grouping (E4)', () => {
  test('renders collapsible group headers with count + aggregate', () => {
    render(<Grid />)
    const engRow = screen.getByText('Eng').closest('tr') as HTMLElement
    expect(engRow).toHaveClass('bst-group-tr')
    expect(engRow.textContent).toContain('2') // 2 rows in Eng
    expect(engRow.textContent).toContain('300') // sum(100, 200)

    const salesRow = screen.getByText('Sales').closest('tr') as HTMLElement
    expect(salesRow.textContent).toContain('1')
    expect(salesRow.textContent).toContain('50')

    // collapsed by default → leaf rows hidden
    expect(screen.queryByText('Ada')).toBeNull()
  })

  test('expanding a group reveals its leaf rows', () => {
    render(<Grid />)
    const engRow = screen.getByText('Eng').closest('tr') as HTMLElement
    fireEvent.click(within(engRow).getByRole('button', { name: /expand group/i }))
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bo')).toBeInTheDocument()
    expect(screen.queryByText('Cy')).toBeNull() // Sales still collapsed
  })

  test('off by default — no group rows', () => {
    const table = () => {
      const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
      return <BstTable table={t} />
    }
    const Plain = table
    render(<Plain />)
    expect(screen.queryByRole('button', { name: /expand group/i })).toBeNull()
    expect(screen.getByText('Ada')).toBeInTheDocument()
  })
})
