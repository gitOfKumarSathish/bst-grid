import { describe, test, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
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
  const table = useBstTable<Row>({
    data: seed,
    columns,
    getRowId: (r) => r.id,
    renderDetail: (r) => (
      <div data-testid={`detail-${r.id}`}>
        Detail for {r.name}, age {r.age}
      </div>
    ),
    ...props,
  })
  return <BstTable table={table} />
}

describe('master-detail / expandable rows (A4)', () => {
  test('renders a leading expander column with one toggle per row', () => {
    render(<Grid enableExpanding />)
    expect(screen.getAllByRole('button', { name: /expand row/i })).toHaveLength(2)
    expect(screen.queryByTestId('detail-1')).toBeNull() // collapsed until clicked
  })

  test('clicking the expander reveals the detail panel and flips aria-expanded', () => {
    render(<Grid enableExpanding />)
    const adaRow = screen.getByText('Ada').closest('tr') as HTMLElement
    const btn = within(adaRow).getByRole('button', { name: /expand row/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(btn)
    expect(within(adaRow).getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    const detail = screen.getByTestId('detail-1')
    expect(detail).toHaveTextContent('Detail for Ada, age 36')
    // the detail cell spans every column: 2 data + 1 expander = 3
    expect((detail.closest('td') as HTMLElement).getAttribute('colspan')).toBe('3')

    fireEvent.click(within(adaRow).getByRole('button', { name: /collapse row/i }))
    expect(screen.queryByTestId('detail-1')).toBeNull()
  })

  test('getRowCanExpand gates which rows can expand', () => {
    render(<Grid enableExpanding getRowCanExpand={(r) => r.id === '1'} />)
    expect(screen.getAllByRole('button', { name: /expand row/i })).toHaveLength(1)
    const linusRow = screen.getByText('Linus').closest('tr') as HTMLElement
    expect(within(linusRow).queryByRole('button')).toBeNull()
  })

  test('off by default — no expander column, no detail rows', () => {
    render(<Grid />)
    expect(screen.queryByRole('button', { name: /expand row/i })).toBeNull()
    const adaRow = screen.getByText('Ada').closest('tr') as HTMLElement
    expect(within(adaRow).getAllByRole('cell')).toHaveLength(2)
  })
})
